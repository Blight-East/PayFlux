package guardian

import (
	"math"
	"reflect"
	"testing"
)

func TestCheckInvariants_Strict(t *testing.T) {
	// Base valid inputs
	validMetrics := Metrics{ErrorRate: 0.01, P95: 0.2, MemoryMB: 128}
	validDecision := Decision{Status: "OK", Confidence: 0.9, Timestamp: "2026-02-16T20:00:00Z"}
	validScore := 0.5
	validAge := int64(3600)

	tests := []struct {
		name     string
		metrics  Metrics
		score    float64
		decision Decision
		age      int64
		want     bool
	}{
		{
			name:     "valid input → valid true",
			metrics:  validMetrics,
			score:    validScore,
			decision: validDecision,
			age:      validAge,
			want:     true,
		},
		{
			name:     "invalid score (Inf) → valid false",
			metrics:  validMetrics,
			score:    math.Inf(1),
			decision: validDecision,
			age:      validAge,
			want:     false,
		},
		{
			name:     "NaN score → valid false",
			metrics:  validMetrics,
			score:    math.NaN(),
			decision: validDecision,
			age:      validAge,
			want:     false,
		},
		{
			name:     "negative age → valid false",
			metrics:  validMetrics,
			score:    validScore,
			decision: validDecision,
			age:      -1,
			want:     false,
		},
		// "empty metrics" usually means zero values.
		// In Go, zero values for float64 are 0.0, which are non-negative and finite, thus valid.
		// If "empty" means "missing" in a way that causes issues (like NaNs), we test NaNs explicitly.
		// If the requirement means literally empty/zeroed struct:
		{
			name:     "empty metrics (zero values) → valid true",
			metrics:  Metrics{}, // 0, 0, 0
			score:    validScore,
			decision: validDecision,
			age:      validAge,
			want:     true, // 0 is finite and non-negative
		},
		{
			name:     "metrics with NaNs → valid false",
			metrics:  Metrics{ErrorRate: math.NaN(), P95: 0.1, MemoryMB: 100},
			score:    validScore,
			decision: validDecision,
			age:      validAge,
			want:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CheckInvariants(tt.metrics, tt.score, tt.decision, tt.age)
			if got.Valid != tt.want {
				t.Errorf("CheckInvariants() valid = %v, want %v (violations: %v)", got.Valid, tt.want, got.Violations)
			}
		})
	}
}

func TestCheckInvariants_Determinism(t *testing.T) {
	metrics := Metrics{ErrorRate: 0.05, P95: 0.5, MemoryMB: 256}
	decision := Decision{Status: "WARN", Confidence: 0.5, Timestamp: "2026-02-16T21:00:00Z"}
	score := 0.7
	age := int64(7200)

	run1 := CheckInvariants(metrics, score, decision, age)
	run2 := CheckInvariants(metrics, score, decision, age)

	if !reflect.DeepEqual(run1, run2) {
		t.Errorf("Determinism violation: run1 %v != run2 %v", run1, run2)
	}
}
