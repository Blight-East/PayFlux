package main

import (
	"encoding/json"
	"fmt"
	"payment-node/internal/tiers"
)

func main() {
	// Load tier registry
	registry, err := tiers.LoadTierRegistry("config/tiers.runtime.json")
	if err != nil {
		fmt.Printf("ERROR: Failed to load tier registry: %v\n", err)
		return
	}

	// Test cases
	tests := []struct {
		tier     tiers.Tier
		signal   string
		expected bool
	}{
		{tiers.TierBaseline, "sig_014_anomaly_high_failure_rate", false}, // baseline: only sig_001, sig_002
		{tiers.TierProof, "sig_014_anomaly_high_failure_rate", true},     // proof: sig_*
		{tiers.TierShield, "sig_014_anomaly_high_failure_rate", true},    // shield: sig_*
		{tiers.TierFortress, "sig_014_anomaly_high_failure_rate", true},  // fortress: *
		{"invalid", "sig_014_anomaly_high_failure_rate", false},          // invalid tier
		{tiers.TierBaseline, "sig_001_auth_missing_bearer", true},        // baseline: exact match
		{tiers.TierBaseline, "sig_002_auth_revoked_key", true},           // baseline: exact match
		{"free", "sig_001_auth_missing_bearer", true},                    // backward compat
	}

	results := make([]map[string]interface{}, 0)

	for _, tc := range tests {
		allowed, reason := registry.ResolveSignalAccess(tc.signal, tc.tier)

		result := map[string]interface{}{
			"tier":     string(tc.tier),
			"signal":   tc.signal,
			"allowed":  allowed,
			"reason":   reason,
			"expected": tc.expected,
			"pass":     allowed == tc.expected,
		}
		results = append(results, result)

		status := "✅ PASS"
		if allowed != tc.expected {
			status = "❌ FAIL"
		}
		fmt.Printf("%s | tier=%s signal=%s allowed=%v reason=%s\n",
			status, tc.tier, tc.signal, allowed, reason)
	}

	// Summary
	passed := 0
	for _, r := range results {
		if r["pass"].(bool) {
			passed++
		}
	}

	fmt.Printf("\n=== SUMMARY ===\n")
	fmt.Printf("Total: %d\n", len(results))
	fmt.Printf("Passed: %d\n", passed)
	fmt.Printf("Failed: %d\n", len(results)-passed)

	if passed == len(results) {
		fmt.Println("\n✅ ALL TESTS PASSED")
	} else {
		fmt.Println("\n❌ SOME TESTS FAILED")
	}

	// JSON output
	jsonOut, _ := json.MarshalIndent(results, "", "  ")
	fmt.Printf("\n=== JSON OUTPUT ===\n%s\n", jsonOut)
}
