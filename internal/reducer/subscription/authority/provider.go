// Package authority defines the Authority Provider interface for the
// subscription drift detector. The interface decouples WHAT the detector
// compares against from HOW it gets that comparison.
//
// Phase 1 (now): the billing provider reads the dashboard's canonical
// billing_subscriptions table. This is the "compare reducer's
// interpretation against the incumbent operational truth" stage.
//
// Phase 2 (future, post-polling-worker): a stripe provider polls Stripe's
// API directly. At that point billing_subscriptions becomes a legacy
// artifact and the detector compares projection against the only
// genuinely authoritative source — Stripe's API at-rest.
//
// The detector code never changes between phases. Only the registered
// provider does.
package authority

import (
	"context"
	"time"
)

// State is the authoritative interpretation of a subscription's state from
// the perspective of whichever provider is wired in. Mirrors the
// subscription state fields the reducer interprets, so the detector can
// compare field-by-field.
//
// Nil pointer fields mean "this attribute is not known to the authority"
// (e.g., billing_subscriptions has columns that aren't populated for a
// given subscription). The detector treats nil-vs-set as a special case
// of disagreement that's typically informational rather than critical.
type State struct {
	StripeSubscriptionID string

	Status               string
	CurrentPeriodStart   *time.Time
	CurrentPeriodEnd     *time.Time
	CancelAtPeriodEnd    bool
	CanceledAt           *time.Time
	TrialStart           *time.Time
	TrialEnd             *time.Time

	// Where this state came from. Used by the detector to tag
	// reconciliation events with the right detector_name / detector_version.
	ProviderName    string
	ProviderVersion string
}

// Provider is the contract a drift authority must implement. The detector
// calls FetchAll periodically to retrieve the current authoritative state
// for every subscription it should compare against.
//
// Implementations MUST be deterministic per call: the same call at the
// same wall-clock instant should return the same data. (Stripe-side
// changes between calls are expected — that's the point of polling.)
type Provider interface {
	// Name identifies the provider for use in detector telemetry
	// (detector_name on reconciliation event rows).
	Name() string

	// Version is the provider implementation's release tag. Bump on any
	// behavior change. Used in detector telemetry (detector_version).
	Version() string

	// FetchState returns the authoritative state for a specific
	// subscription, or (nil, nil) if the provider has no record of it.
	// The detector treats nil-state as "authority has no opinion" —
	// this is informational drift, not a critical signal.
	FetchState(ctx context.Context, stripeSubscriptionID string) (*State, error)

	// FetchAll returns the authoritative state for every subscription
	// the provider knows about. Used by the detector's periodic sweep.
	// Implementations should stream rather than buffer when row count
	// grows large; for Phase 1 the caller scans all rows in one pass.
	FetchAll(ctx context.Context) ([]*State, error)
}
