// Package drift implements the subscription drift detector.
//
// The detector compares the reducer's projection (subscription_projection,
// via the subscription_current_state view) against an authority provider
// and emits subscription_reconciliation_events rows describing what it
// finds. The detector NEVER corrects either side automatically — the row
// IS the signal.
//
// See SUBSCRIPTION_REDUCER_CONTRACT.md for the operational contract
// governing this service.
package drift

import (
	"time"
)

// Severity decides whether a reconciliation event is informational
// background, a warning that needs review, a critical operational signal,
// or a regulatory artifact that must be preserved with extra rigor.
//
// Severity is orthogonal to event_type — drift_minor can be any severity
// from informational to critical depending on WHICH field differs.
type Severity string

const (
	SeverityInformational Severity = "informational"
	SeverityWarning       Severity = "warning"
	SeverityCritical      Severity = "critical"
	SeverityRegulatory    Severity = "regulatory"
)

// EventType is the reconciliation_events.event_type the detector emits.
// Mirrors the CHECK constraint on the table.
type EventType string

const (
	EventDriftMinor             EventType = "drift_minor"
	EventDriftMajor             EventType = "drift_major"
	EventDriftResolved          EventType = "drift_resolved"
	EventProjectionImpossible   EventType = "projection_impossible"
)

// ResolutionMechanism describes how a drift was resolved when the
// detector emits a drift_resolved event.
type ResolutionMechanism string

const (
	ResolutionAutoProviderAgreed ResolutionMechanism = "auto_provider_agreed"
	ResolutionPollingSupersede   ResolutionMechanism = "polling_supersede" // Phase 2
	ResolutionReplayCorrection   ResolutionMechanism = "replay_correction"
	ResolutionManualOperator     ResolutionMechanism = "manual_operator"
	ResolutionTimeoutUnresolved  ResolutionMechanism = "timeout_unresolved"
)

// Comparison is the structured result of comparing a projection against
// an authority. Drives both the EventType decision and the Severity
// classification.
type Comparison struct {
	// True if every interpreted field agrees across the two states
	// (within tolerance for timestamps).
	Agreed bool

	// Field names that disagree. Used for both the event_type decision
	// and for the operational details jsonb on the reconciliation row.
	DisagreeingFields []string

	// True if the projection has a status that's not in Stripe's valid
	// status set. Triggers projection_impossible / regulatory severity.
	ProjectionImpossible bool
}

// ValidStripeStatuses are the subscription statuses Stripe documents.
// A projection that holds a status outside this set is itself an error
// — that's the "projection impossible" case.
var ValidStripeStatuses = map[string]bool{
	"incomplete":         true,
	"incomplete_expired": true,
	"trialing":           true,
	"active":             true,
	"past_due":           true,
	"canceled":           true,
	"unpaid":             true,
	"paused":             true,
}

// TimestampTolerance is the maximum delta the detector considers
// equivalent for two interpretations of the same timestamp. Below this,
// disagreement is informational (clock skew, rounding). Above this,
// disagreement is operationally meaningful.
const TimestampTolerance = 5 * time.Second

// ClassifySeverity is the policy function that decides how operationally
// loud a drift is. Drives whether anyone gets paged.
//
// The policy is intentionally explicit — every disagreeing field maps to
// a defined severity, and the worst severity across all disagreeing
// fields wins. New fields added later must extend this function or be
// classified by the default (warning).
func ClassifySeverity(c Comparison) Severity {
	if c.ProjectionImpossible {
		return SeverityRegulatory
	}
	if c.Agreed {
		return SeverityInformational
	}

	worst := SeverityInformational
	for _, f := range c.DisagreeingFields {
		s := severityForField(f)
		if severityRank(s) > severityRank(worst) {
			worst = s
		}
	}
	return worst
}

// severityForField is the explicit policy table mapping each interpreted
// field to its operational severity when it disagrees with the authority.
// Bump severity by promoting a field here.
func severityForField(field string) Severity {
	switch field {
	case "status":
		// Status differences mean the dashboard and the reducer disagree
		// on whether a subscription is active, canceled, past_due, etc.
		// That's a business-critical disagreement — billing decisions
		// hang on it.
		return SeverityCritical
	case "cancel_at_period_end":
		// Affects whether next-period billing happens.
		return SeverityCritical
	case "current_period_end", "current_period_start", "canceled_at":
		// Timing details. Disagreement is meaningful but rarely
		// operationally page-worthy (timestamps slip; the detector's
		// TimestampTolerance handles small skews).
		return SeverityWarning
	case "trial_start", "trial_end":
		// Affects trial expiration logic, but typically only matters at
		// specific transition moments. Warning level for routine
		// observation.
		return SeverityWarning
	}
	// Unknown fields default to warning so additions are visible without
	// being noisy.
	return SeverityWarning
}

// severityRank lets us pick "worst" across multiple disagreeing fields.
func severityRank(s Severity) int {
	switch s {
	case SeverityRegulatory:
		return 4
	case SeverityCritical:
		return 3
	case SeverityWarning:
		return 2
	case SeverityInformational:
		return 1
	}
	return 0
}

// ClassifyEventType decides which reconciliation_events.event_type to
// emit based on the comparison outcome.
func ClassifyEventType(c Comparison) EventType {
	if c.ProjectionImpossible {
		return EventProjectionImpossible
	}
	if c.Agreed {
		// Note: this isn't an event_type we emit on its own. The detector
		// uses this to decide "no drift to record." Resolution rows use
		// EventDriftResolved instead.
		return EventDriftResolved
	}
	// Critical-severity fields produce drift_major; everything else is
	// drift_minor.
	for _, f := range c.DisagreeingFields {
		if severityRank(severityForField(f)) >= severityRank(SeverityCritical) {
			return EventDriftMajor
		}
	}
	return EventDriftMinor
}
