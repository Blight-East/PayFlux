package main

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
)

type Registry struct {
	Signals []Signal `json:"signals"`
}

type Signal struct {
	ID             string   `json:"id"`
	Type           string   `json:"type"`
	Deterministic  bool     `json:"deterministic"`
	SeverityLevels []string `json:"severity_levels"`
}

type RuntimeConfig struct {
	Signals    map[string]SignalConfig `json:"signals"`
	Thresholds map[string]interface{}  `json:"thresholds"`
	Tiers      map[string]interface{}  `json:"tiers"`
}

type SignalConfig struct {
	Severity      string `json:"severity,omitempty"`
	Deterministic bool   `json:"deterministic"`
	Type          string `json:"type"`
	Enabled       bool   `json:"enabled"`
}

func main() {
	// Read registry
	data, err := os.ReadFile("internal/specs/signal-registry.v1.json")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading registry: %v\n", err)
		os.Exit(1)
	}

	var reg Registry
	if err := json.Unmarshal(data, &reg); err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing registry: %v\n", err)
		os.Exit(1)
	}

	// Transform to runtime config
	runtimeCfg := RuntimeConfig{
		Signals:    make(map[string]SignalConfig),
		Thresholds: make(map[string]interface{}),
		Tiers:      make(map[string]interface{}),
	}

	for _, sig := range reg.Signals {
		severity := ""
		if len(sig.SeverityLevels) > 0 {
			severity = sig.SeverityLevels[0]
		}

		runtimeCfg.Signals[sig.ID] = SignalConfig{
			Severity:      severity,
			Deterministic: sig.Deterministic,
			Type:          sig.Type,
			Enabled:       true,
		}
	}

	// Marshal with stable key ordering
	output, err := json.MarshalIndent(runtimeCfg, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshaling runtime config: %v\n", err)
		os.Exit(1)
	}

	// Ensure deterministic output by sorting keys
	var temp map[string]interface{}
	json.Unmarshal(output, &temp)

	// Sort signals map
	if signals, ok := temp["signals"].(map[string]interface{}); ok {
		keys := make([]string, 0, len(signals))
		for k := range signals {
			keys = append(keys, k)
		}
		sort.Strings(keys)
	}

	// Write to config file
	if err := os.WriteFile("config/signals.runtime.json", output, 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing runtime config: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Runtime config generated successfully: config/signals.runtime.json")
}
