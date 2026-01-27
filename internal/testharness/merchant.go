package testharness

import (
	"fmt"
	"math"
	"math/rand"
	"time"
)

// MerchantArchetype defines behavioral patterns
type MerchantArchetype string

const (
	ArchetypeStable MerchantArchetype = "stable"
	ArchetypeGrowth MerchantArchetype = "growth"
	ArchetypeMessy  MerchantArchetype = "messy"
)

// Merchant represents a simulated merchant with behavioral characteristics
type Merchant struct {
	ID               string
	Archetype        MerchantArchetype
	BaselineVolumeHr int     // Events per hour at baseline
	ApprovalRate     float64 // 0.0-1.0
	RetryIntensity   float64 // Average retries per failed payment
	GeoDiversity     int     // Number of unique geo buckets
	MCCPrimary       string
	MCCSecondary     string // For drift testing
	Processor        string

	// Growth parameters (for growth archetype)
	GrowthRate float64 // Volume multiplier per day

	// Volatility parameters (for messy archetype)
	VolumeVolatility float64 // Stddev as fraction of mean

	// Internal state
	rng *rand.Rand
}

// MerchantConfig defines merchant generation parameters
type MerchantConfig struct {
	NumStable int
	NumGrowth int
	NumMessy  int
	Processor string
}

// GenerateMerchants creates a portfolio of merchants with variation
func GenerateMerchants(cfg MerchantConfig) []*Merchant {
	merchants := make([]*Merchant, 0, cfg.NumStable+cfg.NumGrowth+cfg.NumMessy)
	seed := time.Now().UnixNano()

	// Stable merchants
	for i := 0; i < cfg.NumStable; i++ {
		m := &Merchant{
			ID:               fmt.Sprintf("merchant_stable_%03d", i+1),
			Archetype:        ArchetypeStable,
			BaselineVolumeHr: 100 + rand.Intn(100),       // 100-200/hr
			ApprovalRate:     0.92 + rand.Float64()*0.03, // 92-95%
			RetryIntensity:   0.1 + rand.Float64()*0.2,   // 0.1-0.3
			GeoDiversity:     3,                          // Low diversity
			MCCPrimary:       "5411",                     // Grocery stores
			Processor:        cfg.Processor,
			rng:              rand.New(rand.NewSource(seed + int64(i))),
		}
		merchants = append(merchants, m)
	}

	// Growth merchants
	for i := 0; i < cfg.NumGrowth; i++ {
		m := &Merchant{
			ID:               fmt.Sprintf("merchant_growth_%03d", i+1),
			Archetype:        ArchetypeGrowth,
			BaselineVolumeHr: 100 + rand.Intn(100),       // 100-200/hr at start
			ApprovalRate:     0.88 + rand.Float64()*0.04, // 88-92%
			RetryIntensity:   0.4 + rand.Float64()*0.4,   // 0.4-0.8
			GeoDiversity:     6,                          // Medium diversity, expanding
			MCCPrimary:       "5734",                     // Computer software stores
			MCCSecondary:     "5815",                     // Digital goods
			Processor:        cfg.Processor,
			GrowthRate:       1.15, // 15% daily growth
			rng:              rand.New(rand.NewSource(seed + int64(cfg.NumStable+i))),
		}
		merchants = append(merchants, m)
	}

	// Messy merchants
	for i := 0; i < cfg.NumMessy; i++ {
		m := &Merchant{
			ID:               fmt.Sprintf("merchant_messy_%03d", i+1),
			Archetype:        ArchetypeMessy,
			BaselineVolumeHr: 150 + rand.Intn(100),       // 150-250/hr baseline
			ApprovalRate:     0.75 + rand.Float64()*0.10, // 75-85%
			RetryIntensity:   1.0 + rand.Float64()*1.5,   // 1.0-2.5
			GeoDiversity:     12,                         // High diversity
			MCCPrimary:       "5967",                     // Direct marketing
			MCCSecondary:     "5999",                     // Miscellaneous
			Processor:        cfg.Processor,
			VolumeVolatility: 0.5, // 50% stddev
			rng:              rand.New(rand.NewSource(seed + int64(cfg.NumStable+cfg.NumGrowth+i))),
		}
		merchants = append(merchants, m)
	}

	return merchants
}

// GetVolumeAtHour returns expected event volume for a given hour offset (0-335 for 14 days)
func (m *Merchant) GetVolumeAtHour(hourOffset int) int {
	baseVolume := float64(m.BaselineVolumeHr)

	switch m.Archetype {
	case ArchetypeGrowth:
		// Apply growth rate (compounding daily)
		dayOffset := float64(hourOffset) / 24.0
		baseVolume *= math.Pow(m.GrowthRate, dayOffset)

	case ArchetypeMessy:
		// Add volatility
		volatility := m.rng.NormFloat64() * m.VolumeVolatility * baseVolume
		baseVolume += volatility
		if baseVolume < 50 {
			baseVolume = 50 // Floor
		}
	}

	return int(baseVolume)
}

// GetApprovalRateAtHour returns approval rate with minor variation
func (m *Merchant) GetApprovalRateAtHour(hourOffset int) float64 {
	// Add small random variation (±2%)
	variation := (m.rng.Float64() - 0.5) * 0.04
	rate := m.ApprovalRate + variation

	// Clamp
	if rate < 0.5 {
		rate = 0.5
	}
	if rate > 0.99 {
		rate = 0.99
	}

	return rate
}

// GetRetryIntensityAtHour returns retry intensity with variation
func (m *Merchant) GetRetryIntensityAtHour(hourOffset int) float64 {
	// Add small random variation
	variation := (m.rng.Float64() - 0.5) * 0.2
	intensity := m.RetryIntensity + variation

	if intensity < 0 {
		intensity = 0
	}
	if intensity > 5.0 {
		intensity = 5.0
	}

	return intensity
}

// GetGeoBucket returns a geo bucket based on merchant diversity
func (m *Merchant) GetGeoBucket() string {
	geoBuckets := []string{"US", "CA", "UK", "EU", "AU", "JP", "BR", "MX", "IN", "SG", "DE", "FR"}

	// Stable: concentrated (80% US)
	if m.Archetype == ArchetypeStable {
		if m.rng.Float64() < 0.80 {
			return "US"
		}
		return geoBuckets[m.rng.Intn(3)] // US, CA, UK
	}

	// Growth: expanding diversity
	if m.Archetype == ArchetypeGrowth {
		return geoBuckets[m.rng.Intn(m.GeoDiversity)]
	}

	// Messy: high entropy
	return geoBuckets[m.rng.Intn(m.GeoDiversity)]
}

// GetMCC returns MCC code (with optional drift for messy merchants)
func (m *Merchant) GetMCC(hourOffset int) string {
	// Messy merchants drift to secondary MCC occasionally
	if m.Archetype == ArchetypeMessy && m.MCCSecondary != "" {
		if m.rng.Float64() < 0.15 { // 15% secondary
			return m.MCCSecondary
		}
	}

	// Growth merchants occasionally use secondary
	if m.Archetype == ArchetypeGrowth && m.MCCSecondary != "" {
		if m.rng.Float64() < 0.05 { // 5% secondary
			return m.MCCSecondary
		}
	}

	return m.MCCPrimary
}

// GetFailureCategory returns a failure category based on merchant profile
func (m *Merchant) GetFailureCategory() string {
	categories := []string{
		"card_declined",
		"insufficient_funds",
		"processor_timeout",
		"auth_failure",
		"soft_decline",
		"network_error",
		"invalid_card",
	}

	// Messy merchants have higher soft decline rate
	if m.Archetype == ArchetypeMessy {
		if m.rng.Float64() < 0.40 {
			return "soft_decline"
		}
	}

	// Normal distribution
	weights := []float64{0.70, 0.10, 0.10, 0.05, 0.03, 0.01, 0.01}
	r := m.rng.Float64()
	cumulative := 0.0
	for i, w := range weights {
		cumulative += w
		if r < cumulative {
			return categories[i]
		}
	}

	return "card_declined"
}

// String returns merchant summary
func (m *Merchant) String() string {
	return fmt.Sprintf("%s [%s] baseline=%d/hr approval=%.2f retry=%.2f geo_div=%d",
		m.ID, m.Archetype, m.BaselineVolumeHr, m.ApprovalRate, m.RetryIntensity, m.GeoDiversity)
}
