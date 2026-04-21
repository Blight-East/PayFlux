package config

import (
	"testing"
	"time"
)

func TestOverrideDisablesSignal(t *testing.T) {
	// Setup
	store := NewOverrideStore()
	SetGlobalOverrideStore(store)
	defer SetGlobalOverrideStore(nil)

	// Load test config
	if err := LoadSignals("../../config/signals.runtime.json"); err != nil {
		t.Fatalf("Failed to load signals: %v", err)
	}

	signalID := "sig_001_auth_missing_bearer"

	// Get original config
	originalCfg := GetEffectiveSignalConfig(signalID)

	// Set override to disable
	disabled := false
	store.SetOverride(signalID, SignalOverride{
		Enabled: &disabled,
	})

	// Get effective config
	effectiveCfg := GetEffectiveSignalConfig(signalID)

	// Verify disabled
	if effectiveCfg.Enabled {
		t.Errorf("Expected signal to be disabled, got enabled=true")
	}

	// Verify other fields unchanged
	if effectiveCfg.Type != originalCfg.Type {
		t.Errorf("Type changed unexpectedly: %s -> %s", originalCfg.Type, effectiveCfg.Type)
	}
}

func TestOverrideSeverity(t *testing.T) {
	// Setup
	store := NewOverrideStore()
	SetGlobalOverrideStore(store)
	defer SetGlobalOverrideStore(nil)

	if err := LoadSignals("../../config/signals.runtime.json"); err != nil {
		t.Fatalf("Failed to load signals: %v", err)
	}

	signalID := "sig_013_risk_band_critical"

	// Set override severity
	newSeverity := "warning"
	store.SetOverride(signalID, SignalOverride{
		Severity: &newSeverity,
	})

	// Get effective config
	effectiveCfg := GetEffectiveSignalConfig(signalID)

	// Verify severity changed
	if effectiveCfg.Severity != newSeverity {
		t.Errorf("Expected severity=%s, got %s", newSeverity, effectiveCfg.Severity)
	}
}

func TestDeleteRestoresOriginal(t *testing.T) {
	// Setup
	store := NewOverrideStore()
	SetGlobalOverrideStore(store)
	defer SetGlobalOverrideStore(nil)

	if err := LoadSignals("../../config/signals.runtime.json"); err != nil {
		t.Fatalf("Failed to load signals: %v", err)
	}

	signalID := "sig_001_auth_missing_bearer"

	// Get original config
	originalCfg := GetEffectiveSignalConfig(signalID)

	// Set override
	disabled := false
	store.SetOverride(signalID, SignalOverride{
		Enabled: &disabled,
	})

	// Verify override applied
	overriddenCfg := GetEffectiveSignalConfig(signalID)
	if overriddenCfg.Enabled {
		t.Fatalf("Override not applied")
	}

	// Delete override
	store.DeleteOverride(signalID)

	// Get config after delete
	restoredCfg := GetEffectiveSignalConfig(signalID)

	// Verify restored to original
	if restoredCfg.Enabled != originalCfg.Enabled {
		t.Errorf("Enabled not restored: original=%v, restored=%v", originalCfg.Enabled, restoredCfg.Enabled)
	}
}

func TestConcurrentReads(t *testing.T) {
	// Setup
	store := NewOverrideStore()
	SetGlobalOverrideStore(store)
	defer SetGlobalOverrideStore(nil)

	if err := LoadSignals("../../config/signals.runtime.json"); err != nil {
		t.Fatalf("Failed to load signals: %v", err)
	}

	signalID := "sig_001_auth_missing_bearer"

	// Set an override
	disabled := false
	store.SetOverride(signalID, SignalOverride{
		Enabled: &disabled,
	})

	// Concurrent reads
	done := make(chan bool)
	for i := 0; i < 100; i++ {
		go func() {
			cfg := GetEffectiveSignalConfig(signalID)
			if cfg.Enabled {
				t.Errorf("Expected disabled during concurrent read")
			}
			done <- true
		}()
	}

	// Wait for all goroutines
	for i := 0; i < 100; i++ {
		<-done
	}
}

func TestConcurrentWrites(t *testing.T) {
	// Setup
	store := NewOverrideStore()
	SetGlobalOverrideStore(store)
	defer SetGlobalOverrideStore(nil)

	if err := LoadSignals("../../config/signals.runtime.json"); err != nil {
		t.Fatalf("Failed to load signals: %v", err)
	}

	// Concurrent writes to different signals
	done := make(chan bool)
	for i := 0; i < 10; i++ {
		signalID := "sig_001_auth_missing_bearer"
		go func(id string, idx int) {
			enabled := idx%2 == 0
			store.SetOverride(id, SignalOverride{
				Enabled: &enabled,
			})
			done <- true
		}(signalID, i)
	}

	// Wait for all goroutines
	for i := 0; i < 10; i++ {
		<-done
	}

	// Verify final state is consistent (no corruption)
	cfg := GetEffectiveSignalConfig("sig_001_auth_missing_bearer")

	// Just verify we can read it without panic
	_ = cfg.Enabled
}

func BenchmarkGetEffectiveSignalConfig(b *testing.B) {
	// Setup
	store := NewOverrideStore()
	SetGlobalOverrideStore(store)
	defer SetGlobalOverrideStore(nil)

	if err := LoadSignals("../../config/signals.runtime.json"); err != nil {
		b.Fatalf("Failed to load signals: %v", err)
	}

	signalID := "sig_001_auth_missing_bearer"

	// Set an override
	disabled := false
	store.SetOverride(signalID, SignalOverride{
		Enabled: &disabled,
	})

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		_ = GetEffectiveSignalConfig(signalID)
	}
}

func TestOverrideStore(t *testing.T) {
	store := NewOverrideStore()

	// Test set and get
	enabled := true
	severity := "critical"
	threshold := 0.9

	override := SignalOverride{
		Enabled:   &enabled,
		Severity:  &severity,
		Threshold: &threshold,
	}

	store.SetOverride("test_signal", override)

	// Get override
	retrieved, _ := store.GetOverride("test_signal")

	if *retrieved.Enabled != enabled {
		t.Errorf("Enabled mismatch: got %v, want %v", *retrieved.Enabled, enabled)
	}

	if *retrieved.Severity != severity {
		t.Errorf("Severity mismatch: got %s, want %s", *retrieved.Severity, severity)
	}

	if *retrieved.Threshold != threshold {
		t.Errorf("Threshold mismatch: got %f, want %f", *retrieved.Threshold, threshold)
	}

	// Test UpdatedAt is set
	if retrieved.UpdatedAt == 0 {
		t.Error("UpdatedAt not set")
	}

	// Test list
	overrides := store.ListOverrides()
	if len(overrides) != 1 {
		t.Errorf("Expected 1 override, got %d", len(overrides))
	}

	// Test delete
	store.DeleteOverride("test_signal")
	_, exists := store.GetOverride("test_signal")
	if exists {
		t.Error("Override should be deleted")
	}

	// Test delete non-existent (should not panic)
	store.DeleteOverride("non_existent")
}

func TestOverrideTimestamp(t *testing.T) {
	store := NewOverrideStore()

	enabled := true
	override := SignalOverride{
		Enabled: &enabled,
	}

	before := time.Now().Unix()
	store.SetOverride("test_signal", override)
	after := time.Now().Unix()

	retrieved, _ := store.GetOverride("test_signal")

	if retrieved.UpdatedAt < before || retrieved.UpdatedAt > after {
		t.Errorf("UpdatedAt out of range: %d not in [%d, %d]", retrieved.UpdatedAt, before, after)
	}
}
