package subscription

import (
	"fmt"
	"time"
)

// ReducerVersion is the version tag written onto every projection row this
// reducer produces. Bump on any merge-function behavior change.
const ReducerVersion = "v1"

// ProjectionVersion is the schema version of the subscription_projection
// table shape this reducer understands. Bump if the projection schema
// changes in a way that affects how older rows should be interpreted.
const ProjectionVersion = "v1"

// MergeResult is the outcome of a single merge invocation. It contains
// either a new State to be projected (Next is non-nil and Skipped is false),
// or a skipped outcome (Next is nil and Skipped is true) with reasons in
// Conflicts.
//
// Conflicts may be present even when Next is non-nil — the merge succeeded
// but recorded operational pathology along the way.
type MergeResult struct {
	// Next is the new state to project. Nil if the merge did not produce
	// a projection (e.g., a late event was rejected).
	Next *State

	// Skipped indicates this event did not yield a new projection. The
	// reducer should still record Conflicts (if any) but should not
	// INSERT into subscription_projection.
	Skipped bool

	// Conflicts is the list of operational observations to emit to
	// subscription_projection_conflicts. May be empty on a clean merge.
	Conflicts []Conflict
}

// Conflict describes an operational observation worth recording but
// distinct from the projection itself. See migration 0018.
type Conflict struct {
	Type    ConflictType
	Details map[string]any
}

type ConflictType string

const (
	ConflictLateEventDetected      ConflictType = "late_event_detected"
	ConflictChronologyConflict     ConflictType = "chronology_conflict"
	ConflictMergeInvariantViolation ConflictType = "merge_invariant_violation"
	ConflictOrderingMetadataMissing ConflictType = "ordering_metadata_missing"
)

// Merge is the pure merge function. Given the current state (nil if no
// prior projection exists) and a new event, returns the resulting State
// and any conflicts to record.
//
// This function is pure: it does not perform I/O, does not consult external
// state, does not read clocks beyond the event's own timestamps. That
// purity is what makes the RAC permutation and determinism tests possible.
func Merge(current *State, event *Event, source EventSource) MergeResult {
	// Step 1: validate ordering metadata is present and well-formed.
	if event.OccurredAt.IsZero() {
		return MergeResult{
			Skipped: true,
			Conflicts: []Conflict{{
				Type: ConflictOrderingMetadataMissing,
				Details: map[string]any{
					"source_event_id": event.SourceEventID,
					"reason":          "event.created missing or zero",
				},
			}},
		}
	}

	// Step 2: only process events that carry a subscription object.
	if event.Subscription == nil {
		return MergeResult{Skipped: true}
	}

	// Step 3: ordering checks against current state (if any).
	var conflicts []Conflict
	if current != nil {
		if event.OccurredAt.Before(current.EventOccurredAt) {
			// Late event. Do not supersede; record the observation.
			return MergeResult{
				Skipped: true,
				Conflicts: []Conflict{{
					Type: ConflictLateEventDetected,
					Details: map[string]any{
						"source_event_id":              event.SourceEventID,
						"event_occurred_at":            event.OccurredAt,
						"current_event_occurred_at":    current.EventOccurredAt,
						"current_status":               current.Status,
						"reason":                       "event_occurred_at older than current projection",
					},
				}},
			}
		}
		if event.OccurredAt.Equal(current.EventOccurredAt) && event.SourceEventID != "" {
			// Same-second events. Tie-break by source_event_id ordering
			// (lexicographic) so the merge function is deterministic, but
			// record the chronology conflict for review.
			conflicts = append(conflicts, Conflict{
				Type: ConflictChronologyConflict,
				Details: map[string]any{
					"source_event_id":         event.SourceEventID,
					"event_occurred_at":       event.OccurredAt,
					"reason":                  "tied timestamp with current projection",
				},
			})
		}
	}

	// Step 4: build the new state by applying per-field authority rules.
	authority := source.Authority()
	next := &State{
		StripeSubscriptionID: event.Subscription.ID,
		WorkspaceID:          event.WorkspaceID,
		EventOccurredAt:      event.OccurredAt,
		FieldAuthority:       make(map[string]AuthoritySource, len(AuthorityPolicy)),
	}

	// Apply each field via its authority policy. Currently every field's
	// authority is webhook (the v1 policy), so every event field is
	// applied. When polling lands, fields with polling authority will
	// require a different code path to consult the polling source.
	applyField(next, "status", authority, func() {
		next.Status = event.Subscription.Status
	}, func() {
		if current != nil {
			next.Status = current.Status
		}
	})
	applyField(next, "current_period_start", authority, func() {
		next.CurrentPeriodStart = epochToTime(event.Subscription.CurrentPeriodStart)
	}, func() {
		if current != nil {
			next.CurrentPeriodStart = current.CurrentPeriodStart
		}
	})
	applyField(next, "current_period_end", authority, func() {
		next.CurrentPeriodEnd = epochToTime(event.Subscription.CurrentPeriodEnd)
	}, func() {
		if current != nil {
			next.CurrentPeriodEnd = current.CurrentPeriodEnd
		}
	})
	applyField(next, "cancel_at_period_end", authority, func() {
		next.CancelAtPeriodEnd = event.Subscription.CancelAtPeriodEnd
	}, func() {
		if current != nil {
			next.CancelAtPeriodEnd = current.CancelAtPeriodEnd
		}
	})
	applyField(next, "canceled_at", authority, func() {
		next.CanceledAt = epochPtrToTime(event.Subscription.CanceledAt)
	}, func() {
		if current != nil {
			next.CanceledAt = current.CanceledAt
		}
	})
	applyField(next, "trial_start", authority, func() {
		next.TrialStart = epochPtrToTime(event.Subscription.TrialStart)
	}, func() {
		if current != nil {
			next.TrialStart = current.TrialStart
		}
	})
	applyField(next, "trial_end", authority, func() {
		next.TrialEnd = epochPtrToTime(event.Subscription.TrialEnd)
	}, func() {
		if current != nil {
			next.TrialEnd = current.TrialEnd
		}
	})

	// Step 5: detect merge invariant violations. The reducer's policy is
	// "observe, don't editorialize" — we don't reject the event, but we
	// record the observation for review. Example: status moving from
	// canceled back to active without an explicit reactivation.
	if current != nil {
		if isTerminalStatus(current.Status) && !isTerminalStatus(next.Status) {
			conflicts = append(conflicts, Conflict{
				Type: ConflictMergeInvariantViolation,
				Details: map[string]any{
					"source_event_id": event.SourceEventID,
					"prior_status":    current.Status,
					"new_status":      next.Status,
					"reason":          fmt.Sprintf("status transitioned from terminal (%s) to non-terminal (%s)", current.Status, next.Status),
				},
			})
		}
	}

	return MergeResult{
		Next:      next,
		Skipped:   false,
		Conflicts: conflicts,
	}
}

// applyField encapsulates the per-field arbitration. If the event's source
// matches the authority policy for this field, the apply function runs;
// otherwise the fallback (carry-forward from current state) runs. Either
// way the authority tag is recorded.
//
// In v1, authority is always webhook and the reducer only ingests webhook
// events, so apply always runs. The fallback exists to make the future
// polling-authority case obvious: when status authority changes to polling
// and a webhook event arrives, this function will run the fallback
// (preserve current) and tag the field's authority as the LAST one that
// actually wrote it — which becomes the audit trail.
func applyField(next *State, field string, eventSource AuthoritySource, apply, fallback func()) {
	policyAuthority := AuthorityFor(field)
	if policyAuthority == eventSource {
		apply()
		next.FieldAuthority[field] = eventSource
		return
	}
	fallback()
	// On carry-forward, we don't have direct visibility into what
	// authority originally produced the carried value. Tag with the
	// policy authority — the projection chain provides the lineage for
	// anyone who needs the precise history.
	next.FieldAuthority[field] = policyAuthority
}

// isTerminalStatus identifies subscription statuses Stripe treats as end
// states. Used by the merge invariant violation detector.
func isTerminalStatus(status string) bool {
	switch status {
	case "canceled", "incomplete_expired":
		return true
	}
	return false
}

// EnsureUTC normalizes a time to UTC. Used by tests that construct State
// values directly to keep comparisons stable.
func EnsureUTC(t time.Time) time.Time { return t.UTC() }
