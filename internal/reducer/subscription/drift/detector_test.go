package drift

import (
	"testing"
	"time"

	"payment-node/internal/reducer/subscription"
	"payment-node/internal/reducer/subscription/authority"
)

func ts(year int, month time.Month, day int) *time.Time {
	t := time.Date(year, month, day, 12, 0, 0, 0, time.UTC)
	return &t
}

func tsAt(year int, month time.Month, day, hour, minute, second int) *time.Time {
	t := time.Date(year, month, day, hour, minute, second, 0, time.UTC)
	return &t
}

func basicProjection(status string) *subscription.State {
	return &subscription.State{
		StripeSubscriptionID: "sub_test",
		WorkspaceID:          "ws_test",
		Status:               status,
		CurrentPeriodStart:   ts(2026, 5, 1),
		CurrentPeriodEnd:     ts(2026, 6, 1),
		CancelAtPeriodEnd:    false,
	}
}

func basicAuthority(status string) *authority.State {
	return &authority.State{
		StripeSubscriptionID: "sub_test",
		Status:               status,
		CurrentPeriodStart:   ts(2026, 5, 1),
		CurrentPeriodEnd:     ts(2026, 6, 1),
		CancelAtPeriodEnd:    false,
		ProviderName:         "billing_subscriptions",
		ProviderVersion:      "v1",
	}
}

// TestComparison_Agreement verifies that identical states produce
// Agreed=true with no disagreeing fields.
func TestComparison_Agreement(t *testing.T) {
	p := basicProjection("active")
	a := basicAuthority("active")

	c := compare(p, a)
	if !c.Agreed {
		t.Fatalf("expected agreement; got disagreement on %v", c.DisagreeingFields)
	}
	if len(c.DisagreeingFields) != 0 {
		t.Fatalf("expected no disagreeing fields; got %v", c.DisagreeingFields)
	}
}

// TestComparison_StatusDisagreement verifies that status drift produces
// drift_major + critical.
func TestComparison_StatusDisagreement(t *testing.T) {
	p := basicProjection("active")
	a := basicAuthority("canceled")

	c := compare(p, a)
	if c.Agreed {
		t.Fatal("expected disagreement")
	}
	if !contains(c.DisagreeingFields, "status") {
		t.Fatalf("expected status in disagreeing fields; got %v", c.DisagreeingFields)
	}
	if ClassifyEventType(c) != EventDriftMajor {
		t.Fatalf("expected drift_major; got %s", ClassifyEventType(c))
	}
	if ClassifySeverity(c) != SeverityCritical {
		t.Fatalf("expected critical severity; got %s", ClassifySeverity(c))
	}
}

// TestComparison_TimestampWithinTolerance verifies that small clock
// skews are treated as agreement.
func TestComparison_TimestampWithinTolerance(t *testing.T) {
	p := basicProjection("active")
	a := basicAuthority("active")
	// Project's period end is 1 second later than authority's. Within
	// the 5-second tolerance.
	a.CurrentPeriodEnd = tsAt(2026, 6, 1, 12, 0, 1)

	c := compare(p, a)
	if !c.Agreed {
		t.Fatalf("expected agreement within tolerance; got %v", c.DisagreeingFields)
	}
}

// TestComparison_TimestampBeyondTolerance verifies that meaningful clock
// drift is recorded as drift_minor + warning.
func TestComparison_TimestampBeyondTolerance(t *testing.T) {
	p := basicProjection("active")
	a := basicAuthority("active")
	// Project's period end is 1 minute later than authority's. Beyond
	// tolerance.
	a.CurrentPeriodEnd = tsAt(2026, 6, 1, 12, 1, 0)

	c := compare(p, a)
	if c.Agreed {
		t.Fatal("expected disagreement beyond tolerance")
	}
	if !contains(c.DisagreeingFields, "current_period_end") {
		t.Fatalf("expected current_period_end in disagreeing fields; got %v", c.DisagreeingFields)
	}
	if ClassifyEventType(c) != EventDriftMinor {
		t.Fatalf("expected drift_minor (no critical-severity fields); got %s", ClassifyEventType(c))
	}
	if ClassifySeverity(c) != SeverityWarning {
		t.Fatalf("expected warning severity; got %s", ClassifySeverity(c))
	}
}

// TestComparison_ProjectionImpossible verifies that a projection holding
// an invalid Stripe status produces projection_impossible + regulatory.
func TestComparison_ProjectionImpossible(t *testing.T) {
	p := basicProjection("totally_made_up_status")
	a := basicAuthority("active")

	c := compare(p, a)
	if !c.ProjectionImpossible {
		t.Fatal("expected projection_impossible flag")
	}
	if ClassifyEventType(c) != EventProjectionImpossible {
		t.Fatalf("expected projection_impossible event type; got %s", ClassifyEventType(c))
	}
	if ClassifySeverity(c) != SeverityRegulatory {
		t.Fatalf("expected regulatory severity; got %s", ClassifySeverity(c))
	}
}

// TestComparison_NilAuthorityTimestampDisagrees verifies that a nil
// authoritative timestamp paired with a non-nil projection timestamp
// produces disagreement.
func TestComparison_NilAuthorityTimestampDisagrees(t *testing.T) {
	p := basicProjection("active")
	a := basicAuthority("active")
	a.CurrentPeriodEnd = nil

	c := compare(p, a)
	if c.Agreed {
		t.Fatal("expected disagreement (nil vs set)")
	}
	if !contains(c.DisagreeingFields, "current_period_end") {
		t.Fatalf("expected current_period_end disagreement; got %v", c.DisagreeingFields)
	}
}

// TestSeverityRanking_CriticalDominatesWarning verifies that when both
// critical and warning-severity fields disagree, the resulting severity
// is critical.
func TestSeverityRanking_CriticalDominatesWarning(t *testing.T) {
	c := Comparison{
		Agreed:            false,
		DisagreeingFields: []string{"current_period_end", "status"}, // warning + critical
	}
	if ClassifySeverity(c) != SeverityCritical {
		t.Fatalf("expected critical (worst across fields); got %s", ClassifySeverity(c))
	}
}

// TestClassifyEventType_MajorWhenCriticalFieldDisagrees verifies that any
// critical-severity field disagreement produces drift_major.
func TestClassifyEventType_MajorWhenCriticalFieldDisagrees(t *testing.T) {
	c := Comparison{
		Agreed:            false,
		DisagreeingFields: []string{"cancel_at_period_end"},
	}
	if ClassifyEventType(c) != EventDriftMajor {
		t.Fatalf("expected drift_major; got %s", ClassifyEventType(c))
	}
}

// TestClassifyEventType_MinorWhenOnlyWarningFieldDisagrees verifies that
// only warning-severity disagreements produce drift_minor.
func TestClassifyEventType_MinorWhenOnlyWarningFieldDisagrees(t *testing.T) {
	c := Comparison{
		Agreed:            false,
		DisagreeingFields: []string{"trial_end"},
	}
	if ClassifyEventType(c) != EventDriftMinor {
		t.Fatalf("expected drift_minor; got %s", ClassifyEventType(c))
	}
}

func contains(s []string, v string) bool {
	for _, e := range s {
		if e == v {
			return true
		}
	}
	return false
}
