package metrics

import (
	"payment-node/internal/tiers"
)

// RecordTierAccess records a tier access attempt (allowed or blocked)
func RecordTierAccess(signalID string, tier tiers.Tier, allowed bool) {
	if allowed {
		signalAccessAllowed.WithLabelValues(string(tier), signalID).Inc()
	} else {
		signalAccessBlocked.WithLabelValues(string(tier), signalID).Inc()
	}
}

// UpdateTierMetrics updates tier signal count metrics
func UpdateTierMetrics(tierRegistry *tiers.TierRegistry) {
	if tierRegistry == nil {
		return
	}

	// Update signal count for each tier
	for _, tier := range []tiers.Tier{tiers.TierBaseline, tiers.TierProof, tiers.TierShield, tiers.TierFortress} {
		count := tierRegistry.GetSignalCountForTier(tier)
		tierSignalCount.WithLabelValues(string(tier)).Set(float64(count))
	}
}
