-- Reducer infrastructure: replay epochs.
--
-- Every projection row references the epoch that produced it. Epochs are
-- mutable WHILE in-flight (events_processed, projections_written, etc.
-- update as the run progresses) but immutable after completed_at is set —
-- preserving the institutional property "no rewriting of completed history"
-- without forcing one-row-per-progress-update.
--
-- Also defines two generic trigger functions for append-only enforcement
-- that subsequent migrations reuse on each interpretation/audit table.
-- The existing stripe_event_ledger keeps its table-specific function from
-- migration 0012 for backwards compatibility; new tables use the generic
-- versions defined here.

CREATE OR REPLACE FUNCTION append_only_table_block_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION '% is append-only; % is forbidden',
        TG_TABLE_NAME, TG_OP
        USING ERRCODE = 'feature_not_supported';
END;
$$;

CREATE OR REPLACE FUNCTION append_only_table_block_truncate()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION '% is append-only; TRUNCATE is forbidden', TG_TABLE_NAME
        USING ERRCODE = 'feature_not_supported';
END;
$$;

CREATE TABLE IF NOT EXISTS replay_epochs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    reducer_name text NOT NULL,
    reducer_version text NOT NULL,

    -- Lifecycle. completed_at and aborted_at are mutually exclusive end states.
    started_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    aborted_at timestamptz,
    abort_reason text,

    -- Scope: the range of ledger events this epoch is responsible for.
    -- For backfill, the starting bound is null. For tail runs, the ending
    -- bound is null until the epoch is closed.
    starting_event_received_at timestamptz,
    ending_event_received_at timestamptz,

    -- Outcomes — updated as the run progresses; frozen after completion.
    events_processed bigint NOT NULL DEFAULT 0,
    projections_written bigint NOT NULL DEFAULT 0,
    conflicts_emitted bigint NOT NULL DEFAULT 0,

    -- Determinism artifact: hash over all projection rows produced in this epoch.
    -- Cross-version replay verification compares checksums to detect logic drift.
    projection_checksum text,

    -- Drift summary as structured data for later cross-epoch comparison.
    drift_summary jsonb,

    CONSTRAINT epoch_terminal_state CHECK (
        completed_at IS NULL OR aborted_at IS NULL
    )
);

-- Mutable during epoch lifetime; immutable after terminal state is set.
CREATE OR REPLACE FUNCTION replay_epochs_block_terminal_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.completed_at IS NOT NULL OR OLD.aborted_at IS NOT NULL THEN
        RAISE EXCEPTION 'replay_epochs row % is terminal (completed_at=% aborted_at=%); cannot UPDATE',
            OLD.id, OLD.completed_at, OLD.aborted_at
            USING ERRCODE = 'feature_not_supported';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS replay_epochs_no_update_after_terminal ON replay_epochs;
CREATE TRIGGER replay_epochs_no_update_after_terminal
    BEFORE UPDATE ON replay_epochs
    FOR EACH ROW EXECUTE FUNCTION replay_epochs_block_terminal_mutation();

-- DELETE is never allowed; once an epoch exists, its existence is part of
-- the audit trail.
DROP TRIGGER IF EXISTS replay_epochs_no_delete ON replay_epochs;
CREATE TRIGGER replay_epochs_no_delete
    BEFORE DELETE ON replay_epochs
    FOR EACH ROW EXECUTE FUNCTION append_only_table_block_mutation();

DROP TRIGGER IF EXISTS replay_epochs_no_truncate ON replay_epochs;
CREATE TRIGGER replay_epochs_no_truncate
    BEFORE TRUNCATE ON replay_epochs
    FOR EACH STATEMENT EXECUTE FUNCTION append_only_table_block_truncate();

-- Active epochs lookup (e.g., to detect a stuck/concurrent backfill).
CREATE INDEX IF NOT EXISTS replay_epochs_active_idx
    ON replay_epochs (reducer_name, started_at DESC)
    WHERE completed_at IS NULL AND aborted_at IS NULL;

-- Lifetime epoch history per reducer.
CREATE INDEX IF NOT EXISTS replay_epochs_by_reducer_idx
    ON replay_epochs (reducer_name, started_at DESC);
