-- Versioning columns on stripe_event_ledger.
--
-- Replayability without schema versioning is institutional debt waiting to
-- happen. Once Stripe changes payload shape, our ingestion logic evolves,
-- or reducers come online, replay against historical rows must know:
--
--   - Which Stripe API version produced this payload?  (payload_schema_version)
--   - Which version of OUR ingestion code wrote this row?  (ingestion_version)
--   - Which reducer version was current when this row was written?
--     (reducer_version — informational; the authoritative reducer fingerprint
--      lives on the projection row the reducer writes, not on the ledger.)
--
-- Adding these columns now while the ledger is small (1 row at time of
-- writing — the integration test that proved append-only enforcement)
-- avoids a painful backfill later.
--
-- IMPORTANT: 0012 installed an append-only trigger that rejects UPDATEs on
-- this table. A naive backfill (UPDATE ... SET ingestion_version = ...) hits
-- the trigger and aborts the migration. Instead we ADD COLUMN ... NOT NULL
-- DEFAULT 'pre-versioning' for the existing rows (PostgreSQL 11+ stores the
-- default in pg_attribute as a "missing value" — no row rewrite, no trigger
-- fires), then DROP DEFAULT so future inserts must explicitly populate the
-- column.

ALTER TABLE stripe_event_ledger
    ADD COLUMN IF NOT EXISTS payload_schema_version text,
    ADD COLUMN IF NOT EXISTS reducer_version text,
    ADD COLUMN IF NOT EXISTS ingestion_version text NOT NULL DEFAULT 'pre-versioning';

-- Future inserts must populate ingestion_version explicitly. The default was
-- only there so existing rows get the sentinel without an UPDATE triggering
-- the append-only guard.
ALTER TABLE stripe_event_ledger
    ALTER COLUMN ingestion_version DROP DEFAULT;

COMMENT ON COLUMN stripe_event_ledger.payload_schema_version IS
    'Stripe API version under which the payload was produced. Sourced from event.api_version. Null for malformed bodies and unsigned probes where no event object was constructed.';

COMMENT ON COLUMN stripe_event_ledger.ingestion_version IS
    'Version identifier of the ingestion handler that wrote this row. Typically the dashboard service git SHA. Sentinel "pre-versioning" for rows written before this column existed; "unknown" if the handler did not have a version available at write time.';

COMMENT ON COLUMN stripe_event_ledger.reducer_version IS
    'Informational: reducer version current at ingestion time. The authoritative reducer fingerprint belongs on the projection row the reducer writes, not here. Use this to debug "what reducer was live when this row arrived" rather than "what reducer derived state from this row".';
