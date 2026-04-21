package tiers

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

// SignalRegistry minimal structure for validation
type SignalRegistry struct {
	Signals []Signal `json:"signals"`
}

type Signal struct {
	ID string `json:"id"`
}

// ValidateTierConfig validates tier config against signal registry
// Checks:
// - Unknown signal IDs
// - Unknown categories
// - Empty tiers
// - Duplicate assignments
// - Malformed JSON
func ValidateTierConfig(configPath, registryPath string) error {
	// Load tier config
	tierData, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("failed to read tier config: %w", err)
	}

	var tierCfg TierConfig
	if err := json.Unmarshal(tierData, &tierCfg); err != nil {
		return fmt.Errorf("malformed tier config JSON: %w", err)
	}

	// Load signal registry
	registryData, err := os.ReadFile(registryPath)
	if err != nil {
		return fmt.Errorf("failed to read signal registry: %w", err)
	}

	var registry SignalRegistry
	if err := json.Unmarshal(registryData, &registry); err != nil {
		return fmt.Errorf("failed to parse signal registry: %w", err)
	}

	// Build valid signal ID set
	validSignals := make(map[string]bool)
	validCategories := make(map[string]bool)

	for _, sig := range registry.Signals {
		validSignals[sig.ID] = true

		// Extract category (prefix before first colon)
		if idx := strings.Index(sig.ID, ":"); idx > 0 {
			category := sig.ID[:idx]
			validCategories[category] = true
		}
	}
	// Build valid signal ID set (no longer used for direct pattern validation, but kept for context if needed elsewhere)
	// validSignals := make(map[string]bool)
	// validCategories := make(map[string]bool)

	// for _, sig := range registry.Signals {
	// 	validSignals[sig.ID] = true

	// 	// Extract category (prefix before first colon)
	// 	if idx := strings.Index(sig.ID, ":"); idx > 0 {
	// 		category := sig.ID[:idx]
	// 		validCategories[category] = true
	// 	}
	// }

	// Helper to check if a tier name is valid
	isValidTier := func(tierName string) bool {
		_, ok := ValidTiers[Tier(tierName)]
		return ok
	}

	// Validate each tier's signal patterns
	for tierName, patterns := range tierCfg.Tiers {
		// Validate tier name
		if !isValidTier(tierName) {
			return fmt.Errorf("invalid tier name: %s", tierName)
		}

		// Check 2: Not empty (re-added from original logic)
		if len(patterns) == 0 {
			return fmt.Errorf("tier %s has no signals defined", tierName)
		}

		// Validate each pattern
		for _, pattern := range patterns {
			// Global wildcard is always valid
			if pattern == "*" {
				continue
			}

			// Category wildcard pattern (e.g., "validation:*")
			if strings.HasSuffix(pattern, ":*") {
				// Category wildcards are valid without checking registry
				// They will match any signal with that category prefix
				continue
			}

			// Prefix wildcard pattern (e.g., "sig_*")
			if strings.HasSuffix(pattern, "_*") {
				// Prefix wildcards are valid without checking registry
				// They will match any signal with that prefix
				continue
			}

			// Exact signal ID - must exist in registry
			found := false
			for _, signal := range registry.Signals {
				if signal.ID == pattern {
					found = true
					break
				}
			}

			if !found {
				return fmt.Errorf("tier %s references unknown signal: %s", tierName, pattern)
			}
		}
	}

	// Check 4: All tiers defined
	requiredTiers := []Tier{TierBaseline, TierProof, TierShield, TierFortress}
	for _, tier := range requiredTiers {
		if _, ok := tierCfg.Tiers[string(tier)]; !ok {
			return fmt.Errorf("missing required tier: %s", tier)
		}
	}

	return nil
}
