package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// EntitlementLookupTotal tracks entitlement lookup attempts
	EntitlementLookupTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "entitlement_lookup_total",
			Help: "Total number of entitlement lookups by tier and result",
		},
		[]string{"tier", "result"},
	)

	// EntitlementRetentionDays tracks configured retention per tier
	EntitlementRetentionDays = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "entitlement_retention_days",
			Help: "Configured retention period in days per tier",
		},
		[]string{"tier"},
	)

	// EntitlementSLAMs tracks configured SLA per tier
	EntitlementSLAMs = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "entitlement_sla_ms",
			Help: "Configured SLA response time in milliseconds per tier",
		},
		[]string{"tier"},
	)

	// EntitlementMaxConcurrent tracks max concurrent requests per tier
	EntitlementMaxConcurrent = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "entitlement_max_concurrent",
			Help: "Maximum concurrent requests allowed per tier",
		},
		[]string{"tier"},
	)
)

// RecordEntitlementLookup records an entitlement lookup
func RecordEntitlementLookup(tier string, success bool) {
	result := "success"
	if !success {
		result = "failure"
	}
	EntitlementLookupTotal.WithLabelValues(tier, result).Inc()
}

// InitializeEntitlementMetrics initializes entitlement metrics for all tiers
func InitializeEntitlementMetrics(tiers map[string]struct {
	RetentionDays         int
	SLAResponseTimeMs     int
	MaxConcurrentRequests int
}) {
	for tier, ent := range tiers {
		EntitlementRetentionDays.WithLabelValues(tier).Set(float64(ent.RetentionDays))
		EntitlementSLAMs.WithLabelValues(tier).Set(float64(ent.SLAResponseTimeMs))
		EntitlementMaxConcurrent.WithLabelValues(tier).Set(float64(ent.MaxConcurrentRequests))
	}
}
