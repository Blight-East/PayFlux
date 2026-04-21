package guardian

import (
	"math"
	"time"
)

// InvariantReport captures the result of deterministic invariant validation.
type InvariantReport struct {
	Valid      bool     `json:"valid"`
	Violations []string `json:"violations,omitempty"`
}

// validStatuses is the exhaustive set of allowed decision statuses.
var validStatuses = map[string]bool{
	"OK":                   true,
	"WARN":                 true,
	"ALERT":                true,
	"CRITICAL":             true,
	"ROLLBACK_RECOMMENDED": true,
}

// CheckInvariants (InvariantValidator) validates that Guardian outputs are mathematically
// and logically valid. Pure function: same inputs → same report.
// O(1), no IO, no time.Now(), no randomness.
func CheckInvariants(
	m Metrics,
	score float64,
	decision Decision,
	age int64,
) InvariantReport {
	var violations []string

	// 1. Numeric sanity — reject NaN/Inf
	if math.IsNaN(score) || math.IsInf(score, 0) {
		violations = append(violations, "score_not_finite")
	}
	if math.IsNaN(decision.Confidence) || math.IsInf(decision.Confidence, 0) {
		violations = append(violations, "confidence_not_finite")
	}
	if math.IsNaN(m.ErrorRate) || math.IsInf(m.ErrorRate, 0) {
		violations = append(violations, "error_rate_not_finite")
	}
	if math.IsNaN(m.P95) || math.IsInf(m.P95, 0) {
		violations = append(violations, "p95_not_finite")
	}
	if math.IsNaN(m.MemoryMB) || math.IsInf(m.MemoryMB, 0) {
		violations = append(violations, "memory_not_finite")
	}

	// 2. Confidence bounds: 0 ≤ confidence ≤ 1
	if decision.Confidence < 0 || decision.Confidence > 1 {
		violations = append(violations, "confidence_out_of_range")
	}

	// 3. Score non-negativity
	if score < 0 {
		violations = append(violations, "score_negative")
	}

	// 4. Deploy age validity
	if age < 0 {
		violations = append(violations, "deploy_age_negative")
	}

	// 5. Metric domain rules
	if m.ErrorRate < 0 {
		violations = append(violations, "error_rate_negative")
	}
	if m.P95 < 0 {
		violations = append(violations, "p95_negative")
	}
	if m.MemoryMB < 0 {
		violations = append(violations, "memory_negative")
	}

	// 6. Status validity
	if !validStatuses[decision.Status] {
		violations = append(violations, "status_invalid")
	}

	// 7. Timestamp RFC3339 format check
	if _, err := time.Parse(time.RFC3339, decision.Timestamp); err != nil {
		violations = append(violations, "timestamp_invalid_format")
	}

	if len(violations) == 0 {
		return InvariantReport{Valid: true}
	}
	return InvariantReport{
		Valid:      false,
		Violations: violations,
	}
}
