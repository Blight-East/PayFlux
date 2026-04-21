package entitlements

import (
	"os"
	"testing"
)

func TestLoadEntitlementsRegistry(t *testing.T) {
	registry, err := LoadEntitlementsRegistry("../../config/tier_entitlements.runtime.json")
	if err != nil {
		t.Fatalf("failed to load entitlements registry: %v", err)
	}

	tiers := registry.GetAllTiers()
	if len(tiers) != 4 {
		t.Errorf("expected 4 tiers, got %d", len(tiers))
	}
}

func TestGetEntitlements_ValidTiers(t *testing.T) {
	registry, err := LoadEntitlementsRegistry("../../config/tier_entitlements.runtime.json")
	if err != nil {
		t.Fatalf("failed to load entitlements registry: %v", err)
	}

	tests := []struct {
		tier                 string
		expectedRetention    int
		expectedSLA          int
		expectedAlertRouting bool
	}{
		{"baseline", 7, 5000, false},
		{"proof", 30, 2000, true},
		{"shield", 90, 1000, true},
		{"fortress", 365, 500, true},
	}

	for _, tc := range tests {
		t.Run(tc.tier, func(t *testing.T) {
			ent, err := registry.GetEntitlements(tc.tier)
			if err != nil {
				t.Errorf("unexpected error for tier %s: %v", tc.tier, err)
			}

			if ent.RetentionDays != tc.expectedRetention {
				t.Errorf("tier %s: expected retention %d, got %d", tc.tier, tc.expectedRetention, ent.RetentionDays)
			}

			if ent.SLAResponseTimeMs != tc.expectedSLA {
				t.Errorf("tier %s: expected SLA %d, got %d", tc.tier, tc.expectedSLA, ent.SLAResponseTimeMs)
			}

			if ent.AlertRoutingEnabled != tc.expectedAlertRouting {
				t.Errorf("tier %s: expected alert routing %v, got %v", tc.tier, tc.expectedAlertRouting, ent.AlertRoutingEnabled)
			}
		})
	}
}

func TestGetEntitlements_UnknownTier(t *testing.T) {
	registry, err := LoadEntitlementsRegistry("../../config/tier_entitlements.runtime.json")
	if err != nil {
		t.Fatalf("failed to load entitlements registry: %v", err)
	}

	ent, err := registry.GetEntitlements("unknown")
	if err == nil {
		t.Error("expected error for unknown tier")
	}

	// Verify fail-closed behavior
	if ent.RetentionDays != 1 {
		t.Errorf("fail-closed retention should be 1, got %d", ent.RetentionDays)
	}

	if ent.AlertRoutingEnabled {
		t.Error("fail-closed alert routing should be false")
	}

	if ent.SLAResponseTimeMs != 30000 {
		t.Errorf("fail-closed SLA should be 30000, got %d", ent.SLAResponseTimeMs)
	}
}

func TestValidateEntitlements(t *testing.T) {
	tests := []struct {
		name        string
		tier        string
		ent         Entitlements
		expectError bool
	}{
		{
			name: "valid entitlements",
			tier: "test",
			ent: Entitlements{
				RetentionDays:         30,
				AlertRoutingEnabled:   true,
				SLAResponseTimeMs:     1000,
				MaxConcurrentRequests: 100,
				ExportFormats:         []string{"json", "csv"},
			},
			expectError: false,
		},
		{
			name: "invalid retention - too low",
			tier: "test",
			ent: Entitlements{
				RetentionDays:         0,
				AlertRoutingEnabled:   true,
				SLAResponseTimeMs:     1000,
				MaxConcurrentRequests: 100,
				ExportFormats:         []string{"json"},
			},
			expectError: true,
		},
		{
			name: "invalid SLA - too low",
			tier: "test",
			ent: Entitlements{
				RetentionDays:         30,
				AlertRoutingEnabled:   true,
				SLAResponseTimeMs:     50,
				MaxConcurrentRequests: 100,
				ExportFormats:         []string{"json"},
			},
			expectError: true,
		},
		{
			name: "invalid export formats - empty",
			tier: "test",
			ent: Entitlements{
				RetentionDays:         30,
				AlertRoutingEnabled:   true,
				SLAResponseTimeMs:     1000,
				MaxConcurrentRequests: 100,
				ExportFormats:         []string{},
			},
			expectError: true,
		},
		{
			name: "invalid export format - unknown",
			tier: "test",
			ent: Entitlements{
				RetentionDays:         30,
				AlertRoutingEnabled:   true,
				SLAResponseTimeMs:     1000,
				MaxConcurrentRequests: 100,
				ExportFormats:         []string{"xml"},
			},
			expectError: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := validateEntitlements(tc.tier, tc.ent)
			if tc.expectError && err == nil {
				t.Error("expected error but got none")
			}
			if !tc.expectError && err != nil {
				t.Errorf("unexpected error: %v", err)
			}
		})
	}
}

func TestLoadEntitlementsRegistry_MissingTier(t *testing.T) {
	// Create temporary config with missing tier
	tmpfile, err := os.CreateTemp("", "entitlements-*.json")
	if err != nil {
		t.Fatal(err)
	}
	defer os.Remove(tmpfile.Name())

	config := `{
		"entitlements": {
			"baseline": {
				"retention_days": 7,
				"alert_routing_enabled": false,
				"sla_response_time_ms": 5000,
				"max_concurrent_requests": 10,
				"export_formats": ["json"]
			}
		}
	}`

	if _, err := tmpfile.Write([]byte(config)); err != nil {
		t.Fatal(err)
	}
	tmpfile.Close()

	_, err = LoadEntitlementsRegistry(tmpfile.Name())
	if err == nil {
		t.Error("expected error for missing required tier")
	}
}

func BenchmarkGetEntitlements(b *testing.B) {
	registry, err := LoadEntitlementsRegistry("../../config/tier_entitlements.runtime.json")
	if err != nil {
		b.Fatalf("failed to load entitlements registry: %v", err)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = registry.GetEntitlements("proof")
	}
}

func BenchmarkGetEntitlements_Parallel(b *testing.B) {
	registry, err := LoadEntitlementsRegistry("../../config/tier_entitlements.runtime.json")
	if err != nil {
		b.Fatalf("failed to load entitlements registry: %v", err)
	}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			_, _ = registry.GetEntitlements("shield")
		}
	})
}
