package config

import (
	"encoding/json"
	"fmt"
	"os"
	"sync"
)

// SignalConfig represents runtime configuration for a signal
type SignalConfig struct {
	Severity      string `json:"severity,omitempty"`
	Deterministic bool   `json:"deterministic"`
	Type          string `json:"type"`
	Enabled       bool   `json:"enabled"`
	Reason        string `json:"reason,omitempty"` // Reason for disabled state (e.g., "tier_restricted")
}

// RuntimeConfig holds all runtime signal configurations
type RuntimeConfig struct {
	Signals    map[string]SignalConfig `json:"signals"`
	Thresholds map[string]interface{}  `json:"thresholds"`
	Tiers      map[string]interface{}  `json:"tiers"`
}

var (
	globalConfig *RuntimeConfig
	configMu     sync.RWMutex
	configLoaded bool
)

// LoadSignals loads the runtime signal configuration from file
func LoadSignals(configPath string) error {
	data, err := os.ReadFile(configPath)
	if err != nil {
		return fmt.Errorf("failed to read signal config: %w", err)
	}

	var cfg RuntimeConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return fmt.Errorf("failed to parse signal config: %w", err)
	}

	configMu.Lock()
	globalConfig = &cfg
	configLoaded = true
	configMu.Unlock()

	return nil
}

// GetSignalConfig returns the configuration for a specific signal ID
// Returns (config, true) if found, (zero-value, false) if not found
// O(1) lookup via map
func GetSignalConfig(id string) (SignalConfig, bool) {
	configMu.RLock()
	defer configMu.RUnlock()

	if !configLoaded || globalConfig == nil {
		return SignalConfig{}, false
	}

	cfg, ok := globalConfig.Signals[id]
	return cfg, ok
}

// IsSignalEnabled checks if a signal is enabled
func IsSignalEnabled(id string) bool {
	cfg, ok := GetSignalConfig(id)
	if !ok {
		return false
	}
	return cfg.Enabled
}

// GetAllSignals returns all signal configurations
func GetAllSignals() map[string]SignalConfig {
	configMu.RLock()
	defer configMu.RUnlock()

	if !configLoaded || globalConfig == nil {
		return make(map[string]SignalConfig)
	}

	// Return copy to prevent external modification
	signals := make(map[string]SignalConfig, len(globalConfig.Signals))
	for k, v := range globalConfig.Signals {
		signals[k] = v
	}
	return signals
}
