package main

import (
	"flag"
	"fmt"
	"os"

	"payment-node/internal/archscanner"
)

func main() {
	quiet := flag.Bool("quiet", false, "suppress output, exit code only")
	taxonomyPath := flag.String("taxonomy", "docs/SYSTEM_TAXONOMY.json", "path to taxonomy JSON")
	// schemaPath is unused by static scanner but kept for compatibility
	_ = flag.String("schema", "docs/system_taxonomy.schema.json", "path to schema JSON")
	flag.Parse()

	t, err := archscanner.LoadTaxonomy(*taxonomyPath)
	if err != nil {
		if !*quiet {
			fmt.Fprintf(os.Stderr, "Error loading taxonomy: %v\n", err)
		}
		os.Exit(1)
	}

	rootDir := "."
	errs := archscanner.Validate(t, rootDir)
	if err := archscanner.DetectCycles(t.Domains); err != nil {
		errs = append(errs, err)
	}

	// Hash verification uses strict file mapping
	hashErrs := archscanner.VerifyPrimitiveHashes(t.Primitives, rootDir)
	errs = append(errs, hashErrs...)

	if *quiet {
		if len(errs) > 0 {
			os.Exit(1)
		}
		os.Exit(0)
	}

	os.Exit(archscanner.PrintReport(t, errs))
}
