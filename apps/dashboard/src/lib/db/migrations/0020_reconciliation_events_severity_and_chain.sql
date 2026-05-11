-- Drift detector schema refinements on subscription_reconciliation_events.
--
-- Three changes:
--
-- 1. Drop `resolution` and `resolved_at`. These required UPDATE-ing an
--    append-only row to mark resolution, which conflicts with the table's
--    append-only contract. Resolution is now captured by a NEW
--    reconciliation event row that references the detected row via
--    `resolves_id`. The chain IS the resolution history.
--
-- 2. Add `severity` to encode operational pageability orthogonally to
--    `event_type`. Severity decides whether a row is informational
--    background noise, a warning that needs review, a critical signal
--    that may page an engineer, or a regulatory artifact that must be
--    preserved with extra rigor.
--
-- 3. Expand `event_type` to include the new reducible-evidence cases:
--    drift_resolved (resolution row when detector re-observes agreement),
--    projection_impossible (reducer produced an invalid state — the
--    regulatory-severity case).
--
-- 4. Add `resolution_mechanism` for resolution rows to record HOW the
--    drift was resolved (auto_provider_agreed, polling_supersede,
--    manual_operator, etc.).
--
-- Safe because no reconciliation events have been written yet — table is
-- empty. Future-proofs the schema before the drift detector ships data.

-- Drop columns that would have required mutation.
ALTER TABLE subscription_reconciliation_events
    DROP COLUMN IF EXISTS resolution,
    DROP COLUMN IF EXISTS resolved_at;

-- Add severity. Default 'informational' so existing rows (none today,
-- but future-proof) get a sensible default if backfilled.
ALTER TABLE subscription_reconciliation_events
    ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'informational'
        CHECK (severity IN ('informational', 'warning', 'critical', 'regulatory'));

-- Make the default no longer apply to new inserts — the detector must
-- set severity explicitly. Same pattern as 0013 for ingestion_version.
ALTER TABLE subscription_reconciliation_events
    ALTER COLUMN severity DROP DEFAULT;

-- Chain link: when a resolution event is emitted, it points at the
-- detection row it resolves. Forms the audit graph of "how confidence
-- evolved." NULL on the initial detection row.
ALTER TABLE subscription_reconciliation_events
    ADD COLUMN IF NOT EXISTS resolves_id uuid REFERENCES subscription_reconciliation_events(id);

-- How was the drift resolved. NULL for detection rows; populated on
-- resolution rows.
ALTER TABLE subscription_reconciliation_events
    ADD COLUMN IF NOT EXISTS resolution_mechanism text
        CHECK (resolution_mechanism IS NULL OR resolution_mechanism IN (
            'auto_provider_agreed',     -- detector re-observed and both sides agreed
            'polling_supersede',        -- Stripe polling confirmed one side over the other (Phase 2)
            'replay_correction',        -- a replay epoch corrected the projection
            'manual_operator',          -- operator manually marked resolved
            'timeout_unresolved'        -- never resolved within the operational window
        ));

-- Expand event_type to include the new cases. Discover the existing
-- constraint's auto-generated name and drop it before re-adding.
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'subscription_reconciliation_events'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%event_type%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE subscription_reconciliation_events DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

ALTER TABLE subscription_reconciliation_events
    ADD CONSTRAINT subscription_reconciliation_events_event_type_check
    CHECK (event_type IN (
        'drift_none',                  -- detector ran, found agreement
        'drift_minor',                 -- semantic agreement, timestamps within tolerance
        'drift_major',                 -- status or other authoritative field differs
        'drift_resolved',              -- detector re-observed and a prior drift is now agreement
        'projection_impossible',       -- reducer produced an invalid state (regulatory)
        'manual_reconciliation',       -- operator manually issued a correction
        'polling_confirmation',        -- direct Stripe poll confirmed projection state
        'authority_correction'         -- authority policy issued a corrective delta
    ));

-- Index for the resolution-chain walk: "what's the latest resolution
-- pointing at this detection?"
CREATE INDEX IF NOT EXISTS subscription_reconciliation_events_resolves_idx
    ON subscription_reconciliation_events (resolves_id)
    WHERE resolves_id IS NOT NULL;

-- Index for the open-drift lookup: "what detections have not yet been
-- resolved?" Used by the resolution-latency view and by alerts.
CREATE INDEX IF NOT EXISTS subscription_reconciliation_events_open_drift_idx
    ON subscription_reconciliation_events (stripe_subscription_id, detected_at DESC)
    WHERE event_type IN ('drift_minor', 'drift_major', 'projection_impossible');
