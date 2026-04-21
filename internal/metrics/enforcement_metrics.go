package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// RetentionBlockTotal tracks retention policy violations
	RetentionBlockTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "payflux_retention_block_total",
			Help: "Total number of requests blocked due to retention policy",
		},
		[]string{"tier"},
	)

	// ConcurrencyBlockTotal tracks concurrency limit violations
	ConcurrencyBlockTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "payflux_concurrency_block_total",
			Help: "Total number of requests blocked due to concurrency limits",
		},
		[]string{"tier"},
	)

	// AlertsSuppressedTotal tracks suppressed alerts
	AlertsSuppressedTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "alerts_suppressed_total",
			Help: "Total number of alerts suppressed due to tier entitlements",
		},
		[]string{"tier"},
	)

	// ActiveRequests tracks active requests per tier
	ActiveRequests = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "payflux_active_requests",
			Help: "Current number of active requests per tier",
		},
		[]string{"tier"},
	)
)

// RecordRetentionBlock records a retention policy block
func RecordRetentionBlock(tier string) {
	RetentionBlockTotal.WithLabelValues(tier).Inc()
}

// RecordConcurrencyBlock records a concurrency limit block
func RecordConcurrencyBlock(tier string) {
	ConcurrencyBlockTotal.WithLabelValues(tier).Inc()
}

// RecordAlertSuppressed records a suppressed alert
func RecordAlertSuppressed(tier string) {
	AlertsSuppressedTotal.WithLabelValues(tier).Inc()
}

// UpdateActiveRequests updates the active request gauge
func UpdateActiveRequests(tier string, count int64) {
	ActiveRequests.WithLabelValues(tier).Set(float64(count))
}

// InitializeEnforcementMetrics initializes enforcement metrics for all tiers
func InitializeEnforcementMetrics(tiers []string) {
	for _, tier := range tiers {
		RetentionBlockTotal.WithLabelValues(tier).Add(0)
		ConcurrencyBlockTotal.WithLabelValues(tier).Add(0)
		AlertsSuppressedTotal.WithLabelValues(tier).Add(0)
		ActiveRequests.WithLabelValues(tier).Add(0)
	}
}
