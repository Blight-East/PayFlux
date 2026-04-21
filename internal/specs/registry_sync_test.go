package specs

import (
	"encoding/json"
	"os"
	"testing"
)

func TestRegistrySync(t *testing.T) {
	// Type definitions for runtime config
	type SignalConfig struct {
		Severity      string `json:"severity,omitempty"`
		Deterministic bool   `json:"deterministic"`
		Type          string `json:"type"`
		Enabled       bool   `json:"enabled"`
	}

	type RuntimeConfig struct {
		Signals    map[string]SignalConfig `json:"signals"`
		Thresholds map[string]interface{}  `json:"thresholds"`
		Tiers      map[string]interface{}  `json:"tiers"`
	}

	// Step 1: Read registry
	registryData, err := os.ReadFile("signal-registry.v1.json")
	if err != nil {
		t.Fatalf("Failed to read registry: %v", err)
	}

	var reg Registry
	if err := json.Unmarshal(registryData, &reg); err != nil {
		t.Fatalf("Failed to parse registry: %v", err)
	}

	// Step 2: Generate runtime config in-memory
	generatedCfg := RuntimeConfig{
		Signals:    make(map[string]SignalConfig),
		Thresholds: make(map[string]interface{}),
		Tiers:      make(map[string]interface{}),
	}

	for _, sig := range reg.Signals {
		severity := ""
		if len(sig.SeverityLevels) > 0 {
			severity = sig.SeverityLevels[0]
		}

		generatedCfg.Signals[sig.ID] = SignalConfig{
			Severity:      severity,
			Deterministic: sig.Deterministic,
			Type:          sig.Type,
			Enabled:       true,
		}
	}

	// Step 3: Read committed runtime config
	committedData, err := os.ReadFile("../../config/signals.runtime.json")
	if err != nil {
		t.Fatalf("Failed to read committed runtime config: %v", err)
	}

	var committedCfg RuntimeConfig
	if err := json.Unmarshal(committedData, &committedCfg); err != nil {
		t.Fatalf("Failed to parse committed runtime config: %v", err)
	}

	// Step 4: Compare
	generatedJSON, _ := json.MarshalIndent(generatedCfg, "", "  ")
	committedJSON, _ := json.MarshalIndent(committedCfg, "", "  ")

	if string(generatedJSON) != string(committedJSON) {
		t.Errorf("Runtime config drift detected!\n\nGenerated config does not match committed config.\n\nRun: go run internal/specs/generate_runtime_config.go\n\nThen commit the updated config/signals.runtime.json")
	}
}

func TestValidateRegistry(t *testing.T) {
	// This test ensures the validator runs without panicking
	defer func() {
		if r := recover(); r != nil {
			t.Fatalf("Registry validation panicked: %v", r)
		}
	}()

	err := ValidateRegistry("signal-registry.v1.json")
	if err != nil {
		t.Fatalf("Registry validation failed: %v", err)
	}
}
