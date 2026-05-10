-- Reducer cursor table.
--
-- Each (reducer_name, reducer_version) pair has exactly one cursor row.
-- The reducer advances the cursor in the SAME transaction as the
-- projection write — that's the transactional outbox pattern from
-- LEDGER_CONTRACT.md, and it's what turns at-least-once delivery into
-- bounded-replay-on-consumer-side.
--
-- Unlike projections and epochs, this table is intentionally mutable on
-- the cursor fields. The cursor's job is to advance. The institutional
-- property is preserved at the layer above: every projection row carries
-- both the source_event_id (proves what was processed) and replay_epoch_id
-- (proves under which run). The cursor itself is operational state, not
-- evidence.

CREATE TABLE IF NOT EXISTS reducer_cursors (
    reducer_name text NOT NULL,
    reducer_version text NOT NULL,

    -- Position in the ledger that has been fully processed. The reducer
    -- guarantees: every event with received_at <= cursor_received_at AND
    -- (received_at < cursor_received_at OR id <= cursor_event_id) has
    -- either produced a projection row, an explicit "no projection"
    -- record, or a conflict row.
    cursor_received_at timestamptz NOT NULL,
    cursor_event_id uuid,

    -- Liveness signal: a heartbeat without cursor advancement means the
    -- reducer is up but not making progress (no new events, or stuck).
    last_heartbeat_at timestamptz NOT NULL DEFAULT now(),

    -- Updated on every cursor advance.
    updated_at timestamptz NOT NULL DEFAULT now(),

    -- Optional: the epoch within which this cursor is currently advancing.
    current_epoch_id uuid REFERENCES replay_epochs(id),

    PRIMARY KEY (reducer_name, reducer_version)
);

-- Stuck-cursor lookup: cursors whose heartbeat is recent but updated_at is old
-- mean the reducer is running but not advancing.
CREATE INDEX IF NOT EXISTS reducer_cursors_stuck_idx
    ON reducer_cursors (last_heartbeat_at, updated_at);
