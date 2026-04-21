package config

import (
	"payment-node/internal/tiers"
)

// GetEffectiveSignalConfig returns the effective configuration for a signal
// Resolution order: runtime override > live override > canonical spec
// O(1) lookup via map access
// Defaults to "baseline" tier for backward compatibility
func GetEffectiveSignalConfig(id string) SignalConfig {
	return GetEffectiveSignalConfigForTier(id, tiers.TierBaseline)
}

// GetEffectiveSignalConfigForTier returns the effective configuration for a signal with tier enforcement
// Resolution order: tier check > runtime override > live override > canonical spec
// O(1) lookup via map access
func GetEffectiveSignalConfigForTier(id string, tier tiers.Tier) SignalConfig {
	// Check tier access first
	tierRegistry := tiers.GetGlobalTierRegistry()
	if tierRegistry != nil {
		allowed, reason := tierRegistry.ResolveSignalAccess(id, tier)
		if !allowed {
			// Return disabled config for blocked signals
			return SignalConfig{
				Enabled: false,
				Reason:  reason,
			}
		}
	}

	// Step 1: Get base config from runtime file
	cfg, ok := GetSignalConfig(id) // Assuming GetSignalConfig returns (SignalConfig, bool)
	if !ok {
		return SignalConfig{} // Return zero-value if not found in runtime config
	}

	// Step 2: Apply overrides if store is initialized and override exists
	if globalOverrideStore != nil {
		if override, hasOverride := globalOverrideStore.GetOverride(id); hasOverride {
			// Apply field-level overrides (only non-nil fields)
			if override.Enabled != nil {
				cfg.Enabled = *override.Enabled
			}
			if override.Severity != nil {
				cfg.Severity = *override.Severity
			}
			// Note: Threshold is not part of SignalConfig struct
			// It would be handled separately if needed
		}
	}

	return cfg
}

// IsSignalEnabledEffective checks if a signal is enabled after applying overrides
// This is a convenience wrapper around GetEffectiveSignalConfig
func IsSignalEnabledEffective(id string) bool {
	cfg := GetEffectiveSignalConfig(id)
	return cfg.Enabled
}

// GetSignalOverride retrieves the current override for a signal, if any
// Returns (override, true) if override exists, (zero-value, false) if not
func GetSignalOverride(id string) (SignalOverride, bool) {
	if globalOverrideStore == nil {
		return SignalOverride{}, false
	}
	return globalOverrideStore.GetOverride(id)
}

// HasSignalOverride checks if a signal has an active override
func HasSignalOverride(id string) bool {
	_, ok := GetSignalOverride(id)
	return ok
}
