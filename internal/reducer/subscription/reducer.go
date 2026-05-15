package subscription

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"
)

// ReducerName is the canonical identifier for this reducer. Used as the
// key in reducer_cursors and replay_epochs.
const ReducerName = "subscription"

// ledgerEventOnDisk mirrors the columns the reducer reads from
// stripe_event_ledger. The payload is the raw bytes Stripe sent; the
// reducer parses it into a StripeEvent for processing.
type ledgerEventOnDisk struct {
	LedgerID         string
	StripeEventID    string
	Payload          string
	IngestionVersion string
	VerifyOutcome    string
	ReceivedAt       time.Time
}

// stripeEvent is the minimal shape the reducer needs from the parsed
// payload. We don't depend on the full Stripe SDK here — only the fields
// the merge function cares about.
type stripeEvent struct {
	ID         string          `json:"id"`
	Type       string          `json:"type"`
	Created    int64           `json:"created"`
	APIVersion string          `json:"api_version"`
	Account    string          `json:"account"`
	Data       stripeEventData `json:"data"`
}

type stripeEventData struct {
	Object json.RawMessage `json:"object"`
}

// Run is the reducer's main loop. It either runs in backfill mode (scan
// the entire ledger range and project) or in tail mode (process new events
// arriving). Both modes use the same per-batch logic; they differ only in
// the cursor's initial position and termination condition.
//
// The function returns when:
//   - The context is canceled (clean shutdown).
//   - A non-retryable error occurs (returns the error).
//
// Backfill mode terminates the epoch when the cursor catches up to the
// time of process start. Tail mode runs indefinitely until canceled.
func Run(ctx context.Context, db *sql.DB, logger *slog.Logger, mode Mode) error {
	if logger == nil {
		logger = slog.Default()
	}
	logger = logger.With(
		"reducer", ReducerName,
		"version", ReducerVersion,
		"mode", string(mode),
	)
	logger.Info("reducer starting")

	// Start a fresh epoch for this run.
	epochID, err := startEpoch(ctx, db, mode)
	if err != nil {
		return fmt.Errorf("start epoch: %w", err)
	}
	logger = logger.With("epoch", epochID)
	logger.Info("epoch started")

	// Load (or initialize) the cursor.
	cursor, err := loadOrInitCursor(ctx, db)
	if err != nil {
		_ = abortEpoch(ctx, db, epochID, fmt.Sprintf("load cursor: %v", err))
		return fmt.Errorf("load cursor: %w", err)
	}
	logger.Info("cursor loaded", "cursor_received_at", cursor.ReceivedAt)

	// Backfill mode: process up to "now"; tail mode: process indefinitely.
	terminateAt := time.Now().UTC()
	const batchSize = 200

	for {
		select {
		case <-ctx.Done():
			logger.Info("reducer canceled")
			return abortEpoch(ctx, db, epochID, "context canceled")
		default:
		}

		var upperBound *time.Time
		if mode == ModeBackfill {
			upperBound = &terminateAt
		}

		scanned, projections, lastReceivedAt, lastID, conflicts, err := processBatch(ctx, db, cursor, epochID, batchSize, upperBound)
		if err != nil {
			logger.Error("batch failed", "error", err)
			// On a batch error, abort the epoch so we can investigate.
			// The cursor stays at its last successful position.
			_ = abortEpoch(ctx, db, epochID, fmt.Sprintf("batch error: %v", err))
			return err
		}

		// Update epoch counters in-flight.
		if scanned > 0 {
			if err := updateEpochCounters(ctx, db, epochID, scanned, projections, conflicts); err != nil {
				logger.Warn("epoch counter update failed", "error", err)
			}
		}

		// If nothing processed and we're in backfill mode, check whether
		// we've caught up.
		if scanned == 0 {
			if mode == ModeBackfill {
				logger.Info("backfill complete")
				return completeEpoch(ctx, db, epochID)
			}
			if err := touchCursorHeartbeat(ctx, db, epochID); err != nil {
				logger.Warn("cursor heartbeat failed", "error", err)
			}
			// Idle: sleep briefly to avoid hammering the DB.
			select {
			case <-ctx.Done():
				return abortEpoch(ctx, db, epochID, "context canceled during idle")
			case <-time.After(30 * time.Second):
			}
			continue
		}

		// Cursor advanced. Continue without sleeping.
		cursor.ReceivedAt = lastReceivedAt
		cursor.EventID = lastID
		logger.Info("batch processed", "events_scanned", scanned, "projections_written", projections, "conflicts_emitted", conflicts, "cursor_at", lastReceivedAt)
	}
}

// Mode controls reducer termination behavior.
type Mode string

const (
	ModeBackfill Mode = "backfill"
	ModeTail     Mode = "tail"
)

// ProcessPending drains all currently-pending ledger events through the
// reducer and returns when no more events are available. Used by the
// substrate validation harness and by operational tooling that needs a
// bounded one-shot run rather than the long-lived Run loop.
//
// Unlike Run, ProcessPending does NOT manage an epoch lifecycle — the
// caller is responsible for that. The function processes events under
// whichever epoch row the cursor currently references (or starts a new
// epoch if none, via the same startEpoch helper).
//
// Returns the total number of events processed and the total conflicts
// emitted.
func ProcessPending(ctx context.Context, db *sql.DB) (processedTotal, conflictsTotal int, err error) {
	epochID, err := startEpoch(ctx, db, ModeBackfill)
	if err != nil {
		return 0, 0, fmt.Errorf("start epoch: %w", err)
	}
	cursor, err := loadOrInitCursor(ctx, db)
	if err != nil {
		_ = abortEpoch(ctx, db, epochID, fmt.Sprintf("load cursor: %v", err))
		return 0, 0, fmt.Errorf("load cursor: %w", err)
	}

	const batchSize = 200
	for {
		if ctx.Err() != nil {
			_ = abortEpoch(ctx, db, epochID, "context canceled")
			return processedTotal, conflictsTotal, ctx.Err()
		}
		scanned, projections, lastReceivedAt, lastID, conflicts, perr := processBatch(ctx, db, cursor, epochID, batchSize, nil)
		if perr != nil {
			_ = abortEpoch(ctx, db, epochID, fmt.Sprintf("batch error: %v", perr))
			return processedTotal, conflictsTotal, perr
		}
		processedTotal += projections
		conflictsTotal += conflicts
		if scanned > 0 {
			_ = updateEpochCounters(ctx, db, epochID, scanned, projections, conflicts)
			cursor.ReceivedAt = lastReceivedAt
			cursor.EventID = lastID
			continue
		}
		// No more pending events.
		_ = completeEpoch(ctx, db, epochID)
		return processedTotal, conflictsTotal, nil
	}
}

// Cursor is the in-memory representation of reducer_cursors. The DB row
// is the authoritative source; this struct mirrors it for the duration of
// a batch.
type Cursor struct {
	ReceivedAt time.Time
	EventID    sql.NullString
}

// processBatch reads the next batch of ledger events, processes each
// through the merge function, and persists projections + conflicts +
// advances the cursor — all inside a single transaction per event.
//
// Returns the number of events processed, the cursor position after the
// batch, the cumulative conflict count, and any unrecoverable error.
func processBatch(ctx context.Context, db *sql.DB, cursor Cursor, epochID string, batchSize int, upperBound *time.Time) (scanned int, projections int, lastAt time.Time, lastID sql.NullString, conflicts int, err error) {
	// Read the next batch from the ledger. We filter to event types this
	// reducer cares about. Only successfully-verified deliveries are
	// processed (signature failures and malformed bodies are forensic
	// only, not interpretable).
	var upperBoundValue any
	if upperBound != nil {
		upperBoundValue = *upperBound
	}
	rows, err := db.QueryContext(ctx, `
		SELECT id::text, stripe_event_id, payload, ingestion_version, verify_outcome, received_at
		FROM stripe_event_ledger
		WHERE verify_outcome IN ('primary', 'fallback', 'connect', 'per_account')
		  AND (
			received_at > $1
			OR (
				received_at = $1
				AND ($2::uuid IS NULL OR id > $2::uuid)
			)
		  )
		  AND ($3::timestamptz IS NULL OR received_at <= $3::timestamptz)
		ORDER BY received_at, id
		LIMIT $4
	`, cursor.ReceivedAt, cursor.EventID, upperBoundValue, batchSize)
	if err != nil {
		return 0, 0, lastAt, lastID, 0, fmt.Errorf("scan ledger: %w", err)
	}
	defer rows.Close()

	var batch []ledgerEventOnDisk
	for rows.Next() {
		var row ledgerEventOnDisk
		if err := rows.Scan(&row.LedgerID, &row.StripeEventID, &row.Payload, &row.IngestionVersion, &row.VerifyOutcome, &row.ReceivedAt); err != nil {
			return 0, 0, lastAt, lastID, 0, fmt.Errorf("scan row: %w", err)
		}
		batch = append(batch, row)
	}
	if err := rows.Err(); err != nil {
		return 0, 0, lastAt, lastID, 0, fmt.Errorf("iterate ledger rows: %w", err)
	}

	for _, row := range batch {
		projected, ec, err := processSingleEvent(ctx, db, row, epochID)
		if err != nil {
			return scanned, projections, lastAt, lastID, conflicts, fmt.Errorf("process event %s: %w", row.LedgerID, err)
		}
		scanned++
		if projected {
			projections++
		}
		conflicts += ec
		lastAt = row.ReceivedAt
		lastID = sql.NullString{String: row.LedgerID, Valid: true}
	}

	return scanned, projections, lastAt, lastID, conflicts, nil
}

// processSingleEvent handles one ledger row inside its own transaction:
// parse → resolve workspace → load current projection → merge → persist
// projection/conflicts → advance cursor.
//
// Returns ok=true if a projection or conflict was emitted; ok=false if
// the event was an unhandled type or had no resolvable workspace (in
// which case the cursor still advances).
func processSingleEvent(ctx context.Context, db *sql.DB, row ledgerEventOnDisk, epochID string) (projected bool, conflictCount int, err error) {
	var parsed stripeEvent
	if jerr := json.Unmarshal([]byte(row.Payload), &parsed); jerr != nil {
		// Malformed payload shouldn't reach the reducer (ledger
		// captures malformed entries with verify_outcome='malformed'
		// which the SELECT filters out), but defend anyway.
		return false, 0, advanceCursorOnly(ctx, db, row, epochID)
	}

	// Only handle subscription events in v1.
	if !isSubscriptionEvent(parsed.Type) {
		return false, 0, advanceCursorOnly(ctx, db, row, epochID)
	}

	var sub StripeSubscription
	if jerr := json.Unmarshal(parsed.Data.Object, &sub); jerr != nil || sub.ID == "" {
		return false, 0, advanceCursorOnly(ctx, db, row, epochID)
	}

	// Resolve workspace_id via billing_customers (subscription.customer
	// is the Stripe customer id; billing_customers maps that to the
	// internal workspace).
	workspaceID, err := resolveWorkspaceForSubscription(ctx, db, parsed.Data.Object)
	if err != nil {
		return false, 0, fmt.Errorf("resolve workspace: %w", err)
	}
	if workspaceID == "" {
		// No workspace match — log and advance. This happens for
		// historical events that predate our processor_connections
		// rows.
		return false, 0, advanceCursorOnly(ctx, db, row, epochID)
	}

	event := &Event{
		LedgerEventID:          row.LedgerID,
		SourceEventID:          parsed.ID,
		SourceIngestionVersion: row.IngestionVersion,
		EventType:              parsed.Type,
		OccurredAt:             time.Unix(parsed.Created, 0).UTC(),
		Subscription:           &sub,
		WorkspaceID:            workspaceID,
	}

	// Load current projection.
	current, err := loadCurrentProjection(ctx, db, sub.ID)
	if err != nil {
		return false, 0, fmt.Errorf("load current projection: %w", err)
	}

	// Apply merge function.
	result := Merge(current, event, EventSourceWebhook)

	// Persist inside one transaction: projection (if any) +
	// conflicts (if any) + cursor advance.
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return false, 0, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	var supersedesID sql.NullString
	if current != nil {
		// We need the current projection's id; reload inside the tx for safety.
		var id string
		err := tx.QueryRowContext(ctx, `
			SELECT id::text FROM subscription_projection
			WHERE stripe_subscription_id = $1
			  AND NOT EXISTS (
				SELECT 1 FROM subscription_projection newer
				WHERE newer.supersedes_id = subscription_projection.id
			  )
			ORDER BY projected_at DESC
			LIMIT 1
		`, sub.ID).Scan(&id)
		if err == nil {
			supersedesID = sql.NullString{String: id, Valid: true}
		} else if !errors.Is(err, sql.ErrNoRows) {
			return false, 0, fmt.Errorf("re-load current id: %w", err)
		}
	}

	if result.Next != nil {
		authorityJSON, _ := result.Next.MarshalFieldAuthority()
		res, err := tx.ExecContext(ctx, `
			INSERT INTO subscription_projection (
				stripe_subscription_id, workspace_id,
				status, current_period_start, current_period_end,
				cancel_at_period_end, canceled_at, trial_start, trial_end,
				field_authority,
				projection_version, reducer_version, source_event_id, source_ingestion_version,
				replay_epoch_id, supersedes_id, event_occurred_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
			ON CONFLICT (stripe_subscription_id, source_event_id, reducer_version) DO NOTHING
		`,
			result.Next.StripeSubscriptionID,
			result.Next.WorkspaceID,
			result.Next.Status,
			result.Next.CurrentPeriodStart,
			result.Next.CurrentPeriodEnd,
			result.Next.CancelAtPeriodEnd,
			result.Next.CanceledAt,
			result.Next.TrialStart,
			result.Next.TrialEnd,
			authorityJSON,
			ProjectionVersion,
			ReducerVersion,
			event.SourceEventID,
			event.SourceIngestionVersion,
			epochID,
			supersedesID,
			event.OccurredAt,
		)
		if err != nil {
			return false, 0, fmt.Errorf("insert projection: %w", err)
		}
		if rows, err := res.RowsAffected(); err == nil && rows > 0 {
			projected = true
		}
	}

	for _, c := range result.Conflicts {
		details, _ := json.Marshal(c.Details)
		_, err := tx.ExecContext(ctx, `
			INSERT INTO subscription_projection_conflicts (
				stripe_subscription_id, conflict_type, source_event_id, related_projection_id,
				details, reducer_version, replay_epoch_id
			) VALUES ($1, $2, $3, $4, $5, $6, $7)
		`,
			sub.ID, string(c.Type), event.SourceEventID, supersedesID, details, ReducerVersion, epochID,
		)
		if err != nil {
			return false, 0, fmt.Errorf("insert conflict: %w", err)
		}
		conflictCount++
	}

	// Advance cursor in the same transaction.
	if err := advanceCursor(ctx, tx, row, epochID); err != nil {
		return false, conflictCount, fmt.Errorf("advance cursor: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return false, conflictCount, fmt.Errorf("commit: %w", err)
	}

	return projected, conflictCount, nil
}

func isSubscriptionEvent(eventType string) bool {
	switch eventType {
	case "customer.subscription.created",
		"customer.subscription.updated",
		"customer.subscription.deleted":
		return true
	}
	return false
}

// resolveWorkspaceForSubscription extracts the internal workspace id from
// the subscription's Stripe customer. Returns "" if unresolvable, which
// is treated as a clean skip rather than an error.
func resolveWorkspaceForSubscription(ctx context.Context, db *sql.DB, raw json.RawMessage) (string, error) {
	var sub struct {
		Customer string `json:"customer"`
		Metadata struct {
			WorkspaceID string `json:"workspaceId"`
		} `json:"metadata"`
	}
	if err := json.Unmarshal(raw, &sub); err != nil {
		return "", nil
	}

	// Prefer explicit workspace metadata if present (platform billing
	// subscriptions carry this).
	if sub.Metadata.WorkspaceID != "" {
		var id string
		err := db.QueryRowContext(ctx,
			`SELECT id::text FROM workspaces WHERE id::text = $1 OR clerk_org_id = $1 LIMIT 1`,
			sub.Metadata.WorkspaceID,
		).Scan(&id)
		if err == nil {
			return id, nil
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return "", err
		}
	}

	// Fall back to the billing_customers mapping.
	if sub.Customer == "" {
		return "", nil
	}
	var id string
	err := db.QueryRowContext(ctx,
		`SELECT workspace_id::text FROM billing_customers WHERE stripe_customer_id = $1 LIMIT 1`,
		sub.Customer,
	).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return id, nil
}

// loadCurrentProjection reads the current (non-superseded) projection for
// a subscription. Returns nil if no projection exists yet.
func loadCurrentProjection(ctx context.Context, db *sql.DB, subID string) (*State, error) {
	var s State
	var authorityJSON []byte
	err := db.QueryRowContext(ctx, `
		SELECT
			stripe_subscription_id, workspace_id::text,
			status, current_period_start, current_period_end,
			cancel_at_period_end, canceled_at, trial_start, trial_end,
			field_authority,
			event_occurred_at
		FROM subscription_projection
		WHERE stripe_subscription_id = $1
		  AND NOT EXISTS (
			SELECT 1 FROM subscription_projection newer
			WHERE newer.supersedes_id = subscription_projection.id
		  )
		ORDER BY projected_at DESC
		LIMIT 1
	`, subID).Scan(
		&s.StripeSubscriptionID, &s.WorkspaceID,
		&s.Status, &s.CurrentPeriodStart, &s.CurrentPeriodEnd,
		&s.CancelAtPeriodEnd, &s.CanceledAt, &s.TrialStart, &s.TrialEnd,
		&authorityJSON,
		&s.EventOccurredAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(authorityJSON, &s.FieldAuthority)
	return &s, nil
}

// startEpoch begins a new replay epoch row.
func startEpoch(ctx context.Context, db *sql.DB, mode Mode) (string, error) {
	var id string
	err := db.QueryRowContext(ctx, `
		INSERT INTO replay_epochs (reducer_name, reducer_version, started_at)
		VALUES ($1, $2, now()) RETURNING id::text
	`, ReducerName, ReducerVersion).Scan(&id)
	return id, err
}

func updateEpochCounters(ctx context.Context, db *sql.DB, epochID string, scanned, projections, conflicts int) error {
	_, err := db.ExecContext(ctx, `
		UPDATE replay_epochs
			SET events_processed = events_processed + $2,
			projections_written = projections_written + $3,
			conflicts_emitted = conflicts_emitted + $4
		WHERE id = $1::uuid
		  AND completed_at IS NULL AND aborted_at IS NULL
	`, epochID, scanned, projections, conflicts)
	return err
}

func completeEpoch(ctx context.Context, db *sql.DB, epochID string) error {
	_, err := db.ExecContext(ctx, `
		WITH checksum AS (
			SELECT md5(COALESCE(string_agg(
				concat_ws('|',
					stripe_subscription_id,
					workspace_id::text,
					status,
					COALESCE(current_period_start::text, ''),
					COALESCE(current_period_end::text, ''),
					cancel_at_period_end::text,
					COALESCE(canceled_at::text, ''),
					COALESCE(trial_start::text, ''),
					COALESCE(trial_end::text, ''),
					field_authority::text,
					projection_version,
					reducer_version,
					source_event_id,
					source_ingestion_version,
					event_occurred_at::text
				),
				E'\n' ORDER BY stripe_subscription_id, event_occurred_at, source_event_id
			), '')) AS value
			FROM subscription_projection
			WHERE replay_epoch_id = $1::uuid
		)
		UPDATE replay_epochs
		SET completed_at = now(),
			projection_checksum = checksum.value
		FROM checksum
		WHERE id = $1::uuid
	`, epochID)
	return err
}

func abortEpoch(ctx context.Context, db *sql.DB, epochID string, reason string) error {
	_, err := db.ExecContext(ctx, `
		UPDATE replay_epochs SET aborted_at = now(), abort_reason = $2 WHERE id = $1::uuid
	`, epochID, reason)
	return err
}

// loadOrInitCursor reads the cursor; if none exists, initializes at epoch 0.
func loadOrInitCursor(ctx context.Context, db *sql.DB) (Cursor, error) {
	var c Cursor
	err := db.QueryRowContext(ctx, `
		SELECT cursor_received_at, cursor_event_id::text
		FROM reducer_cursors
		WHERE reducer_name = $1 AND reducer_version = $2
	`, ReducerName, ReducerVersion).Scan(&c.ReceivedAt, &c.EventID)
	if errors.Is(err, sql.ErrNoRows) {
		// Initialize at epoch 0 so the first scan reads from the
		// beginning of the ledger.
		c.ReceivedAt = time.Unix(0, 0).UTC()
		_, err = db.ExecContext(ctx, `
			INSERT INTO reducer_cursors (reducer_name, reducer_version, cursor_received_at)
			VALUES ($1, $2, $3)
		`, ReducerName, ReducerVersion, c.ReceivedAt)
		return c, err
	}
	return c, err
}

// advanceCursor updates the cursor inside the current transaction. The
// caller is responsible for committing — that's the transactional outbox
// pattern: projection write + cursor advance happen atomically.
func advanceCursor(ctx context.Context, tx *sql.Tx, row ledgerEventOnDisk, epochID string) error {
	_, err := tx.ExecContext(ctx, `
		UPDATE reducer_cursors
		SET cursor_received_at = $3,
			cursor_event_id = $4::uuid,
			last_heartbeat_at = now(),
			updated_at = now(),
			current_epoch_id = $5::uuid
		WHERE reducer_name = $1 AND reducer_version = $2
	`, ReducerName, ReducerVersion, row.ReceivedAt, row.LedgerID, epochID)
	return err
}

func touchCursorHeartbeat(ctx context.Context, db *sql.DB, epochID string) error {
	_, err := db.ExecContext(ctx, `
		UPDATE reducer_cursors
		SET last_heartbeat_at = now(),
			current_epoch_id = $3::uuid
		WHERE reducer_name = $1 AND reducer_version = $2
	`, ReducerName, ReducerVersion, epochID)
	return err
}

// advanceCursorOnly is used when an event is skipped (unhandled type, no
// workspace, etc.) — we still want the cursor to advance so we don't
// reread the same skipped event forever.
func advanceCursorOnly(ctx context.Context, db *sql.DB, row ledgerEventOnDisk, epochID string) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err := advanceCursor(ctx, tx, row, epochID); err != nil {
		return err
	}
	return tx.Commit()
}
