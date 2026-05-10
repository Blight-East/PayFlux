// Package subscription implements the first reducer in PayFlux's projection
// substrate. It consumes Stripe subscription events from stripe_event_ledger
// and writes interpretations to subscription_projection.
//
// See SUBSCRIPTION_REDUCER_CONTRACT.md for the full operational contract.
//
// This file defines the State and Event types — the pure data structures the
// merge function operates on. The merge function itself lives in merge.go
// (pure, no I/O). The DB-bound reducer lives in reducer.go.
package subscription

import (
	"encoding/json"
	"time"
)

// State is the interpreted current state of a subscription as the reducer
// understands it. Field semantics mirror the corresponding columns on the
// subscription_projection table.
//
// The State is a snapshot, not a row. Multiple State values may exist for
// the same subscription across the projection chain — each one is what the
// reducer believed at one point in time.
type State struct {
	StripeSubscriptionID string
	WorkspaceID          string

	Status               string
	CurrentPeriodStart   *time.Time
	CurrentPeriodEnd     *time.Time
	CancelAtPeriodEnd    bool
	CanceledAt           *time.Time
	TrialStart           *time.Time
	TrialEnd             *time.Time

	// FieldAuthority records which authority source produced each
	// interpreted field's value in this State. Keys correspond to the
	// JSON tags of the interpreted fields above. Values are one of the
	// AuthoritySource constants.
	FieldAuthority map[string]AuthoritySource

	// EventOccurredAt is the logical timestamp of the event that produced
	// this State. Used by the merge function to detect late events and
	// chronology conflicts.
	EventOccurredAt time.Time
}

// AuthoritySource enumerates the categories of input the reducer can
// attribute a field's value to.
type AuthoritySource string

const (
	AuthorityWebhook AuthoritySource = "webhook"
	AuthorityPolling AuthoritySource = "polling"
	AuthorityManual  AuthoritySource = "manual"
)

// Event is the reducer's structured view of a Stripe webhook event from
// stripe_event_ledger. The reducer extracts these fields from the raw
// payload (text column on the ledger) during processing.
type Event struct {
	// LedgerEventID is the stripe_event_ledger.id (uuid) — used for
	// idempotency tracking and provenance.
	LedgerEventID string

	// SourceEventID is the Stripe-side event id (evt_...). The reducer's
	// idempotency key on subscription_projection is
	// (stripe_subscription_id, source_event_id, reducer_version).
	SourceEventID string

	// SourceIngestionVersion is the ingestion_version from the ledger row.
	// Carried through to the projection for provenance.
	SourceIngestionVersion string

	// EventType is event.type from the Stripe payload. The reducer only
	// processes a subset (subscription.created, .updated, .deleted,
	// invoice.payment_*, checkout.session.completed).
	EventType string

	// OccurredAt is event.created from the Stripe payload, expressed as
	// time.Time. Used for ordering. The reducer rejects events without
	// a valid occurred_at by emitting an ordering_metadata_missing
	// conflict.
	OccurredAt time.Time

	// Subscription is the parsed subscription object from the event.
	// May be nil for events that don't carry a subscription object
	// (e.g., a stale event that's about a different entity).
	Subscription *StripeSubscription

	// WorkspaceID is the resolved internal workspace id. The caller is
	// responsible for resolving stripe_account_id or metadata.workspaceId
	// to a workspace before passing the Event to the reducer.
	WorkspaceID string
}

// StripeSubscription is a minimal structured view of Stripe's subscription
// object — only the fields the reducer cares about. Stripe's full object has
// many more fields; we extract only what feeds the projection.
type StripeSubscription struct {
	ID                 string     `json:"id"`
	Status             string     `json:"status"`
	CurrentPeriodStart int64      `json:"current_period_start"` // unix seconds
	CurrentPeriodEnd   int64      `json:"current_period_end"`
	CancelAtPeriodEnd  bool       `json:"cancel_at_period_end"`
	CanceledAt         *int64     `json:"canceled_at"`
	TrialStart         *int64     `json:"trial_start"`
	TrialEnd           *int64     `json:"trial_end"`
}

// MarshalFieldAuthority serializes FieldAuthority for storage in jsonb.
func (s *State) MarshalFieldAuthority() ([]byte, error) {
	if s.FieldAuthority == nil {
		return []byte("{}"), nil
	}
	return json.Marshal(s.FieldAuthority)
}

// epochToTime converts a Stripe unix-seconds field to *time.Time. Zero
// timestamps from Stripe become nil rather than time.Unix(0, 0) so the
// projection row stores NULL.
func epochToTime(epoch int64) *time.Time {
	if epoch == 0 {
		return nil
	}
	t := time.Unix(epoch, 0).UTC()
	return &t
}

// epochPtrToTime converts a Stripe nullable unix-seconds field to *time.Time.
func epochPtrToTime(epoch *int64) *time.Time {
	if epoch == nil || *epoch == 0 {
		return nil
	}
	t := time.Unix(*epoch, 0).UTC()
	return &t
}
