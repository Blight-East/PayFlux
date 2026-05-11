package drift

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"payment-node/internal/reducer/subscription"
	"payment-node/internal/reducer/subscription/authority"
)

// DetectorVersion identifies this detector implementation. Used for the
// reconciliation_events.detector_version column. Bump on any classification
// or comparison logic change.
const DetectorVersion = "v1"

// DetectorName is the canonical identifier for the subscription drift
// detector.
const DetectorName = "subscription_drift"

// Detector compares the reducer's projection against an authority provider
// on a periodic schedule. Designed to be reducer-version-aware and
// provider-pluggable.
type Detector struct {
	DB       *sql.DB
	Provider authority.Provider
	Logger   *slog.Logger

	// Tick is how often the detector sweeps. Default 60s if zero.
	Tick time.Duration
}

// Run drives the detector until the context is canceled. Each tick the
// detector:
//
//  1. Loads the full set of authoritative states from the provider.
//  2. For each, loads the current projection (if any).
//  3. Compares per-field.
//  4. Emits the appropriate reconciliation event:
//       - If open drift exists and now agrees: emit drift_resolved.
//       - If disagreement and no open drift: emit drift_minor/major or
//         projection_impossible.
//       - If agreement and no open drift: silent (no row for steady state).
//
// The detector never modifies projections or canonical state. It only
// observes and records.
func (d *Detector) Run(ctx context.Context) error {
	if d.Logger == nil {
		d.Logger = slog.Default()
	}
	d.Logger = d.Logger.With(
		"detector", DetectorName,
		"detector_version", DetectorVersion,
		"provider", d.Provider.Name(),
		"provider_version", d.Provider.Version(),
	)
	tick := d.Tick
	if tick == 0 {
		tick = 60 * time.Second
	}
	d.Logger.Info("drift detector starting", "tick", tick.String())

	for {
		if err := d.sweep(ctx); err != nil {
			d.Logger.Error("sweep failed", "error", err)
		}
		select {
		case <-ctx.Done():
			d.Logger.Info("drift detector canceled")
			return nil
		case <-time.After(tick):
		}
	}
}

// sweep runs one full pass over the authority provider's states. Emits
// rows for any state transitions detected (new drifts, resolutions).
func (d *Detector) sweep(ctx context.Context) error {
	states, err := d.Provider.FetchAll(ctx)
	if err != nil {
		return fmt.Errorf("provider FetchAll: %w", err)
	}

	emittedDetections := 0
	emittedResolutions := 0

	for _, auth := range states {
		select {
		case <-ctx.Done():
			return nil
		default:
		}

		projection, err := loadCurrentProjection(ctx, d.DB, auth.StripeSubscriptionID)
		if err != nil {
			d.Logger.Warn("load projection", "subscription_id", auth.StripeSubscriptionID, "error", err)
			continue
		}

		if projection == nil {
			// Authority knows about this subscription; the reducer
			// hasn't produced a projection yet. That's expected during
			// initial backfill or for subscriptions older than the
			// ledger's history. Not drift; not a detector concern.
			continue
		}

		c := compare(projection, auth)

		openID, err := findOpenDrift(ctx, d.DB, auth.StripeSubscriptionID)
		if err != nil {
			d.Logger.Warn("find open drift", "subscription_id", auth.StripeSubscriptionID, "error", err)
			continue
		}

		if c.Agreed {
			// Agreement now. If there was open drift, this is a resolution.
			if openID != "" {
				if err := emitResolution(ctx, d.DB, d.Provider, projection, auth, openID); err != nil {
					d.Logger.Warn("emit resolution", "open_drift_id", openID, "error", err)
					continue
				}
				emittedResolutions++
			}
			// Else: silent steady state.
			continue
		}

		// Disagreement.
		if openID != "" {
			// Drift remains open. Don't pile up duplicate detection rows.
			// (Future optimization: re-emit if severity escalates.)
			continue
		}

		// New drift detection.
		if err := emitDetection(ctx, d.DB, d.Provider, projection, auth, c); err != nil {
			d.Logger.Warn("emit detection", "subscription_id", auth.StripeSubscriptionID, "error", err)
			continue
		}
		emittedDetections++
	}

	d.Logger.Info("sweep complete",
		"authority_count", len(states),
		"detections_emitted", emittedDetections,
		"resolutions_emitted", emittedResolutions,
	)
	return nil
}

// compare runs the field-by-field comparison between a projection and an
// authoritative state, returning a structured Comparison.
//
// Pure function (no I/O). Used by both the detector's sweep loop and the
// detector tests.
func compare(projection *subscription.State, auth *authority.State) Comparison {
	c := Comparison{Agreed: true}

	// Projection-impossible check is independent of comparison —
	// regardless of the authority, if the projection holds a status
	// Stripe doesn't define, that's a regulatory-severity event.
	if !ValidStripeStatuses[projection.Status] {
		c.ProjectionImpossible = true
		c.Agreed = false
		c.DisagreeingFields = append(c.DisagreeingFields, "status")
		return c
	}

	if projection.Status != auth.Status {
		c.DisagreeingFields = append(c.DisagreeingFields, "status")
	}
	if !timestampsAgree(projection.CurrentPeriodStart, auth.CurrentPeriodStart) {
		c.DisagreeingFields = append(c.DisagreeingFields, "current_period_start")
	}
	if !timestampsAgree(projection.CurrentPeriodEnd, auth.CurrentPeriodEnd) {
		c.DisagreeingFields = append(c.DisagreeingFields, "current_period_end")
	}
	if projection.CancelAtPeriodEnd != auth.CancelAtPeriodEnd {
		c.DisagreeingFields = append(c.DisagreeingFields, "cancel_at_period_end")
	}
	if !timestampsAgree(projection.CanceledAt, auth.CanceledAt) {
		c.DisagreeingFields = append(c.DisagreeingFields, "canceled_at")
	}
	if !timestampsAgree(projection.TrialStart, auth.TrialStart) {
		c.DisagreeingFields = append(c.DisagreeingFields, "trial_start")
	}
	if !timestampsAgree(projection.TrialEnd, auth.TrialEnd) {
		c.DisagreeingFields = append(c.DisagreeingFields, "trial_end")
	}

	c.Agreed = len(c.DisagreeingFields) == 0
	return c
}

// timestampsAgree returns true if two timestamps are equivalent within the
// detector's TimestampTolerance. Two nils agree. nil vs non-nil disagrees.
func timestampsAgree(a, b *time.Time) bool {
	if a == nil || b == nil {
		return a == b
	}
	delta := a.Sub(*b)
	if delta < 0 {
		delta = -delta
	}
	return delta <= TimestampTolerance
}

func loadCurrentProjection(ctx context.Context, db *sql.DB, subID string) (*subscription.State, error) {
	var s subscription.State
	var authorityJSON []byte
	err := db.QueryRowContext(ctx, `
		SELECT
			stripe_subscription_id, workspace_id::text,
			status, current_period_start, current_period_end,
			cancel_at_period_end, canceled_at, trial_start, trial_end,
			field_authority, event_occurred_at
		FROM subscription_current_state
		WHERE stripe_subscription_id = $1
	`, subID).Scan(
		&s.StripeSubscriptionID, &s.WorkspaceID,
		&s.Status, &s.CurrentPeriodStart, &s.CurrentPeriodEnd,
		&s.CancelAtPeriodEnd, &s.CanceledAt, &s.TrialStart, &s.TrialEnd,
		&authorityJSON, &s.EventOccurredAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// findOpenDrift returns the id of the latest unresolved drift detection
// for this subscription, or "" if no open drift exists.
func findOpenDrift(ctx context.Context, db *sql.DB, subID string) (string, error) {
	var id string
	err := db.QueryRowContext(ctx, `
		SELECT id::text FROM subscription_reconciliation_events d
		WHERE d.stripe_subscription_id = $1
		  AND d.event_type IN ('drift_minor', 'drift_major', 'projection_impossible')
		  AND NOT EXISTS (
			SELECT 1 FROM subscription_reconciliation_events r
			WHERE r.resolves_id = d.id
		  )
		ORDER BY d.detected_at DESC
		LIMIT 1
	`, subID).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	return id, err
}

func emitDetection(
	ctx context.Context,
	db *sql.DB,
	provider authority.Provider,
	projection *subscription.State,
	auth *authority.State,
	c Comparison,
) error {
	severity := ClassifySeverity(c)
	eventType := ClassifyEventType(c)

	reducerSnap := snapshotProjection(projection)
	canonicalSnap := snapshotAuthority(auth)

	_, err := db.ExecContext(ctx, `
		INSERT INTO subscription_reconciliation_events (
			stripe_subscription_id, event_type, severity,
			projection_id_at_detection, reducer_state, canonical_state,
			detector_name, detector_version, reducer_version
		) VALUES (
			$1, $2, $3,
			(SELECT id FROM subscription_current_state WHERE stripe_subscription_id = $1),
			$4, $5,
			$6, $7, $8
		)
	`,
		auth.StripeSubscriptionID,
		string(eventType),
		string(severity),
		reducerSnap, canonicalSnap,
		DetectorName, DetectorVersion, subscription.ReducerVersion,
	)
	return err
}

func emitResolution(
	ctx context.Context,
	db *sql.DB,
	provider authority.Provider,
	projection *subscription.State,
	auth *authority.State,
	resolvesID string,
) error {
	reducerSnap := snapshotProjection(projection)
	canonicalSnap := snapshotAuthority(auth)

	_, err := db.ExecContext(ctx, `
		INSERT INTO subscription_reconciliation_events (
			stripe_subscription_id, event_type, severity,
			projection_id_at_detection, reducer_state, canonical_state,
			detector_name, detector_version, reducer_version,
			resolves_id, resolution_mechanism
		) VALUES (
			$1, $2, $3,
			(SELECT id FROM subscription_current_state WHERE stripe_subscription_id = $1),
			$4, $5,
			$6, $7, $8,
			$9::uuid, $10
		)
	`,
		auth.StripeSubscriptionID,
		string(EventDriftResolved),
		string(SeverityInformational),
		reducerSnap, canonicalSnap,
		DetectorName, DetectorVersion, subscription.ReducerVersion,
		resolvesID, string(ResolutionAutoProviderAgreed),
	)
	return err
}

// snapshotProjection serializes the projection state into the jsonb shape
// stored on reconciliation rows.
func snapshotProjection(p *subscription.State) []byte {
	b, _ := json.Marshal(map[string]any{
		"status":                 p.Status,
		"current_period_start":   p.CurrentPeriodStart,
		"current_period_end":     p.CurrentPeriodEnd,
		"cancel_at_period_end":   p.CancelAtPeriodEnd,
		"canceled_at":            p.CanceledAt,
		"trial_start":            p.TrialStart,
		"trial_end":              p.TrialEnd,
		"event_occurred_at":      p.EventOccurredAt,
		"field_authority":        p.FieldAuthority,
	})
	return b
}

func snapshotAuthority(a *authority.State) []byte {
	b, _ := json.Marshal(map[string]any{
		"status":                 a.Status,
		"current_period_start":   a.CurrentPeriodStart,
		"current_period_end":     a.CurrentPeriodEnd,
		"cancel_at_period_end":   a.CancelAtPeriodEnd,
		"canceled_at":            a.CanceledAt,
		"trial_start":            a.TrialStart,
		"trial_end":              a.TrialEnd,
		"provider_name":          a.ProviderName,
		"provider_version":       a.ProviderVersion,
	})
	return b
}
