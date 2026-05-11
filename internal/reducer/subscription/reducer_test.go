package subscription

import (
	"fmt"
	"testing"
	"time"

	"payment-node/internal/reducer/rac"
)

// racAdapter wraps the package's pure merge function into the
// rac.Reducer[State, *Event] interface. The adapter fixes the EventSource
// to webhook (the only source the v1 reducer consumes) and drops conflicts
// — RAC assertions concern the projection chain, not operational
// observations. Conflict generation is tested separately below.
type racAdapter struct{}

func (racAdapter) Merge(current *State, event *Event) *State {
	result := Merge(current, event, EventSourceWebhook)
	if result.Skipped {
		return nil
	}
	return result.Next
}

// Equal compares two states for the fields that comprise the final
// interpretation. Ignores FieldAuthority and EventOccurredAt — those are
// per-event provenance, not part of the converged final state.
//
// We DO compare the interpreted fields strictly. Two reducer runs that
// produce different status values are not equal.
func (racAdapter) Equal(a, b *State) bool {
	if a == nil || b == nil {
		return a == b
	}
	return a.StripeSubscriptionID == b.StripeSubscriptionID &&
		a.WorkspaceID == b.WorkspaceID &&
		a.Status == b.Status &&
		timePtrEqual(a.CurrentPeriodStart, b.CurrentPeriodStart) &&
		timePtrEqual(a.CurrentPeriodEnd, b.CurrentPeriodEnd) &&
		a.CancelAtPeriodEnd == b.CancelAtPeriodEnd &&
		timePtrEqual(a.CanceledAt, b.CanceledAt) &&
		timePtrEqual(a.TrialStart, b.TrialStart) &&
		timePtrEqual(a.TrialEnd, b.TrialEnd)
}

func (racAdapter) Describe(s *State) string {
	if s == nil {
		return "<nil>"
	}
	return fmt.Sprintf("State{sub=%s status=%s period=[%v,%v] cancel_at_period_end=%v occurred=%v}",
		s.StripeSubscriptionID, s.Status,
		s.CurrentPeriodStart, s.CurrentPeriodEnd,
		s.CancelAtPeriodEnd, s.EventOccurredAt)
}

func timePtrEqual(a, b *time.Time) bool {
	if a == nil || b == nil {
		return a == b
	}
	return a.Equal(*b)
}

// fixtureEvent builds a synthetic Event for a subscription at a given
// occurred-at, with the given status. Used by the RAC tests; isolates
// fixture-construction noise from property assertions.
func fixtureEvent(subID, status string, occurredAt time.Time, periodEnd time.Time) *Event {
	periodStart := periodEnd.AddDate(0, -1, 0)
	return &Event{
		LedgerEventID:          fmt.Sprintf("ledger_%s_%d", status, occurredAt.Unix()),
		SourceEventID:          fmt.Sprintf("evt_%s_%d", status, occurredAt.Unix()),
		SourceIngestionVersion: "test-ingestion",
		EventType:              "customer.subscription.updated",
		OccurredAt:             occurredAt.UTC(),
		WorkspaceID:            "ws-fixture",
		Subscription: &StripeSubscription{
			ID:                 subID,
			Status:             status,
			CurrentPeriodStart: periodStart.Unix(),
			CurrentPeriodEnd:   periodEnd.Unix(),
			CancelAtPeriodEnd:  false,
		},
	}
}

// canceledFixtureEvent is for terminal-state events.
func canceledFixtureEvent(subID string, occurredAt, canceledAt time.Time) *Event {
	periodEnd := occurredAt.AddDate(0, 1, 0)
	canceledUnix := canceledAt.Unix()
	periodStart := occurredAt.AddDate(0, -1, 0)
	return &Event{
		LedgerEventID:          fmt.Sprintf("ledger_canceled_%d", occurredAt.Unix()),
		SourceEventID:          fmt.Sprintf("evt_canceled_%d", occurredAt.Unix()),
		SourceIngestionVersion: "test-ingestion",
		EventType:              "customer.subscription.deleted",
		OccurredAt:             occurredAt.UTC(),
		WorkspaceID:            "ws-fixture",
		Subscription: &StripeSubscription{
			ID:                 subID,
			Status:             "canceled",
			CurrentPeriodStart: periodStart.Unix(),
			CurrentPeriodEnd:   periodEnd.Unix(),
			CancelAtPeriodEnd:  false,
			CanceledAt:         &canceledUnix,
		},
	}
}

// happyPathEvents produces a chronological sequence of events for one
// subscription, suitable for the RAC permutation and idempotency tests.
//
// The events span: trialing → active → past_due → active → canceled.
// Each event has a distinct OccurredAt so the merge function can order
// them deterministically.
func happyPathEvents() []*Event {
	subID := "sub_test_happy"
	base := time.Date(2026, 5, 1, 12, 0, 0, 0, time.UTC)
	periodEnd := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)

	return []*Event{
		fixtureEvent(subID, "trialing", base, periodEnd),
		fixtureEvent(subID, "active", base.Add(24*time.Hour), periodEnd),
		fixtureEvent(subID, "past_due", base.Add(48*time.Hour), periodEnd),
		fixtureEvent(subID, "active", base.Add(72*time.Hour), periodEnd),
		canceledFixtureEvent(subID, base.Add(96*time.Hour), base.Add(96*time.Hour)),
	}
}

// ---- RAC assertions on the subscription reducer -------------------------

func TestRAC_PermutationInvariance(t *testing.T) {
	rac.AssertPermutationInvariance(t, racAdapter{}, happyPathEvents(), 10)
}

func TestRAC_Idempotency(t *testing.T) {
	rac.AssertIdempotency(t, racAdapter{}, happyPathEvents())
}

func TestRAC_Determinism(t *testing.T) {
	rac.AssertDeterminism(t, racAdapter{}, happyPathEvents(), 5)
}

func TestRAC_PartialReplayEquivalence(t *testing.T) {
	rac.AssertPartialReplayEquivalence(t, racAdapter{}, happyPathEvents(), 3)
}

func TestRAC_FutureVersionCompatibilityPlaceholder(t *testing.T) {
	rac.AssertFutureVersionCompatibility(t, racAdapter{}, happyPathEvents())
}

// ---- Conflict-generation tests (not part of RAC; reducer-specific) ------

// TestLateEventEmitsConflict verifies that an event arriving with an
// occurred_at older than the current projection's produces a conflict
// row rather than superseding.
func TestLateEventEmitsConflict(t *testing.T) {
	subID := "sub_late"
	periodEnd := time.Date(2026, 7, 1, 12, 0, 0, 0, time.UTC)
	t0 := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)

	// Establish state with a "current" event.
	current := Merge(nil, fixtureEvent(subID, "active", t0, periodEnd), EventSourceWebhook).Next
	if current == nil {
		t.Fatal("initial merge did not produce a state")
	}

	// A late event: occurred BEFORE current.
	late := fixtureEvent(subID, "trialing", t0.Add(-24*time.Hour), periodEnd)
	result := Merge(current, late, EventSourceWebhook)

	if !result.Skipped {
		t.Fatal("late event should be skipped (not produce a new projection)")
	}
	if len(result.Conflicts) == 0 || result.Conflicts[0].Type != ConflictLateEventDetected {
		t.Fatalf("late event should produce a late_event_detected conflict; got %v", result.Conflicts)
	}
}

// TestMissingOrderingMetadataEmitsConflict verifies that an event without
// a valid OccurredAt produces an ordering_metadata_missing conflict.
func TestMissingOrderingMetadataEmitsConflict(t *testing.T) {
	subID := "sub_no_metadata"
	bad := fixtureEvent(subID, "active", time.Time{}, time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC))
	bad.OccurredAt = time.Time{} // explicit zero

	result := Merge(nil, bad, EventSourceWebhook)
	if !result.Skipped {
		t.Fatal("event with missing OccurredAt should be skipped")
	}
	if len(result.Conflicts) == 0 || result.Conflicts[0].Type != ConflictOrderingMetadataMissing {
		t.Fatalf("expected ordering_metadata_missing conflict; got %v", result.Conflicts)
	}
}

// TestMergeInvariantViolationFromTerminalState verifies that a transition
// from a terminal status (canceled) back to a non-terminal status emits
// a merge_invariant_violation conflict — but the projection IS still
// produced. The reducer policy is "observe, don't editorialize."
func TestMergeInvariantViolationFromTerminalState(t *testing.T) {
	subID := "sub_zombie"
	t0 := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)

	// Establish canceled state.
	canceledState := Merge(nil, canceledFixtureEvent(subID, t0, t0), EventSourceWebhook).Next
	if canceledState == nil || canceledState.Status != "canceled" {
		t.Fatalf("expected canceled state; got %+v", canceledState)
	}

	// A subsequent event "reactivating" the subscription.
	reactivate := fixtureEvent(subID, "active", t0.Add(time.Hour), t0.AddDate(0, 1, 0))
	result := Merge(canceledState, reactivate, EventSourceWebhook)

	if result.Skipped {
		t.Fatal("reactivation should produce a new projection (observe, don't editorialize)")
	}
	if result.Next == nil || result.Next.Status != "active" {
		t.Fatalf("expected new state with status=active; got %+v", result.Next)
	}
	found := false
	for _, c := range result.Conflicts {
		if c.Type == ConflictMergeInvariantViolation {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected merge_invariant_violation conflict; got %v", result.Conflicts)
	}
}
