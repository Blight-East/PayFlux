-- Append-only enforcement for stripe_event_ledger.
--
-- The ledger is the substrate for replay, reconciliation, and forensic
-- review. Code discipline is necessary but not sufficient — the moment
-- another service starts reading and writing the ledger (Go reconciliation
-- worker, future polling worker, retry orchestrator), the planes are only
-- actually separated if the ledger's append-only semantics are enforced
-- at the database layer rather than relying on every consumer to obey the
-- contract.
--
-- This trigger raises an exception on UPDATE or DELETE attempts. INSERT is
-- the only mutation path. A future migration can add a SELECT-only role
-- and grant it to consuming services for defense in depth.
--
-- Limitation: TRUNCATE bypasses BEFORE-row triggers; a separate statement-
-- level trigger handles that case. Owner-level operations (DROP, ALTER)
-- are not gated — those are intentional schema changes and should require
-- a migration.

CREATE OR REPLACE FUNCTION stripe_event_ledger_block_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'stripe_event_ledger is append-only; % is forbidden (op=%)',
        TG_OP, TG_OP
        USING ERRCODE = 'feature_not_supported';
END;
$$;

CREATE OR REPLACE FUNCTION stripe_event_ledger_block_truncate()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'stripe_event_ledger is append-only; TRUNCATE is forbidden'
        USING ERRCODE = 'feature_not_supported';
END;
$$;

DROP TRIGGER IF EXISTS stripe_event_ledger_no_update ON stripe_event_ledger;
CREATE TRIGGER stripe_event_ledger_no_update
    BEFORE UPDATE ON stripe_event_ledger
    FOR EACH ROW EXECUTE FUNCTION stripe_event_ledger_block_mutation();

DROP TRIGGER IF EXISTS stripe_event_ledger_no_delete ON stripe_event_ledger;
CREATE TRIGGER stripe_event_ledger_no_delete
    BEFORE DELETE ON stripe_event_ledger
    FOR EACH ROW EXECUTE FUNCTION stripe_event_ledger_block_mutation();

DROP TRIGGER IF EXISTS stripe_event_ledger_no_truncate ON stripe_event_ledger;
CREATE TRIGGER stripe_event_ledger_no_truncate
    BEFORE TRUNCATE ON stripe_event_ledger
    FOR EACH STATEMENT EXECUTE FUNCTION stripe_event_ledger_block_truncate();

-- Operational rollup view. Aggregates verify_outcome counts and ingestion
-- latency over recent windows. Used by the eventual reconciliation
-- dashboard and as a starting point for the metrics scaffolding.
--
-- Materialized as a regular view (not MATERIALIZED) for now — the ledger
-- is small. Promote to a materialized view + scheduled REFRESH if the
-- aggregation becomes expensive.
CREATE OR REPLACE VIEW stripe_event_ledger_outcomes_5m AS
SELECT
    date_trunc('minute', received_at) - (extract(minute from received_at)::int % 5) * interval '1 minute' AS bucket_5m,
    verify_outcome,
    count(*) AS deliveries,
    count(*) FILTER (WHERE stripe_event_id IS NOT NULL) AS deliveries_with_event_id,
    avg(payload_size_bytes)::bigint AS avg_payload_bytes,
    max(payload_size_bytes) AS max_payload_bytes
FROM stripe_event_ledger
WHERE received_at > now() - interval '24 hours'
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

COMMENT ON VIEW stripe_event_ledger_outcomes_5m IS
    'Recent webhook delivery outcomes by 5-minute bucket. Source for the eventual reconciliation dashboard. Trailing 24h to keep the view light.';
