package entitlements

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/xeipuuv/gojsonschema"
)

// ValidateEntitlementsConfig validates entitlements config against schema
func ValidateEntitlementsConfig(configPath, schemaPath string) error {
	// Load schema
	schemaLoader := gojsonschema.NewReferenceLoader("file://" + schemaPath)

	// Load config
	configLoader := gojsonschema.NewReferenceLoader("file://" + configPath)

	// Validate
	result, err := gojsonschema.Validate(schemaLoader, configLoader)
	if err != nil {
		return fmt.Errorf("schema validation error: %w", err)
	}

	if !result.Valid() {
		errMsg := "entitlements config validation failed:\n"
		for _, desc := range result.Errors() {
			errMsg += fmt.Sprintf("  - %s\n", desc)
		}
		return fmt.Errorf("%s", errMsg)
	}

	// Additional validation: ensure all tiers have monotonically increasing capabilities
	data, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("failed to read config: %w", err)
	}

	var config EntitlementsConfig
	if err := json.Unmarshal(data, &config); err != nil {
		return fmt.Errorf("failed to parse config: %w", err)
	}

	// Validate tier progression
	baseline := config.Entitlements["baseline"]
	proof := config.Entitlements["proof"]
	shield := config.Entitlements["shield"]
	fortress := config.Entitlements["fortress"]

	// Retention should increase
	if !(baseline.RetentionDays <= proof.RetentionDays &&
		proof.RetentionDays <= shield.RetentionDays &&
		shield.RetentionDays <= fortress.RetentionDays) {
		return fmt.Errorf("retention_days must increase across tiers")
	}

	// SLA should decrease (faster response)
	if !(baseline.SLAResponseTimeMs >= proof.SLAResponseTimeMs &&
		proof.SLAResponseTimeMs >= shield.SLAResponseTimeMs &&
		shield.SLAResponseTimeMs >= fortress.SLAResponseTimeMs) {
		return fmt.Errorf("sla_response_time_ms must decrease across tiers")
	}

	// Concurrent requests should increase
	if !(baseline.MaxConcurrentRequests <= proof.MaxConcurrentRequests &&
		proof.MaxConcurrentRequests <= shield.MaxConcurrentRequests &&
		shield.MaxConcurrentRequests <= fortress.MaxConcurrentRequests) {
		return fmt.Errorf("max_concurrent_requests must increase across tiers")
	}

	return nil
}
