package archscanner

import (
	"testing"
)

func TestValidate(t *testing.T) {
	// Note: We use "." as rootDir for tests, assuming tests run in a context where files might exist or not.
	// For missing file test, we use a non-existent name.

	tests := []struct {
		name     string
		taxonomy *Taxonomy
		wantErrs int
	}{
		{
			name: "valid taxonomy",
			taxonomy: &Taxonomy{
				SchemaVersion: "1.0",
				Domains: []Domain{
					{Name: "Core", Layer: "core", Path: ".", DependsOn: []string{}},
				},
				Primitives: []Primitive{
					{Name: "P1", Layer: "Core", Determinism: "deterministic", File: "validator_test.go", Hash: ""},
				},
				Artifacts: []Artifact{
					{Name: "A1", Source: "P1 output", Schema: "{}"},
				},
			},
			wantErrs: 0,
		},
		{
			name: "missing file",
			taxonomy: &Taxonomy{
				SchemaVersion: "1.0",
				Domains: []Domain{
					{Name: "Core", Layer: "core"},
				},
				Primitives: []Primitive{
					{Name: "P1", Layer: "Core", Determinism: "deterministic", File: "non_existent.go"},
				},
				Artifacts: []Artifact{},
			},
			wantErrs: 1, // File missing error
		},
		{
			name: "directory as file",
			taxonomy: &Taxonomy{
				SchemaVersion: "1.0",
				Domains: []Domain{
					{Name: "Core", Layer: "core"},
				},
				Primitives: []Primitive{
					{Name: "P1", Layer: "Core", Determinism: "deterministic", File: "."},
				},
				Artifacts: []Artifact{},
			},
			wantErrs: 1, // Directory error
		},
		// Hash tests covered by VerifyPrimitiveHashes separately or implicitly if integrated into main Validate?
		// Main calls both. Unit test here tests Validate() function logic.
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			errs := Validate(tt.taxonomy, ".")
			if len(errs) != tt.wantErrs {
				t.Errorf("Validate() got %d errors, want %d", len(errs), tt.wantErrs)
			}
		})
	}
}
