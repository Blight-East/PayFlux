package testharness

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// PaymentEvent matches PayFlux Event struct
type PaymentEvent struct {
	EventType           string `json:"event_type"`
	EventTimestamp      string `json:"event_timestamp"`
	EventID             string `json:"event_id"`
	MerchantIDHash      string `json:"merchant_id_hash"`
	PaymentIntentIDHash string `json:"payment_intent_id_hash"`
	Processor           string `json:"processor"`
	FailureCategory     string `json:"failure_category"`
	RetryCount          int    `json:"retry_count"`
	GeoBucket           string `json:"geo_bucket"`
	AmountBucket        string `json:"amount_bucket"`
	SystemSource        string `json:"system_source"`
	PaymentMethodBucket string `json:"payment_method_bucket"`
	Channel             string `json:"channel"`
	RetryResult         string `json:"retry_result"`
	FailureOrigin       string `json:"failure_origin"`
}

// TelemetryGenerator creates payment events for merchants
type TelemetryGenerator struct {
	BaseTime time.Time
}

// NewTelemetryGenerator creates a new generator
func NewTelemetryGenerator(baseTime time.Time) *TelemetryGenerator {
	return &TelemetryGenerator{
		BaseTime: baseTime,
	}
}

// GenerateEventsForHour generates events for a merchant at a specific hour
func (g *TelemetryGenerator) GenerateEventsForHour(
	merchant *Merchant,
	hourOffset int,
	anomalies []*Anomaly,
) []*PaymentEvent {
	// Get base parameters from merchant
	params := &EventGenParams{
		Volume:             merchant.GetVolumeAtHour(hourOffset),
		ApprovalRate:       merchant.GetApprovalRateAtHour(hourOffset),
		RetryIntensity:     merchant.GetRetryIntensityAtHour(hourOffset),
		SoftDeclineRate:    0.05, // Base 5%
		TimeoutFailureRate: 0.10, // Base 10% of failures
		AuthFailureRate:    0.05, // Base 5% of failures
		VolumeMultiplier:   1.0,
		MCCDriftEnabled:    false,
	}

	// Apply anomalies
	ApplyAnomalies(anomalies, params)

	// Adjust volume
	volume := int(float64(params.Volume) * params.VolumeMultiplier)

	events := make([]*PaymentEvent, 0, volume)
	timestamp := g.BaseTime.Add(time.Duration(hourOffset) * time.Hour)

	for i := 0; i < volume; i++ {
		// Determine if this payment succeeds or fails
		succeeded := merchant.rng.Float64() < params.ApprovalRate

		event := &PaymentEvent{
			EventTimestamp:      timestamp.Add(time.Duration(i) * time.Second).Format(time.RFC3339),
			EventID:             uuid.New().String(),
			MerchantIDHash:      merchant.ID,
			PaymentIntentIDHash: fmt.Sprintf("pi_%s_%d", merchant.ID, timestamp.Unix()+int64(i)),
			Processor:           merchant.Processor,
			GeoBucket:           merchant.GetGeoBucket(),
			AmountBucket:        g.getAmountBucket(merchant),
			SystemSource:        g.getSystemSource(merchant),
			PaymentMethodBucket: "credit_card",
			Channel:             g.getChannel(merchant),
		}

		if succeeded {
			event.EventType = "payment_succeeded"
			event.FailureCategory = ""
			event.RetryCount = 0
			event.RetryResult = ""
			event.FailureOrigin = ""
		} else {
			event.EventType = "payment_failed"

			// Determine failure category
			failureCategory := merchant.GetFailureCategory()

			// Apply anomaly overrides
			if params.SoftDeclineRate > 0 && merchant.rng.Float64() < params.SoftDeclineRate {
				failureCategory = "soft_decline"
			}
			if params.TimeoutFailureRate > 0 && merchant.rng.Float64() < params.TimeoutFailureRate {
				failureCategory = "processor_timeout"
			}
			if params.AuthFailureRate > 0 && merchant.rng.Float64() < params.AuthFailureRate {
				failureCategory = "auth_failure"
			}

			event.FailureCategory = failureCategory

			// Determine retry count based on retry intensity
			retryCount := 0
			if params.RetryIntensity > 0 {
				// Poisson-like distribution
				retryCount = int(merchant.rng.ExpFloat64() * params.RetryIntensity)
				if retryCount > 5 {
					retryCount = 5 // Cap at 5
				}
			}
			event.RetryCount = retryCount

			// Retry result
			if retryCount > 0 {
				if merchant.rng.Float64() < 0.3 { // 30% of retries succeed
					event.RetryResult = "succeeded"
				} else {
					event.RetryResult = "failed"
				}
			}

			// Failure origin
			event.FailureOrigin = g.getFailureOrigin(failureCategory)
		}

		events = append(events, event)
	}

	return events
}

func (g *TelemetryGenerator) getAmountBucket(m *Merchant) string {
	buckets := []string{"0-50", "50-200", "200-500", "500+"}
	weights := []float64{0.30, 0.50, 0.15, 0.05}

	r := m.rng.Float64()
	cumulative := 0.0
	for i, w := range weights {
		cumulative += w
		if r < cumulative {
			return buckets[i]
		}
	}
	return "50-200"
}

func (g *TelemetryGenerator) getSystemSource(m *Merchant) string {
	sources := []string{"checkout_api", "mobile_sdk", "recurring_billing"}

	if m.Archetype == ArchetypeStable {
		// Stable merchants mostly use checkout_api
		if m.rng.Float64() < 0.80 {
			return "checkout_api"
		}
	}

	return sources[m.rng.Intn(len(sources))]
}

func (g *TelemetryGenerator) getChannel(m *Merchant) string {
	channels := []string{"web", "mobile", "api"}

	if m.Archetype == ArchetypeGrowth {
		// Growth merchants have more mobile traffic
		if m.rng.Float64() < 0.40 {
			return "mobile"
		}
	}

	return channels[m.rng.Intn(len(channels))]
}

func (g *TelemetryGenerator) getFailureOrigin(category string) string {
	switch category {
	case "processor_timeout", "auth_failure":
		return "processor"
	case "network_error":
		return "network"
	case "invalid_card", "card_declined", "insufficient_funds":
		return "customer"
	default:
		return "processor"
	}
}

// GenerateAllEvents generates events for all merchants across all hours
func (g *TelemetryGenerator) GenerateAllEvents(
	merchants []*Merchant,
	schedule *AnomalySchedule,
	totalHours int,
) [][]*PaymentEvent {
	// Result: [hourOffset][events]
	allEvents := make([][]*PaymentEvent, totalHours)

	for hourOffset := 0; hourOffset < totalHours; hourOffset++ {
		hourEvents := make([]*PaymentEvent, 0)

		for _, merchant := range merchants {
			// Get active anomalies for this merchant at this hour
			anomalies := schedule.GetActiveAnomalies(hourOffset, merchant.ID)

			// Generate events
			events := g.GenerateEventsForHour(merchant, hourOffset, anomalies)
			hourEvents = append(hourEvents, events...)
		}

		allEvents[hourOffset] = hourEvents
	}

	return allEvents
}

// GetEventCount returns total event count across all hours
func GetEventCount(allEvents [][]*PaymentEvent) int {
	total := 0
	for _, hourEvents := range allEvents {
		total += len(hourEvents)
	}
	return total
}
