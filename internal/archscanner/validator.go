package archscanner

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func Validate(t *Taxonomy, rootDir string) []error {
	var errs []error

	// Custom: Schema Version Check
	if t.SchemaVersion != "1.0" {
		errs = append(errs, fmt.Errorf("schema_version mismatch: expected '1.0', got %q", t.SchemaVersion))
	}

	// Helper maps
	domainNames := make(map[string]bool)
	for _, d := range t.Domains {
		domainNames[d.Name] = true
	}
	primitiveNames := make(map[string]bool)
	for _, p := range t.Primitives {
		primitiveNames[p.Name] = true
	}

	// 1. Layer Validity Check (Primitive.Layer -> Domain.Name)
	for _, p := range t.Primitives {
		if !domainNames[p.Layer] {
			errs = append(errs, fmt.Errorf("primitive %q references unknown layer/domain %q", p.Name, p.Layer))
		}

		// 6. Determinism Contract Check
		switch p.Determinism {
		case "deterministic", "conditional", "time_deterministic", "non_deterministic":
			// valid
		default:
			errs = append(errs, fmt.Errorf("primitive %q has invalid determinism value %q", p.Name, p.Determinism))
		}

		// 7. File Existence Check
		if p.File != "" {
			fullPath := filepath.Join(rootDir, p.File)
			info, err := os.Stat(fullPath)
			if err != nil {
				if os.IsNotExist(err) {
					errs = append(errs, fmt.Errorf("primitive %q references missing file %q", p.Name, p.File))
				} else {
					errs = append(errs, fmt.Errorf("primitive %q file check error: %v", p.Name, err))
				}
			} else if info.IsDir() {
				errs = append(errs, fmt.Errorf("primitive %q file %q is a directory, must be a file", p.Name, p.File))
			}
		}
	}

	// 5. Artifact Source Validation (Artifact.Source references existing primitive name)
	for _, a := range t.Artifacts {
		found := false
		for pName := range primitiveNames {
			if strings.Contains(a.Source, pName) {
				found = true
				break
			}
		}

		if !found {
			errs = append(errs, fmt.Errorf("artifact %q source %q does not reference a known primitive", a.Name, a.Source))
		}
	}

	return errs
}
