package testharness

import (
	"fmt"
	"time"
)

// Anomaly represents a controlled deviation from baseline behavior
type Anomaly struct {
	Name        string
	Description string
	StartHour   int // Hour offset from simulation start (0-335)
	DurationHr  int
	AppliesTo   []string // Merchant IDs or "all"

	// Anomaly effects (multipliers or absolute changes)
	RetryMultiplier     float64 // e.g., 1.4 = +40% retry intensity
	SoftDeclineIncrease float64 // e.g., 0.25 = +25% soft decline rate
	TimeoutFailureRate  float64 // e.g., 0.30 = 30% of failures become timeouts
	VolumeMultiplier    float64 // e.g., 3.0 = 3× volume spike
	MCCDriftEnabled     bool    // Trigger MCC drift to secondary
	AuthFailureIncrease float64 // e.g., 0.15 = +15% auth failures
}

// AnomalySchedule manages anomaly injection
type AnomalySchedule struct {
	Anomalies []*Anomaly
}

// NewAnomalySchedule creates the standard test anomaly schedule
func NewAnomalySchedule() *AnomalySchedule {
	return &AnomalySchedule{
		Anomalies: []*Anomaly{
			// Day 3: Retry Spike (cross-archetype test)
			{
				Name:            "retry_spike_day3",
				Description:     "40% retry intensity increase across all archetypes",
				StartHour:       3 * 24, // Day 3, hour 0
				DurationHr:      4,      // 4 hours
				AppliesTo:       []string{"merchant_stable_001", "merchant_growth_003", "merchant_messy_001"},
				RetryMultiplier: 1.4,
			},

			// Day 5: Soft Decline Surge (growth merchant)
			{
				Name:                "soft_decline_surge_day5",
				Description:         "25% soft decline increase during growth period",
				StartHour:           5*24 + 8, // Day 5, 08:00
				DurationHr:          6,
				AppliesTo:           []string{"merchant_growth_002", "merchant_growth_004"},
				SoftDeclineIncrease: 0.25,
			},

			// Day 7: Auth Latency (simulated via timeout failures)
			{
				Name:               "auth_latency_day7",
				Description:        "P95 latency >3000ms simulated via timeout clustering",
				StartHour:          7*24 + 18, // Day 7, 18:00
				DurationHr:         4,
				AppliesTo:          []string{"merchant_stable_002", "merchant_messy_002"},
				TimeoutFailureRate: 0.30, // 30% of failures become timeouts
			},

			// Day 9-10: MCC Drift (messy merchant)
			{
				Name:            "mcc_drift_day9",
				Description:     "Gradual MCC drift to secondary category",
				StartHour:       9 * 24,
				DurationHr:      48, // 2 days
				AppliesTo:       []string{"merchant_messy_001", "merchant_messy_003"},
				MCCDriftEnabled: true,
			},

			// Day 12: Velocity Spike (growth merchant - should correlate with expansion)
			{
				Name:             "velocity_spike_day12",
				Description:      "3× volume spike followed by normalization",
				StartHour:        12*24 + 10, // Day 12, 10:00
				DurationHr:       4,
				AppliesTo:        []string{"merchant_growth_001", "merchant_growth_003"},
				VolumeMultiplier: 3.0,
			},

			// Day 9: Related anomaly for historical memory test (same merchant as Day 3)
			{
				Name:                "soft_decline_day9_memory_test",
				Description:         "Soft decline surge on merchant with Day 3 retry spike (memory test)",
				StartHour:           9 * 24,
				DurationHr:          6,
				AppliesTo:           []string{"merchant_growth_003"}, // Same as Day 3 retry spike
				SoftDeclineIncrease: 0.20,
			},

			// Day 11: Auth Failure Cluster (messy merchant - compounding risk)
			{
				Name:                "auth_failure_cluster_day11",
				Description:         "Auth failure clustering on high-risk merchant",
				StartHour:           11 * 24,
				DurationHr:          8,
				AppliesTo:           []string{"merchant_messy_001"},
				AuthFailureIncrease: 0.15,
			},
		},
	}
}

// GetActiveAnomalies returns anomalies active at a given hour for a merchant
func (s *AnomalySchedule) GetActiveAnomalies(hourOffset int, merchantID string) []*Anomaly {
	active := make([]*Anomaly, 0)

	for _, a := range s.Anomalies {
		// Check if anomaly is active at this hour
		if hourOffset < a.StartHour || hourOffset >= a.StartHour+a.DurationHr {
			continue
		}

		// Check if anomaly applies to this merchant
		applies := false
		for _, id := range a.AppliesTo {
			if id == "all" || id == merchantID {
				applies = true
				break
			}
		}

		if applies {
			active = append(active, a)
		}
	}

	return active
}

// ApplyAnomalies modifies event generation parameters based on active anomalies
func ApplyAnomalies(anomalies []*Anomaly, params *EventGenParams) {
	for _, a := range anomalies {
		if a.RetryMultiplier > 0 {
			params.RetryIntensity *= a.RetryMultiplier
		}
		if a.SoftDeclineIncrease > 0 {
			params.SoftDeclineRate += a.SoftDeclineIncrease
		}
		if a.TimeoutFailureRate > 0 {
			params.TimeoutFailureRate = a.TimeoutFailureRate
		}
		if a.VolumeMultiplier > 0 {
			params.VolumeMultiplier *= a.VolumeMultiplier
		}
		if a.MCCDriftEnabled {
			params.MCCDriftEnabled = true
		}
		if a.AuthFailureIncrease > 0 {
			params.AuthFailureRate += a.AuthFailureIncrease
		}
	}

	// Clamp values
	if params.SoftDeclineRate > 0.80 {
		params.SoftDeclineRate = 0.80
	}
	if params.TimeoutFailureRate > 0.80 {
		params.TimeoutFailureRate = 0.80
	}
	if params.AuthFailureRate > 0.50 {
		params.AuthFailureRate = 0.50
	}
}

// EventGenParams holds parameters for event generation at a specific hour
type EventGenParams struct {
	Volume             int
	ApprovalRate       float64
	RetryIntensity     float64
	SoftDeclineRate    float64
	TimeoutFailureRate float64
	AuthFailureRate    float64
	VolumeMultiplier   float64
	MCCDriftEnabled    bool
}

// PrintSchedule prints the anomaly schedule for verification
func (s *AnomalySchedule) PrintSchedule() {
	fmt.Println("=== Anomaly Injection Schedule ===")
	for _, a := range s.Anomalies {
		startDay := a.StartHour / 24
		startHourOfDay := a.StartHour % 24
		endHour := a.StartHour + a.DurationHr
		endDay := endHour / 24
		endHourOfDay := endHour % 24

		fmt.Printf("\n[%s]\n", a.Name)
		fmt.Printf("  Description: %s\n", a.Description)
		fmt.Printf("  Time: Day %d %02d:00 → Day %d %02d:00 (%d hours)\n",
			startDay, startHourOfDay, endDay, endHourOfDay, a.DurationHr)
		fmt.Printf("  Applies to: %v\n", a.AppliesTo)

		if a.RetryMultiplier > 0 {
			fmt.Printf("  Effect: Retry intensity ×%.2f\n", a.RetryMultiplier)
		}
		if a.SoftDeclineIncrease > 0 {
			fmt.Printf("  Effect: Soft decline rate +%.0f%%\n", a.SoftDeclineIncrease*100)
		}
		if a.TimeoutFailureRate > 0 {
			fmt.Printf("  Effect: Timeout failure rate %.0f%%\n", a.TimeoutFailureRate*100)
		}
		if a.VolumeMultiplier > 0 {
			fmt.Printf("  Effect: Volume ×%.1f\n", a.VolumeMultiplier)
		}
		if a.MCCDriftEnabled {
			fmt.Printf("  Effect: MCC drift enabled\n")
		}
		if a.AuthFailureIncrease > 0 {
			fmt.Printf("  Effect: Auth failure rate +%.0f%%\n", a.AuthFailureIncrease*100)
		}
	}
	fmt.Println("\n===================================")
}

// GetAnomalyTimestamp returns a human-readable timestamp for an anomaly
func (s *AnomalySchedule) GetAnomalyTimestamp(anomaly *Anomaly, baseTime time.Time) string {
	startTime := baseTime.Add(time.Duration(anomaly.StartHour) * time.Hour)
	return startTime.Format(time.RFC3339)
}
