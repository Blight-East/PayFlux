-- Subscription projection conflicts: operational pathology.
--
-- Lives separate from subscription_projection because it answers a
-- different epistemic question: NOT "what does the system believe?" but
-- "how did confidence in that belief evolve under imperfect arrival?"
--
-- Mixing the two would pollute the projection chain with operational
-- noise and make replay reasoning incoherent.
--
-- Conflict types:
--   late_event_detected        — event arrived with event_occurred_at
--                                older than current projection's. Reducer
--                                emits this, does NOT supersede in place.
--                                A subsequent replay epoch may rebuild.
--   chronology_conflict        — two events claim identical timestamps;
--                                ordering cannot be determined.
--   merge_invariant_violation  — merge function detected an illegal state
--                                transition the reducer's policy rejects.
--   ordering_metadata_missing  — event lacks timestamps or version fields
--                                required to determine logical order.
--
-- Append-only. Each conflict is a permanent observation about the system's
-- behavior, not a record that gets resolved/closed in place.

CREATE TABLE IF NOT EXISTS subscription_projection_conflicts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    stripe_subscription_id text NOT NULL,

    conflict_type text NOT NULL CHECK (conflict_type IN (
        'late_event_detected',
        'chronology_conflict',
        'merge_invariant_violation',
        'ordering_metadata_missing'
    )),

    -- The event that triggered the conflict detection.
    source_event_id text NOT NULL,

    -- The projection row this conflict pertains to (if any). Null when
    -- the conflict is about an event that produced no projection at all.
    related_projection_id uuid REFERENCES subscription_projection(id),

    -- Structured context for forensic review.
    details jsonb NOT NULL,

    -- Provenance.
    reducer_version text NOT NULL,
    replay_epoch_id uuid NOT NULL REFERENCES replay_epochs(id),

    detected_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS subscription_projection_conflicts_no_update ON subscription_projection_conflicts;
CREATE TRIGGER subscription_projection_conflicts_no_update
    BEFORE UPDATE ON subscription_projection_conflicts
    FOR EACH ROW EXECUTE FUNCTION append_only_table_block_mutation();

DROP TRIGGER IF EXISTS subscription_projection_conflicts_no_delete ON subscription_projection_conflicts;
CREATE TRIGGER subscription_projection_conflicts_no_delete
    BEFORE DELETE ON subscription_projection_conflicts
    FOR EACH ROW EXECUTE FUNCTION append_only_table_block_mutation();

DROP TRIGGER IF EXISTS subscription_projection_conflicts_no_truncate ON subscription_projection_conflicts;
CREATE TRIGGER subscription_projection_conflicts_no_truncate
    BEFORE TRUNCATE ON subscription_projection_conflicts
    FOR EACH STATEMENT EXECUTE FUNCTION append_only_table_block_truncate();

CREATE INDEX IF NOT EXISTS subscription_projection_conflicts_entity_idx
    ON subscription_projection_conflicts (stripe_subscription_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS subscription_projection_conflicts_type_idx
    ON subscription_projection_conflicts (conflict_type, detected_at DESC);

CREATE INDEX IF NOT EXISTS subscription_projection_conflicts_epoch_idx
    ON subscription_projection_conflicts (replay_epoch_id);
