package archscanner

import (
	"fmt"
)

func PrintReport(t *Taxonomy, errs []error) int {
	if len(errs) == 0 {
		fmt.Println("Architecture Scan Report")
		fmt.Println("------------------------")
		fmt.Printf("Domains: %d\n", len(t.Domains))
		fmt.Printf("Primitives: %d\n", len(t.Primitives))
		fmt.Printf("Artifacts: %d\n", len(t.Artifacts))
		fmt.Println("Dependency cycles: none")
		fmt.Println("Hash mismatches: none")
		fmt.Println("Status: PASS")
		fmt.Println("ARCHITECTURE CONTRACT: VERIFIED")
		return 0
	}

	fmt.Println("Status: FAIL")
	for _, err := range errs {
		fmt.Printf("Reason: %v\n", err)
	}
	return 1
}
