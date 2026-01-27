package evidence_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"payment-node/internal/evidence"
)

func TestFixtures(t *testing.T) {
	wd, _ := os.Getwd()
	// Adjust path if running locally or inside internal/evidence
	fixturesDir := filepath.Join(wd, "fixtures")
	if _, err := os.Stat(fixturesDir); os.IsNotExist(err) {
		// Try relative to package if test run from package root
		fixturesDir = "fixtures"
	}

	tests := []struct {
		name        string
		filename    string
		expectValid bool
		expectVers  string
		check       func(*testing.T, *evidence.Envelope)
	}{
		{
			name:        "Golden OK",
			filename:    "ok.json",
			expectValid: true,
			expectVers:  "1.0",
			check: func(t *testing.T, env *evidence.Envelope) {
				if len(env.Payload.Merchants) == 0 {
					t.Error("expected merchants in ok fixture")
				}
				if len(env.Payload.Artifacts) == 0 {
					t.Error("expected artifacts in ok fixture")
				}
				if env.Meta.SourceStatus != "OK" {
					t.Errorf("expected sourceStatus OK, got %s", env.Meta.SourceStatus)
				}
				// Verify types
				m := env.Payload.Merchants[0]
				if m.Vol == "" || m.Baseline == "" {
					t.Error("expected Vol and Baseline to be non-empty strings")
				}
			},
		},
		{
			name:        "Degraded",
			filename:    "degraded.json",
			expectValid: true,
			expectVers:  "1.0",
			check: func(t *testing.T, env *evidence.Envelope) {
				if env.Meta.SourceStatus != "DEGRADED" {
					t.Errorf("expected sourceStatus DEGRADED, got %s", env.Meta.SourceStatus)
				}
				if len(env.Meta.Diagnostics) == 0 {
					t.Error("expected diagnostics in degraded fixture")
				}
			},
		},
		{
			name:        "Violation",
			filename:    "violation.json",
			expectValid: true, // It validates as JSON structure, but semantic version is wrong
			expectVers:  "0.9-alpha",
			check: func(t *testing.T, env *evidence.Envelope) {
				if env.SchemaVersion == "1.0" {
					t.Error("expected invalid schema version for violation test")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := os.ReadFile(filepath.Join(fixturesDir, tt.filename))
			if err != nil {
				t.Fatalf("failed to read fixture: %v", err)
			}

			var env evidence.Envelope
			if err := json.Unmarshal(data, &env); err != nil {
				t.Fatalf("failed to unmarshal fixture: %v", err)
			}

			if env.SchemaVersion != tt.expectVers {
				t.Errorf("schema version mismatch: expected %s, got %s", tt.expectVers, env.SchemaVersion)
			}

			if tt.check != nil {
				tt.check(t, &env)
			}
		})
	}
}
