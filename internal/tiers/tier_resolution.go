package tiers

// ResolveSignalAccess checks if a signal is allowed for a given tier
func (r *TierRegistry) ResolveSignalAccess(signalID string, tier Tier) (bool, string) {
	// Backward compatibility: map "free" to "baseline"
	if tier == "free" {
		tier = "baseline"
	}
	if !ValidTiers[tier] {
		return false, "invalid_tier"
	}

	if r.IsSignalAllowed(signalID, tier) {
		return true, "allowed"
	}

	return false, "tier_restricted"
}

// GetSignalCountForTier returns the number of patterns defined for tier
func (tr *TierRegistry) GetSignalCountForTier(tier Tier) int {
	compiled := tr.compiled.Load().(compiledMap)

	signalMap, ok := compiled[tier]
	if !ok {
		return 0
	}

	return len(signalMap)
}
