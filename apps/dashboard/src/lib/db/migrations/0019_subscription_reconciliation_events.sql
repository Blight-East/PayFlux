-- Subscription reconciliation events: drift confidence evolution.
--
-- This is where the drift-detection job records its observations. NOT a
-- record of state interpretations (that's subscription_projection) and
-- NOT a record of reducer-internal pathology (that's
-- subscription_projection_conflicts). This table answers:
--
--   "How did the system's confidence in its interpretations evolve as
--    independent observations arrived?"
--
-- The detector compares subscription_projection against the canonical
-- billing_subscriptions table (and, in the future, against direct Stripe
-- API polls) and records what it finds. The detector does NOT correct
-- either side automatically — the row is the signal. Manual or policy-
-- driven reconciliation actions write their own rows.
--
-- Append-only — drift is itself part of the historical record.

CREATE TABLE IF NOT EXISTS subscription_reconciliation_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    stripe_subscription_id text NOT NULL,

    event_type text NOT NULL CHECK (event_type IN (
        'drift_none',              -- detector ran, found agreement
        'drift_minor',             -- timestamps within tolerance, semantic agreement
        'drift_major',             -- status or other authoritative field differs
        'manual_reconciliation',   -- operator manually issued a correction
        'polling_confirmation',    -- direct Stripe poll confirmed projection state
        'authority_correction'     -- authority policy issued a corrective delta
    )),

    -- The projection observed at detection time. Null on manual events
    -- that don't reference a specific projection.
    projection_id_at_detection uuid REFERENCES subscription_projection(id),

    -- The two interpretations being compared, captured as structured
    -- snapshots. Always populated for drift_* event types; nullable for
    -- manual events.
    reducer_state jsonb,
    canonical_state jsonb,

    -- Resolution outcome, if known at write time. Many rows will have
    -- this null — resolution is a separate operational action that emits
    -- its own row.
    resolution text CHECK (resolution IN (
        'accepted_reducer',
        'accepted_canonical',
        'manual_review_required'
    )),
    resolved_at timestamptz,

    -- Provenance of the detection.
    detector_name text NOT NULL,
    detector_version text NOT NULL,

    -- The reducer version whose interpretation was compared. May differ
    -- from the current reducer version if the detection is for a
    -- historical projection.
    reducer_version text NOT NULL,

    detected_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS subscription_reconciliation_events_no_update ON subscription_reconciliation_events;
CREATE TRIGGER subscription_reconciliation_events_no_update
    BEFORE UPDATE ON subscription_reconciliation_events
    FOR EACH ROW EXECUTE FUNCTION append_only_table_block_mutation();

DROP TRIGGER IF EXISTS subscription_reconciliation_events_no_delete ON subscription_reconciliation_events;
CREATE TRIGGER subscription_reconciliation_events_no_delete
    BEFORE DELETE ON subscription_reconciliation_events
    FOR EACH ROW EXECUTE FUNCTION append_only_table_block_mutation();

DROP TRIGGER IF EXISTS subscription_reconciliation_events_no_truncate ON subscription_reconciliation_events;
CREATE TRIGGER subscription_reconciliation_events_no_truncate
    BEFORE TRUNCATE ON subscription_reconciliation_events
    FOR EACH STATEMENT EXECUTE FUNCTION append_only_table_block_truncate();

CREATE INDEX IF NOT EXISTS subscription_reconciliation_events_entity_idx
    ON subscription_reconciliation_events (stripe_subscription_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS subscription_reconciliation_events_type_idx
    ON subscription_reconciliation_events (event_type, detected_at DESC);
