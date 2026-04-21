package tiers

import (
	"testing"
)

func TestTierRegistry_ExactMatch(t *testing.T) {
	registry := &TierRegistry{}
	cfg := TierConfig{
		Tiers: map[string][]string{
			"baseline": {"validation:schema_mismatch", "validation:required_field_missing"},
		},
	}

	if err := registry.compile(cfg); err != nil {
		t.Fatalf("failed to compile: %v", err)
	}

	// Test exact match
	if !registry.IsSignalAllowed("validation:schema_mismatch", TierBaseline) {
		t.Error("expected signal to be allowed")
	}

	// Test not allowed
	if registry.IsSignalAllowed("validation:unknown", TierBaseline) {
		t.Error("expected signal to be blocked")
	}
}

func TestTierRegistry_WildcardMatch(t *testing.T) {
	registry := &TierRegistry{}
	cfg := TierConfig{
		Tiers: map[string][]string{
			"proof": {"validation:*"},
		},
	}

	if err := registry.compile(cfg); err != nil {
		t.Fatalf("failed to compile: %v", err)
	}

	// Test wildcard match
	if !registry.IsSignalAllowed("validation:schema_mismatch", TierProof) {
		t.Error("expected signal to match wildcard")
	}

	if !registry.IsSignalAllowed("validation:required_field_missing", TierProof) {
		t.Error("expected signal to match wildcard")
	}

	// Test not matching
	if registry.IsSignalAllowed("integrity:checksum_fail", TierProof) {
		t.Error("expected signal to not match wildcard")
	}
}

func TestTierRegistry_GlobalWildcard(t *testing.T) {
	registry := &TierRegistry{}
	cfg := TierConfig{
		Tiers: map[string][]string{
			"fortress": {"*"},
		},
	}

	if err := registry.compile(cfg); err != nil {
		t.Fatalf("failed to compile: %v", err)
	}

	// Test global wildcard
	if !registry.IsSignalAllowed("validation:schema_mismatch", TierFortress) {
		t.Error("expected signal to match global wildcard")
	}

	if !registry.IsSignalAllowed("integrity:checksum_fail", TierFortress) {
		t.Error("expected signal to match global wildcard")
	}

	if !registry.IsSignalAllowed("any:signal:id", TierFortress) {
		t.Error("expected signal to match global wildcard")
	}
}

func TestTierRegistry_BlockedSignal(t *testing.T) {
	registry := &TierRegistry{}
	cfg := TierConfig{
		Tiers: map[string][]string{
			"baseline": {"validation:schema_mismatch"},
			"proof":    {"validation:*", "integrity:*"},
		},
	}

	if err := registry.compile(cfg); err != nil {
		t.Fatalf("failed to compile: %v", err)
	}

	// Free tier should not access integrity signals
	if registry.IsSignalAllowed("integrity:checksum_fail", TierBaseline) {
		t.Error("expected signal to be blocked for free tier")
	}

	// Proof tier should access integrity signals
	if !registry.IsSignalAllowed("integrity:checksum_fail", TierProof) {
		t.Error("expected signal to be allowed for proof tier")
	}
}

func TestTierRegistry_UnknownTier(t *testing.T) {
	registry := &TierRegistry{}
	cfg := TierConfig{
		Tiers: map[string][]string{
			"baseline": {"validation:schema_mismatch"},
		},
	}

	if err := registry.compile(cfg); err != nil {
		t.Fatalf("failed to compile: %v", err)
	}

	// Unknown tier should block all signals
	if registry.IsSignalAllowed("validation:schema_mismatch", "unknown") {
		t.Error("expected unknown tier to block signal")
	}
}

func TestTierRegistry_InvalidTier(t *testing.T) {
	registry := &TierRegistry{}
	cfg := TierConfig{
		Tiers: map[string][]string{
			"invalid_tier": {"validation:schema_mismatch"},
		},
	}

	err := registry.compile(cfg)
	if err == nil {
		t.Error("expected error for invalid tier")
	}
}

func TestTierRegistry_EmptyTier(t *testing.T) {
	registry := &TierRegistry{}
	cfg := TierConfig{
		Tiers: map[string][]string{
			"baseline": {},
		},
	}

	err := registry.compile(cfg)
	if err == nil {
		t.Error("expected error for empty tier")
	}
}

func TestResolveSignalAccess(t *testing.T) {
	registry := &TierRegistry{}
	cfg := TierConfig{
		Tiers: map[string][]string{
			"baseline": {"validation:schema_mismatch"},
		},
	}

	if err := registry.compile(cfg); err != nil {
		t.Fatalf("failed to compile: %v", err)
	}

	// Test allowed
	allowed, reason := registry.ResolveSignalAccess("validation:schema_mismatch", TierBaseline)
	if !allowed || reason != "allowed" {
		t.Errorf("expected allowed, got allowed=%v reason=%s", allowed, reason)
	}

	// Test blocked
	allowed, reason = registry.ResolveSignalAccess("integrity:checksum_fail", TierBaseline)
	if allowed || reason != "tier_restricted" {
		t.Errorf("expected tier_restricted, got allowed=%v reason=%s", allowed, reason)
	}

	// Test invalid tier
	allowed, reason = registry.ResolveSignalAccess("validation:schema_mismatch", "invalid")
	if allowed || reason != "invalid_tier" {
		t.Errorf("expected invalid_tier, got allowed=%v reason=%s", allowed, reason)
	}
}

func TestLoadTierRegistry(t *testing.T) {
	// Test loading from file
	registry, err := LoadTierRegistry("../../config/tiers.runtime.json")
	if err != nil {
		t.Fatalf("failed to load tier registry: %v", err)
	}

	if registry.TierCount() != 4 {
		t.Errorf("expected 4 tiers, got %d", registry.TierCount())
	}
}

// Benchmark tier resolution performance
func BenchmarkTierResolution_ExactMatch(b *testing.B) {
	registry := &TierRegistry{}
	cfg := TierConfig{
		Tiers: map[string][]string{
			"baseline": {"validation:schema_mismatch", "validation:required_field_missing"},
		},
	}
	registry.compile(cfg)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		registry.IsSignalAllowed("validation:schema_mismatch", TierBaseline)
	}
}

func BenchmarkTierResolution_WildcardMatch(b *testing.B) {
	registry := &TierRegistry{}
	cfg := TierConfig{
		Tiers: map[string][]string{
			"proof": {"validation:*", "integrity:*"},
		},
	}
	registry.compile(cfg)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		registry.IsSignalAllowed("validation:schema_mismatch", TierProof)
	}
}

func BenchmarkTierResolution_GlobalWildcard(b *testing.B) {
	registry := &TierRegistry{}
	cfg := TierConfig{
		Tiers: map[string][]string{
			"fortress": {"*"},
		},
	}
	registry.compile(cfg)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		registry.IsSignalAllowed("validation:schema_mismatch", TierFortress)
	}
}
