-- Subscription projection: the first reducer-derived state surface.
--
-- Append-only. Each row is an immutable interpretation produced by the
-- reducer at a specific point in time, sourced from a specific ledger
-- event, under a specific reducer version, within a specific replay epoch.
--
-- "Current state" is derived from graph topology, not from mutable
-- supersession markers:
--
--   SELECT p.* FROM subscription_projection p
--   WHERE NOT EXISTS (
--     SELECT 1 FROM subscription_projection newer
--     WHERE newer.supersedes_id = p.id
--   )
--
-- No row ever changes after insertion. That is what makes "show me what
-- the system believed on 2026-05-10 at 14:03 UTC" answerable with
-- cryptographic precision.
--
-- This table participates in projection-only mode. The canonical
-- billing_subscriptions table is unaffected and continues to be the
-- production source of truth. The drift-detection job (in a follow-up
-- migration set) will compare interpretations across the two surfaces.

CREATE TABLE IF NOT EXISTS subscription_projection (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Entity identity. workspace_id is denormalized for query efficiency;
    -- the canonical join would go through billing_subscriptions.
    stripe_subscription_id text NOT NULL,
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE RESTRICT,

    -- Interpreted state (the reducer's conclusion).
    status text NOT NULL,
    current_period_start timestamptz,
    current_period_end timestamptz,
    cancel_at_period_end boolean NOT NULL DEFAULT false,
    canceled_at timestamptz,
    trial_start timestamptz,
    trial_end timestamptz,

    -- Field-level authority arbitration. jsonb mapping of state-field-name
    -- to authority-source ('webhook' | 'polling' | 'manual'). The reducer
    -- records which input determined each interpreted value. Once the
    -- authority policy stabilizes, this column may be flattened into
    -- typed columns (semantic surface vs physical strategy).
    field_authority jsonb NOT NULL,

    -- Provenance — mandatory per the directive.
    projection_version text NOT NULL,
    reducer_version text NOT NULL,
    source_event_id text NOT NULL,
    source_ingestion_version text NOT NULL,
    replay_epoch_id uuid NOT NULL REFERENCES replay_epochs(id),

    -- Supersession (immutable). The chain is the audit trail of how the
    -- system's interpretation evolved over time. Currentness derives from
    -- "no newer row points at me," not from any mutable marker.
    supersedes_id uuid REFERENCES subscription_projection(id),

    -- Timing.
    projected_at timestamptz NOT NULL DEFAULT now(),
    event_occurred_at timestamptz NOT NULL,

    -- Reducer idempotency: same (subscription, source event, reducer version)
    -- can only project once. Re-running an epoch is safe — it'll either
    -- produce identical projections (no-op) or fail this constraint, which
    -- the reducer detects and treats as a clean skip.
    UNIQUE (stripe_subscription_id, source_event_id, reducer_version)
);

-- "Current state" view. NOT a serving guarantee — this is the semantic
-- contract. Promote to materialized view / projection cache / read replica
-- as workload demands without changing this view's name or shape.
CREATE OR REPLACE VIEW subscription_current_state AS
SELECT p.*
FROM subscription_projection p
WHERE NOT EXISTS (
    SELECT 1 FROM subscription_projection newer
    WHERE newer.supersedes_id = p.id
);

COMMENT ON VIEW subscription_current_state IS
    'Semantic contract: the most recent interpretation per subscription. Today implemented as a regular view; may be promoted to materialized view, cache, or read replica without contract change. Treat this name as stable; treat the physical implementation as evolving.';

-- Append-only enforcement.
DROP TRIGGER IF EXISTS subscription_projection_no_update ON subscription_projection;
CREATE TRIGGER subscription_projection_no_update
    BEFORE UPDATE ON subscription_projection
    FOR EACH ROW EXECUTE FUNCTION append_only_table_block_mutation();

DROP TRIGGER IF EXISTS subscription_projection_no_delete ON subscription_projection;
CREATE TRIGGER subscription_projection_no_delete
    BEFORE DELETE ON subscription_projection
    FOR EACH ROW EXECUTE FUNCTION append_only_table_block_mutation();

DROP TRIGGER IF EXISTS subscription_projection_no_truncate ON subscription_projection;
CREATE TRIGGER subscription_projection_no_truncate
    BEFORE TRUNCATE ON subscription_projection
    FOR EACH STATEMENT EXECUTE FUNCTION append_only_table_block_truncate();

-- Lookup current state efficiently. The view's NOT EXISTS will use this
-- index to find supersedes_id matches.
CREATE INDEX IF NOT EXISTS subscription_projection_supersedes_idx
    ON subscription_projection (supersedes_id)
    WHERE supersedes_id IS NOT NULL;

-- Subscription-centric history lookup.
CREATE INDEX IF NOT EXISTS subscription_projection_entity_idx
    ON subscription_projection (stripe_subscription_id, projected_at DESC);

-- Workspace-centric history lookup.
CREATE INDEX IF NOT EXISTS subscription_projection_workspace_idx
    ON subscription_projection (workspace_id, projected_at DESC);

-- Epoch-centric replay lookup.
CREATE INDEX IF NOT EXISTS subscription_projection_epoch_idx
    ON subscription_projection (replay_epoch_id);
