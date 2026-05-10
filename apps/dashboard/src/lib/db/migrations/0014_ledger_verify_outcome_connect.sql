-- Add 'connect' to the allowed verify_outcome values on stripe_event_ledger.
--
-- Prior to this migration, verify_outcome could be one of:
--   primary, fallback, per_account, fail, no_signature, malformed
--
-- The 'fallback' slot was originally designed for secret rotation transitions
-- but is currently doing double duty as the Connect-endpoint signing-secret
-- slot. That's a semantic mismatch — and it means the slot is no longer
-- available for actual rotation, which is a recoverability problem.
--
-- Adding a dedicated 'connect' outcome lets the handler carry a separate
-- STRIPE_CONNECT_WEBHOOK_SECRET, freeing the FALLBACK slot for what it was
-- designed for (rotation transitions) and giving telemetry a clear signal
-- for "this delivery came from the Connect endpoint" rather than masking
-- it under 'fallback'.
--
-- Code that emits the new outcome ships in the same PR as this migration;
-- the migration must apply before the deploy so ledger inserts don't fail
-- against the old constraint.

-- Drop the existing CHECK constraint by discovering its auto-generated name.
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'stripe_event_ledger'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%verify_outcome%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE stripe_event_ledger DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

ALTER TABLE stripe_event_ledger
    ADD CONSTRAINT stripe_event_ledger_verify_outcome_check
    CHECK (verify_outcome IN (
        'primary',         -- verified against STRIPE_WEBHOOK_SECRET (platform endpoint)
        'fallback',        -- verified against STRIPE_WEBHOOK_SECRET_FALLBACK (rotation transitional)
        'connect',         -- verified against STRIPE_CONNECT_WEBHOOK_SECRET (Connect endpoint)
        'per_account',     -- verified against per-merchant secret in processor_connections
        'fail',            -- signature present but did not verify against any candidate
        'no_signature',    -- request arrived without a Stripe-Signature header
        'malformed'        -- body was not valid JSON / could not be parsed
    ));
