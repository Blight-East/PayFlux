package tiers

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"sync/atomic"
)

// Tier represents a workspace tier level
type Tier string

const (
	TierBaseline Tier = "baseline"
	TierProof    Tier = "proof"
	TierShield   Tier = "shield"
	TierFortress Tier = "fortress"
)

// ValidTiers contains all valid tier values
var ValidTiers = map[Tier]bool{
	TierBaseline: true,
	TierProof:    true,
	TierShield:   true,
	TierFortress: true,
}

// TierConfig represents the tier configuration file structure
type TierConfig struct {
	Tiers map[string][]string `json:"tiers"`
}

// TierRegistry holds precompiled tier-to-signal mappings for O(1) lookup
type TierRegistry struct {
	// Atomic pointer to compiled map for lock-free reads
	compiled atomic.Value // map[Tier]map[string]bool
}

// compiledMap is the internal structure for O(1) lookups
type compiledMap map[Tier]map[string]bool

var globalTierRegistry *TierRegistry

// LoadTierRegistry loads and compiles tier config from file
// Returns error if file cannot be read or parsed
func LoadTierRegistry(configPath string) (*TierRegistry, error) {
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read tier config: %w", err)
	}

	var cfg TierConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse tier config: %w", err)
	}

	registry := &TierRegistry{}
	if err := registry.compile(cfg); err != nil {
		return nil, err
	}

	return registry, nil
}

// compile converts tier config into O(1) lookup maps
func (tr *TierRegistry) compile(cfg TierConfig) error {
	compiled := make(compiledMap)

	for tierStr, patterns := range cfg.Tiers {
		tier := Tier(tierStr)

		// Validate tier
		if !ValidTiers[tier] {
			return fmt.Errorf("invalid tier: %s", tierStr)
		}

		// Validate not empty
		if len(patterns) == 0 {
			return fmt.Errorf("tier %s has no signals defined", tierStr)
		}

		signalMap := make(map[string]bool)

		for _, pattern := range patterns {
			// Store pattern as-is for matching
			signalMap[pattern] = true
		}

		compiled[tier] = signalMap
	}

	tr.compiled.Store(compiled)
	return nil
}

// IsSignalAllowed checks if signal is allowed for tier (O(1) for exact match, O(n) for wildcards where n is small)
func (tr *TierRegistry) IsSignalAllowed(signalID string, tier Tier) bool {
	compiled := tr.compiled.Load().(compiledMap)

	signalMap, ok := compiled[tier]
	if !ok {
		return false // Unknown tier = no access
	}

	// Check 1: Exact match (O(1))
	if signalMap[signalID] {
		return true
	}

	// Check 2: Global wildcard (O(1))
	if signalMap["*"] {
		return true
	}

	// Check 3: Wildcard patterns (O(n) where n = number of patterns, typically <10)
	for pattern := range signalMap {
		if !strings.HasSuffix(pattern, "*") {
			continue // Not a wildcard pattern
		}

		// Category wildcard: "category:*"
		if strings.Contains(pattern, ":") {
			prefix := strings.TrimSuffix(pattern, "*")
			if strings.HasPrefix(signalID, prefix) {
				return true
			}
		} else {
			// Prefix wildcard: "sig_*"
			prefix := strings.TrimSuffix(pattern, "*")
			if strings.HasPrefix(signalID, prefix) {
				return true
			}
		}
	}

	return false
}

// TierCount returns the number of tiers configured
func (tr *TierRegistry) TierCount() int {
	compiled := tr.compiled.Load().(compiledMap)
	return len(compiled)
}

// GetAllowedSignals returns all explicitly allowed signal IDs for tier
// Note: Does not expand wildcards
func (tr *TierRegistry) GetAllowedSignals(tier Tier) []string {
	compiled := tr.compiled.Load().(compiledMap)

	signalMap, ok := compiled[tier]
	if !ok {
		return []string{}
	}

	signals := make([]string, 0, len(signalMap))
	for pattern := range signalMap {
		signals = append(signals, pattern)
	}
	return signals
}

// SetGlobalTierRegistry sets the global tier registry instance
func SetGlobalTierRegistry(registry *TierRegistry) {
	globalTierRegistry = registry
}

// GetGlobalTierRegistry returns the global tier registry instance
func GetGlobalTierRegistry() *TierRegistry {
	return globalTierRegistry
}
