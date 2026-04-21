package metrics

import (
	"sync"

	"payment-node/internal/config"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// signalEnabled tracks whether each signal is enabled (0=disabled, 1=enabled)
	signalEnabled = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "signal_enabled",
			Help: "Whether a signal is currently enabled (1) or disabled (0)",
		},
		[]string{"signal_id"},
	)

	// signalOverrideActive tracks whether a signal has an active override
	signalOverrideActive = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "signal_override_active",
			Help: "Whether a signal has an active runtime override (1) or not (0)",
		},
		[]string{"signal_id"},
	)

	// signalLastOverrideTimestamp tracks when a signal was last overridden
	signalLastOverrideTimestamp = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "signal_last_override_timestamp",
			Help: "Unix timestamp of the last override update for a signal",
		},
		[]string{"signal_id"},
	)

	// activeOverrideCount tracks total number of active overrides
	activeOverrideCount = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "active_override_count",
			Help: "Total number of active signal overrides",
		},
	)

	// signalAccessAllowed tracks allowed signal access by tier
	signalAccessAllowed = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "signal_access_allowed",
			Help: "Number of times a signal was allowed for a tier",
		},
		[]string{"tier", "signal_id"},
	)

	// signalAccessBlocked tracks blocked signal access by tier
	signalAccessBlocked = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "signal_access_blocked",
			Help: "Number of times a signal was blocked for a tier",
		},
		[]string{"tier", "signal_id"},
	)

	// tierSignalCount tracks number of signals per tier
	tierSignalCount = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "tier_signal_count",
			Help: "Number of signal patterns defined for each tier",
		},
		[]string{"tier"},
	)

	// metricsInitialized ensures we only initialize once
	metricsInitialized bool
	metricsInitMu      sync.Mutex
)

// InitializeSignalMetrics initializes metrics for all signals
// Should be called once during service bootstrap
func InitializeSignalMetrics() {
	metricsInitMu.Lock()
	defer metricsInitMu.Unlock()

	if metricsInitialized {
		return
	}

	// Get all signals from runtime config
	allSignals := config.GetAllSignals()

	for id := range allSignals {
		UpdateSignalMetrics(id)
	}

	metricsInitialized = true
}

// UpdateSignalMetrics updates all metrics for a specific signal
// Should be called whenever a signal's override changes
func UpdateSignalMetrics(signalID string) {
	// Get effective config
	effectiveCfg := config.GetEffectiveSignalConfig(signalID)

	// Update enabled metric
	if effectiveCfg.Enabled {
		signalEnabled.WithLabelValues(signalID).Set(1)
	} else {
		signalEnabled.WithLabelValues(signalID).Set(0)
	}

	// Check for override
	override, hasOverride := config.GetSignalOverride(signalID)

	// Update override active metric
	if hasOverride {
		signalOverrideActive.WithLabelValues(signalID).Set(1)
		signalLastOverrideTimestamp.WithLabelValues(signalID).Set(float64(override.UpdatedAt))
	} else {
		signalOverrideActive.WithLabelValues(signalID).Set(0)
		// Don't update timestamp if no override
	}
}

// UpdateAllSignalMetrics updates metrics for all signals
// Useful after bulk override operations
func UpdateAllSignalMetrics() {
	allSignals := config.GetAllSignals()
	activeOverrides := 0

	for id := range allSignals {
		UpdateSignalMetrics(id)
		if config.HasSignalOverride(id) {
			activeOverrides++
		}
	}

	// Update active override count
	activeOverrideCount.Set(float64(activeOverrides))
}
