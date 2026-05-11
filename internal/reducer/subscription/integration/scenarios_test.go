package integration

import (
	"context"
	"database/sql"
	"strings"
	"testing"
	"time"

	"payment-node/internal/reducer/subscription"
	"payment-node/internal/reducer/subscription/authority"
	"payment-node/internal/reducer/subscription/drift"
)

// stripeEventFixture builds a synthetic Stripe webhook payload for the
// integration harness. workspaceID is encoded as subscription.metadata
// so the reducer's workspace resolver finds it; alternatively the
// caller can set Customer and pre-populate billing_customers.
func stripeEventFixture(eventID, eventType, subID, workspaceID string, status string, created time.Time, cancelAtPeriodEnd bool) map[string]any {
	subscription := map[string]any{
		"id":                   subID,
		"object":               "subscription",
		"status":               status,
		"current_period_start": created.Unix(),
		"current_period_end":   created.Add(30 * 24 * time.Hour).Unix(),
		"cancel_at_period_end": cancelAtPeriodEnd,
		"metadata":             map[string]any{"workspaceId": workspaceID},
	}
	return map[string]any{
		"id":          eventID,
		"object":      "event",
		"type":        eventType,
		"created":     created.Unix(),
		"api_version": "2025-02-24.acacia",
		"data":        map[string]any{"object": subscription},
	}
}

// TestSubstrate_FullHappyPath_NoDrift exercises the full cross-component
// flow with reducer and detector agreeing: a Stripe event arrives, the
// reducer projects it, the canonical billing_subscriptions row matches
// (because in production both writers consume the same events), and the
// detector emits no drift event.
//
// This is the steady-state scenario. If this test fails, the substrate
// is producing false-positive drift signals — operationally noisy.
func TestSubstrate_FullHappyPath_NoDrift(t *testing.T) {
	db := SetupSubstrate(t)
	ctx := context.Background()

	wsID := InsertWorkspace(t, db)
	now := time.Now().UTC()

	InsertLedgerEvent(t, db, LedgerEvent{
		StripeEventID: "evt_happy_001",
		Payload:       stripeEventFixture("evt_happy_001", "customer.subscription.updated", "sub_happy_001", wsID, "active", now, false),
		ReceivedAt:    now,
	})

	processed, conflicts, err := subscription.ProcessPending(ctx, db)
	if err != nil {
		t.Fatalf("ProcessPending: %v", err)
	}
	if processed != 1 {
		t.Fatalf("expected 1 projection; got processed=%d", processed)
	}
	if conflicts != 0 {
		t.Fatalf("expected 0 conflicts; got %d", conflicts)
	}

	// Sanity: projection row was actually written.
	assertRowCount(t, db, `SELECT count(*)::int FROM subscription_projection`, 1)
	// Subscription_current_state view exposes the head.
	assertSubscriptionStatusInView(t, db, "sub_happy_001", "active")

	// Insert matching canonical billing_subscriptions row (in production
	// the dashboard CRUD writer would have done this from the same event).
	InsertBillingSubscription(t, db, BillingSubscription{
		WorkspaceID:          wsID,
		StripeSubscriptionID: "sub_happy_001",
		StripeCustomerID:     "cus_happy_001",
		Status:               "active",
		CurrentPeriodStart:   ptrTime(time.Unix(now.Unix(), 0).UTC()),
		CurrentPeriodEnd:     ptrTime(time.Unix(now.Add(30*24*time.Hour).Unix(), 0).UTC()),
	})

	// Run detector sweep — should find agreement, emit nothing.
	runDetectorSweep(t, db)

	assertRowCount(t, db, `SELECT count(*)::int FROM subscription_reconciliation_events`, 0)
}

// TestSubstrate_DriftDetectedThenResolved verifies the full drift loop:
// reducer projects one state, canonical disagrees, detector emits drift,
// canonical updates to agree, detector emits resolution row chained via
// resolves_id.
//
// This tests the substrate's evidentiary property — "how did confidence
// evolve" is answerable from append-only history alone.
func TestSubstrate_DriftDetectedThenResolved(t *testing.T) {
	db := SetupSubstrate(t)
	ctx := context.Background()

	wsID := InsertWorkspace(t, db)
	now := time.Now().UTC()

	// Reducer projects 'active'.
	InsertLedgerEvent(t, db, LedgerEvent{
		StripeEventID: "evt_drift_001",
		Payload:       stripeEventFixture("evt_drift_001", "customer.subscription.updated", "sub_drift_001", wsID, "active", now, false),
		ReceivedAt:    now,
	})
	if _, _, err := subscription.ProcessPending(ctx, db); err != nil {
		t.Fatalf("ProcessPending: %v", err)
	}

	// Canonical disagrees on STATUS only. Period timestamps match the
	// projection so the comparison's other fields agree — this isolates
	// the drift signal to the field we're actually testing.
	periodStart := time.Unix(now.Unix(), 0).UTC()
	periodEnd := time.Unix(now.Add(30*24*time.Hour).Unix(), 0).UTC()
	InsertBillingSubscription(t, db, BillingSubscription{
		WorkspaceID:          wsID,
		StripeSubscriptionID: "sub_drift_001",
		StripeCustomerID:     "cus_drift_001",
		Status:               "canceled",
		CurrentPeriodStart:   &periodStart,
		CurrentPeriodEnd:     &periodEnd,
	})

	runDetectorSweep(t, db)

	// Drift should have been emitted with event_type=drift_major and
	// severity=critical (status is a critical field).
	var detEventType, detSeverity string
	var detID string
	err := db.QueryRow(`
		SELECT id::text, event_type, severity
		FROM subscription_reconciliation_events
		WHERE stripe_subscription_id = $1
		ORDER BY detected_at DESC LIMIT 1
	`, "sub_drift_001").Scan(&detID, &detEventType, &detSeverity)
	if err != nil {
		t.Fatalf("query detection: %v", err)
	}
	if detEventType != "drift_major" {
		t.Errorf("expected drift_major; got %s", detEventType)
	}
	if detSeverity != "critical" {
		t.Errorf("expected critical severity; got %s", detSeverity)
	}

	// Now canonical "catches up" — update billing_subscriptions to active.
	// (In production this would happen via the dashboard's CRUD writer
	// processing a later event. The integration test simulates by direct
	// update.)
	_, err = db.Exec(`UPDATE billing_subscriptions SET status = 'active', raw_status = 'active' WHERE stripe_subscription_id = $1`, "sub_drift_001")
	if err != nil {
		t.Fatalf("update billing_subscriptions: %v", err)
	}

	runDetectorSweep(t, db)

	// Resolution row should exist, chained to the detection.
	var resID, resType, resMech, resolvesID sql.NullString
	err = db.QueryRow(`
		SELECT id::text, event_type, resolution_mechanism, resolves_id::text
		FROM subscription_reconciliation_events
		WHERE stripe_subscription_id = $1 AND event_type = 'drift_resolved'
		ORDER BY detected_at DESC LIMIT 1
	`, "sub_drift_001").Scan(&resID, &resType, &resMech, &resolvesID)
	if err != nil {
		t.Fatalf("query resolution: %v", err)
	}
	if resType.String != "drift_resolved" {
		t.Errorf("expected drift_resolved; got %s", resType.String)
	}
	if resMech.String != "auto_provider_agreed" {
		t.Errorf("expected auto_provider_agreed; got %s", resMech.String)
	}
	if resolvesID.String != detID {
		t.Errorf("resolves_id mismatch: got %s, want %s", resolvesID.String, detID)
	}
}

// TestSubstrate_AppendOnlyEnforcedAtDB verifies that UPDATE, DELETE, and
// TRUNCATE all error at the database trigger layer on every interpretation
// table. This is the institutional property — application code CAN NOT
// mutate prior interpretations, no matter how it tries.
func TestSubstrate_AppendOnlyEnforcedAtDB(t *testing.T) {
	db := SetupSubstrate(t)
	ctx := context.Background()

	wsID := InsertWorkspace(t, db)
	now := time.Now().UTC()
	InsertLedgerEvent(t, db, LedgerEvent{
		StripeEventID: "evt_append_001",
		Payload:       stripeEventFixture("evt_append_001", "customer.subscription.updated", "sub_append_001", wsID, "active", now, false),
		ReceivedAt:    now,
	})
	if _, _, err := subscription.ProcessPending(ctx, db); err != nil {
		t.Fatalf("ProcessPending: %v", err)
	}

	// Find the projection id.
	var projID string
	if err := db.QueryRow(`SELECT id::text FROM subscription_projection LIMIT 1`).Scan(&projID); err != nil {
		t.Fatalf("query projection: %v", err)
	}

	// We accept either the append-only trigger error OR a foreign-key
	// referencing-constraint error. Both express the same institutional
	// property — "you cannot blow this table away" — and the FK error
	// fires before the trigger in PostgreSQL's TRUNCATE path.
	mutationBlocked := func(err error) bool {
		if err == nil {
			return false
		}
		msg := err.Error()
		return strings.Contains(msg, "append-only") ||
			strings.Contains(msg, "referenced in a foreign key")
	}

	cases := []struct {
		name string
		sql  string
		args []any
	}{
		{"projection UPDATE", `UPDATE subscription_projection SET status = 'canceled' WHERE id = $1::uuid`, []any{projID}},
		{"projection DELETE", `DELETE FROM subscription_projection WHERE id = $1::uuid`, []any{projID}},
		{"projection TRUNCATE", `TRUNCATE subscription_projection`, nil},
		{"projection TRUNCATE CASCADE", `TRUNCATE subscription_projection CASCADE`, nil},
		{"ledger UPDATE", `UPDATE stripe_event_ledger SET verify_outcome = 'fail' WHERE id IN (SELECT id FROM stripe_event_ledger LIMIT 1)`, nil},
		{"ledger DELETE", `DELETE FROM stripe_event_ledger WHERE id IN (SELECT id FROM stripe_event_ledger LIMIT 1)`, nil},
		{"ledger TRUNCATE", `TRUNCATE stripe_event_ledger`, nil},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			_, err := db.Exec(c.sql, c.args...)
			if !mutationBlocked(err) {
				t.Fatalf("%s: expected mutation to be blocked (append-only or FK), got: %v", c.name, err)
			}
		})
	}
}

// TestSubstrate_ImmutableSupersession verifies that the projection chain
// is captured via supersedes_id with no mutable markers, and that
// subscription_current_state returns the head of the chain.
func TestSubstrate_ImmutableSupersession(t *testing.T) {
	db := SetupSubstrate(t)
	ctx := context.Background()

	wsID := InsertWorkspace(t, db)
	t0 := time.Now().UTC()

	// Two events for the same subscription, in order.
	InsertLedgerEvent(t, db, LedgerEvent{
		StripeEventID: "evt_super_001",
		Payload:       stripeEventFixture("evt_super_001", "customer.subscription.updated", "sub_super_001", wsID, "trialing", t0, false),
		ReceivedAt:    t0,
	})
	InsertLedgerEvent(t, db, LedgerEvent{
		StripeEventID: "evt_super_002",
		Payload:       stripeEventFixture("evt_super_002", "customer.subscription.updated", "sub_super_001", wsID, "active", t0.Add(time.Hour), false),
		ReceivedAt:    t0.Add(time.Hour),
	})

	if _, _, err := subscription.ProcessPending(ctx, db); err != nil {
		t.Fatalf("ProcessPending: %v", err)
	}

	// Two projection rows total; second supersedes first.
	assertRowCount(t, db, `SELECT count(*)::int FROM subscription_projection`, 2)

	var headID, headSupersedesID, headStatus string
	err := db.QueryRow(`
		SELECT p.id::text, COALESCE(p.supersedes_id::text, ''), p.status
		FROM subscription_projection p
		WHERE NOT EXISTS (SELECT 1 FROM subscription_projection newer WHERE newer.supersedes_id = p.id)
	`).Scan(&headID, &headSupersedesID, &headStatus)
	if err != nil {
		t.Fatalf("head query: %v", err)
	}
	if headStatus != "active" {
		t.Errorf("expected head status=active; got %s", headStatus)
	}
	if headSupersedesID == "" {
		t.Errorf("expected head.supersedes_id to point at prior row; got empty")
	}

	// View must return exactly the head row.
	var viewStatus string
	if err := db.QueryRow(`SELECT status FROM subscription_current_state WHERE stripe_subscription_id = $1`, "sub_super_001").Scan(&viewStatus); err != nil {
		t.Fatalf("view query: %v", err)
	}
	if viewStatus != "active" {
		t.Errorf("expected view status=active; got %s", viewStatus)
	}
}

// TestSubstrate_IdempotentReplay verifies that the reducer's UNIQUE
// constraint on (stripe_subscription_id, source_event_id, reducer_version)
// prevents duplicate projection rows when the same ledger event is
// processed twice (which can happen on cursor regression / replay).
func TestSubstrate_IdempotentReplay(t *testing.T) {
	db := SetupSubstrate(t)
	ctx := context.Background()

	wsID := InsertWorkspace(t, db)
	now := time.Now().UTC()
	InsertLedgerEvent(t, db, LedgerEvent{
		StripeEventID: "evt_idem_001",
		Payload:       stripeEventFixture("evt_idem_001", "customer.subscription.updated", "sub_idem_001", wsID, "active", now, false),
		ReceivedAt:    now,
	})
	if _, _, err := subscription.ProcessPending(ctx, db); err != nil {
		t.Fatalf("first ProcessPending: %v", err)
	}
	// Reset the cursor to force a replay over the same event.
	if _, err := db.Exec(`UPDATE reducer_cursors SET cursor_received_at = $1 WHERE reducer_name = $2`, time.Unix(0, 0).UTC(), subscription.ReducerName); err != nil {
		t.Fatalf("reset cursor: %v", err)
	}
	if _, _, err := subscription.ProcessPending(ctx, db); err != nil {
		t.Fatalf("second ProcessPending: %v", err)
	}
	// Despite the replay, only one projection row exists for this event.
	assertRowCount(t, db, `SELECT count(*)::int FROM subscription_projection`, 1)
}

// TestSubstrate_OutOfOrderEmitsConflict verifies that a late event (one
// whose event_occurred_at is earlier than the current projection's)
// emits a late_event_detected conflict and does NOT supersede the chain.
func TestSubstrate_OutOfOrderEmitsConflict(t *testing.T) {
	db := SetupSubstrate(t)
	ctx := context.Background()

	wsID := InsertWorkspace(t, db)
	t0 := time.Now().UTC()

	// Event A is logically later (event_occurred_at = t0+1h) but
	// arrives FIRST. The ledger's received_at orders insertion;
	// event_occurred_at orders logical time.
	InsertLedgerEvent(t, db, LedgerEvent{
		StripeEventID: "evt_late_002",
		Payload:       stripeEventFixture("evt_late_002", "customer.subscription.updated", "sub_late_001", wsID, "active", t0.Add(time.Hour), false),
		ReceivedAt:    t0,
	})
	if _, _, err := subscription.ProcessPending(ctx, db); err != nil {
		t.Fatalf("first ProcessPending: %v", err)
	}

	// Event B arrives second but is logically EARLIER (event_occurred_at = t0).
	InsertLedgerEvent(t, db, LedgerEvent{
		StripeEventID: "evt_late_001",
		Payload:       stripeEventFixture("evt_late_001", "customer.subscription.updated", "sub_late_001", wsID, "trialing", t0, false),
		ReceivedAt:    t0.Add(time.Second), // arrives after A by received_at
	})
	_, _, err := subscription.ProcessPending(ctx, db)
	if err != nil {
		t.Fatalf("second ProcessPending: %v", err)
	}

	// Conflict was recorded with the right type.
	var conflictType string
	err = db.QueryRow(`SELECT conflict_type FROM subscription_projection_conflicts WHERE stripe_subscription_id = $1 LIMIT 1`, "sub_late_001").Scan(&conflictType)
	if err != nil {
		t.Fatalf("query conflict: %v", err)
	}
	if conflictType != "late_event_detected" {
		t.Errorf("expected late_event_detected; got %s", conflictType)
	}

	// Projection chain unchanged — still one row (the earlier-arriving
	// but logically-later event). The late event was skipped, not
	// superseded.
	assertRowCount(t, db, `SELECT count(*)::int FROM subscription_projection`, 1)

	// And the head of the chain is still status=active (from event A),
	// not status=trialing (from the late event B).
	var headStatus string
	if err := db.QueryRow(`SELECT status FROM subscription_current_state WHERE stripe_subscription_id = $1`, "sub_late_001").Scan(&headStatus); err != nil {
		t.Fatalf("view: %v", err)
	}
	if headStatus != "active" {
		t.Errorf("expected head status=active (late event must not supersede); got %s", headStatus)
	}
}

// TestSubstrate_ResolutionLatencyView verifies that the operational view
// correctly computes time-to-resolution for resolved drifts. Inserts a
// detection row and a resolution row with a known time delta, then asserts
// the view's median_resolution_seconds reflects it.
func TestSubstrate_ResolutionLatencyView(t *testing.T) {
	db := SetupSubstrate(t)

	wsID := InsertWorkspace(t, db)
	now := time.Now().UTC()
	// Insert a synthetic projection row directly (cleaner than driving
	// the reducer for a view test).
	var projID string
	err := db.QueryRow(`
		INSERT INTO subscription_projection (
			stripe_subscription_id, workspace_id, status,
			field_authority, projection_version, reducer_version,
			source_event_id, source_ingestion_version,
			replay_epoch_id, event_occurred_at
		) VALUES ($1, $2::uuid, $3, $4::jsonb, $5, $6, $7, $8,
			(SELECT id FROM replay_epochs WHERE reducer_name = $9 LIMIT 1),
			$10)
		RETURNING id::text
	`,
		"sub_latency_001", wsID, "active",
		`{"status": "webhook"}`, "v1", "v1",
		"evt_synthetic", "test",
		"subscription",
		now,
	).Scan(&projID)
	if err != nil {
		// May fail because no replay_epochs row exists. Insert one.
		_, _ = db.Exec(`INSERT INTO replay_epochs (reducer_name, reducer_version) VALUES ($1, $2)`, "subscription", "v1")
		err = db.QueryRow(`
			INSERT INTO subscription_projection (
				stripe_subscription_id, workspace_id, status,
				field_authority, projection_version, reducer_version,
				source_event_id, source_ingestion_version,
				replay_epoch_id, event_occurred_at
			) VALUES ($1, $2::uuid, $3, $4::jsonb, $5, $6, $7, $8,
				(SELECT id FROM replay_epochs WHERE reducer_name = $9 LIMIT 1),
				$10)
			RETURNING id::text
		`,
			"sub_latency_001", wsID, "active",
			`{"status": "webhook"}`, "v1", "v1",
			"evt_synthetic", "test",
			"subscription",
			now,
		).Scan(&projID)
		if err != nil {
			t.Fatalf("insert synthetic projection: %v", err)
		}
	}

	// Insert detection at T, resolution at T+5min (300s).
	detectedAt := now.Add(-10 * time.Minute)
	resolvedAt := detectedAt.Add(300 * time.Second)

	var detectionID string
	err = db.QueryRow(`
		INSERT INTO subscription_reconciliation_events (
			stripe_subscription_id, event_type, severity,
			projection_id_at_detection,
			detector_name, detector_version, reducer_version,
			detected_at
		) VALUES ($1, 'drift_major', 'critical', $2::uuid, 'test', 'v1', 'v1', $3)
		RETURNING id::text
	`, "sub_latency_001", projID, detectedAt).Scan(&detectionID)
	if err != nil {
		t.Fatalf("insert detection: %v", err)
	}

	_, err = db.Exec(`
		INSERT INTO subscription_reconciliation_events (
			stripe_subscription_id, event_type, severity,
			projection_id_at_detection, resolves_id, resolution_mechanism,
			detector_name, detector_version, reducer_version,
			detected_at
		) VALUES ($1, 'drift_resolved', 'informational', $2::uuid, $3::uuid, 'auto_provider_agreed', 'test', 'v1', 'v1', $4)
	`, "sub_latency_001", projID, detectionID, resolvedAt)
	if err != nil {
		t.Fatalf("insert resolution: %v", err)
	}

	// View should report median around 300s.
	var medianSec sql.NullFloat64
	err = db.QueryRow(`
		SELECT median_resolution_seconds FROM subscription_drift_resolution_latency
		WHERE event_type = 'drift_major'
	`).Scan(&medianSec)
	if err != nil {
		t.Fatalf("query view: %v", err)
	}
	if !medianSec.Valid || medianSec.Float64 < 290 || medianSec.Float64 > 310 {
		t.Errorf("expected median around 300s; got %v", medianSec)
	}
}

// TestSubstrate_ReplayEpochLineage verifies that projections carry the
// epoch id under which they were written and that completed epochs are
// immutable.
func TestSubstrate_ReplayEpochLineage(t *testing.T) {
	db := SetupSubstrate(t)
	ctx := context.Background()

	wsID := InsertWorkspace(t, db)
	now := time.Now().UTC()

	InsertLedgerEvent(t, db, LedgerEvent{
		StripeEventID: "evt_epoch_001",
		Payload:       stripeEventFixture("evt_epoch_001", "customer.subscription.updated", "sub_epoch_001", wsID, "active", now, false),
		ReceivedAt:    now,
	})
	if _, _, err := subscription.ProcessPending(ctx, db); err != nil {
		t.Fatalf("ProcessPending: %v", err)
	}

	// Projection's replay_epoch_id must reference a completed epoch.
	var epochID, completedAt sql.NullString
	err := db.QueryRow(`
		SELECT p.replay_epoch_id::text, e.completed_at::text
		FROM subscription_projection p
		JOIN replay_epochs e ON e.id = p.replay_epoch_id
		LIMIT 1
	`).Scan(&epochID, &completedAt)
	if err != nil {
		t.Fatalf("query epoch lineage: %v", err)
	}
	if !epochID.Valid {
		t.Errorf("expected epoch_id on projection; got NULL")
	}
	if !completedAt.Valid {
		t.Errorf("expected completed_at on epoch; got NULL")
	}

	// Now confirm the completed epoch is immutable — attempt an UPDATE.
	_, err = db.Exec(`UPDATE replay_epochs SET events_processed = events_processed + 1 WHERE id = $1::uuid`, epochID.String)
	if err == nil {
		t.Fatal("expected error updating completed epoch; got nil")
	}
	if !strings.Contains(err.Error(), "terminal") && !strings.Contains(err.Error(), "append-only") {
		t.Errorf("expected terminal/append-only error; got: %v", err)
	}
}

// ---- helpers ----------------------------------------------------------

func runDetectorSweep(t *testing.T, db *sql.DB) {
	t.Helper()
	d := &drift.Detector{DB: db, Provider: authority.NewBillingProvider(db)}
	// Use sweep via Run with a context that cancels after 1 tick:
	// because Tick defaults to 60s, we exploit that by using a
	// short-lived context and calling Run; the first sweep runs
	// synchronously before the first select on tick.
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	_ = d.Run(ctx)
}

func assertRowCount(t *testing.T, db *sql.DB, query string, expected int) {
	t.Helper()
	var n int
	if err := db.QueryRow(query).Scan(&n); err != nil {
		t.Fatalf("row count query (%s): %v", query, err)
	}
	if n != expected {
		t.Errorf("row count mismatch for (%s): got %d, want %d", query, n, expected)
	}
}

func assertSubscriptionStatusInView(t *testing.T, db *sql.DB, subID, expected string) {
	t.Helper()
	var status string
	if err := db.QueryRow(`SELECT status FROM subscription_current_state WHERE stripe_subscription_id = $1`, subID).Scan(&status); err != nil {
		t.Fatalf("view query: %v", err)
	}
	if status != expected {
		t.Errorf("view status mismatch for %s: got %s, want %s", subID, status, expected)
	}
}

func ptrTime(t time.Time) *time.Time { return &t }
