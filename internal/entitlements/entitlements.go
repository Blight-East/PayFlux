package entitlements

import (
	"encoding/json"
	"fmt"
	"os"
	"sync/atomic"
)

// Entitlements defines tier-specific capabilities and limits
type Entitlements struct {
	RetentionDays         int      `json:"retention_days"`
	AlertRoutingEnabled   bool     `json:"alert_routing_enabled"`
	SLAResponseTimeMs     int      `json:"sla_response_time_ms"`
	MaxConcurrentRequests int      `json:"max_concurrent_requests"`
	ExportFormats         []string `json:"export_formats"`
}

// EntitlementsConfig represents the full entitlements configuration
type EntitlementsConfig struct {
	Entitlements map[string]Entitlements `json:"entitlements"`
}

// EntitlementsRegistry manages tier entitlements with thread-safe access
type EntitlementsRegistry struct {
	config atomic.Value // stores map[string]Entitlements
}

// LoadEntitlementsRegistry loads and validates entitlements configuration
func LoadEntitlementsRegistry(configPath string) (*EntitlementsRegistry, error) {
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read entitlements config: %w", err)
	}

	var config EntitlementsConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse entitlements config: %w", err)
	}

	// Validate required tiers
	requiredTiers := []string{"baseline", "proof", "shield", "fortress"}
	for _, tier := range requiredTiers {
		if _, ok := config.Entitlements[tier]; !ok {
			return nil, fmt.Errorf("missing required tier: %s", tier)
		}
	}

	// Validate entitlements
	for tier, ent := range config.Entitlements {
		if err := validateEntitlements(tier, ent); err != nil {
			return nil, fmt.Errorf("invalid entitlements for tier %s: %w", tier, err)
		}
	}

	registry := &EntitlementsRegistry{}
	registry.config.Store(config.Entitlements)

	return registry, nil
}

// GetEntitlements returns entitlements for a given tier (O(1) lookup, zero allocations)
func (er *EntitlementsRegistry) GetEntitlements(tier string) (Entitlements, error) {
	entitlements := er.config.Load().(map[string]Entitlements)

	ent, ok := entitlements[tier]
	if !ok {
		// Fail closed: return restrictive defaults for unknown tiers
		return Entitlements{
			RetentionDays:         1,
			AlertRoutingEnabled:   false,
			SLAResponseTimeMs:     30000,
			MaxConcurrentRequests: 1,
			ExportFormats:         []string{"json"},
		}, fmt.Errorf("unknown tier: %s", tier)
	}

	return ent, nil
}

// GetAllTiers returns all configured tier names
func (er *EntitlementsRegistry) GetAllTiers() []string {
	entitlements := er.config.Load().(map[string]Entitlements)
	tiers := make([]string, 0, len(entitlements))
	for tier := range entitlements {
		tiers = append(tiers, tier)
	}
	return tiers
}

// validateEntitlements validates entitlement values
func validateEntitlements(tier string, ent Entitlements) error {
	if ent.RetentionDays < 1 || ent.RetentionDays > 3650 {
		return fmt.Errorf("retention_days must be between 1 and 3650, got %d", ent.RetentionDays)
	}

	if ent.SLAResponseTimeMs < 100 || ent.SLAResponseTimeMs > 30000 {
		return fmt.Errorf("sla_response_time_ms must be between 100 and 30000, got %d", ent.SLAResponseTimeMs)
	}

	if ent.MaxConcurrentRequests < 1 || ent.MaxConcurrentRequests > 10000 {
		return fmt.Errorf("max_concurrent_requests must be between 1 and 10000, got %d", ent.MaxConcurrentRequests)
	}

	if len(ent.ExportFormats) == 0 {
		return fmt.Errorf("export_formats cannot be empty")
	}

	validFormats := map[string]bool{"json": true, "csv": true, "parquet": true, "avro": true}
	for _, format := range ent.ExportFormats {
		if !validFormats[format] {
			return fmt.Errorf("invalid export format: %s", format)
		}
	}

	return nil
}
