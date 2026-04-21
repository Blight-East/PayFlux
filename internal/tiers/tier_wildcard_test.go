package tiers

import (
	"testing"
)

func TestPrefixWildcardMatch(t *testing.T) {
	registry := &TierRegistry{}
	cfg := TierConfig{
		Tiers: map[string][]string{
			"proof": {"sig_*"},
		},
	}

	if err := registry.compile(cfg); err != nil {
		t.Fatalf("failed to compile: %v", err)
	}

	// Test prefix match success
	tests := []struct {
		signal   string
		expected bool
	}{
		{"sig_001_auth_missing_bearer", true},
		{"sig_014_anomaly_high_failure_rate", true},
		{"sig_999_test", true},
		{"validation:schema_mismatch", false}, // Different prefix
		{"integrity:checksum_fail", false},    // Different prefix
		{"sig", false},                        // Exact "sig" without underscore
	}

	for _, tc := range tests {
		allowed := registry.IsSignalAllowed(tc.signal, TierProof)
		if allowed != tc.expected {
			t.Errorf("signal=%s: expected %v, got %v", tc.signal, tc.expected, allowed)
		}
	}
}

func TestCategoryWildcardMatch(t *testing.T) {
	registry := &TierRegistry{}
	cfg := TierConfig{
		Tiers: map[string][]string{
			"proof": {"validation:*"},
		},
	}

	if err := registry.compile(cfg); err != nil {
		t.Fatalf("failed to compile: %v", err)
	}

	// Test category wildcard
	tests := []struct {
		signal   string
		expected bool
	}{
		{"validation:schema_mismatch", true},
		{"validation:required_field_missing", true},
		{"integrity:checksum_fail", false},
		{"sig_001_auth_missing_bearer", false},
	}

	for _, tc := range tests {
		allowed := registry.IsSignalAllowed(tc.signal, TierProof)
		if allowed != tc.expected {
			t.Errorf("signal=%s: expected %v, got %v", tc.signal, tc.expected, allowed)
		}
	}
}

func TestMixedWildcardPatterns(t *testing.T) {
	registry := &TierRegistry{}
	cfg := TierConfig{
		Tiers: map[string][]string{
			"proof": {"sig_*", "validation:*", "exact_signal_id"},
		},
	}

	if err := registry.compile(cfg); err != nil {
		t.Fatalf("failed to compile: %v", err)
	}

	tests := []struct {
		signal   string
		expected bool
	}{
		// Prefix wildcard matches
		{"sig_001_auth_missing_bearer", true},
		{"sig_999_test", true},
		// Category wildcard matches
		{"validation:schema_mismatch", true},
		{"validation:test", true},
		// Exact match
		{"exact_signal_id", true},
		// No matches
		{"integrity:checksum_fail", false},
		{"other_prefix_test", false},
	}

	for _, tc := range tests {
		allowed := registry.IsSignalAllowed(tc.signal, TierProof)
		if allowed != tc.expected {
			t.Errorf("signal=%s: expected %v, got %v", tc.signal, tc.expected, allowed)
		}
	}
}
