-- The original processed_webhooks table is a write-once dedup log: a row's
-- presence means "Stripe event seen," not "Stripe event fully processed." If
-- the handler crashed between INSERT and finishing forwardToPayFlux, the row
-- silently masked a delivery failure on Stripe retry. Add a status column so
-- "claimed but not yet finished" is distinguishable from "complete."
--
-- Pre-existing rows predate this distinction and we cannot retroactively know
-- whether their downstream work finished — defaulting them to 'completed' is
-- the only choice that doesn't trigger a flood of false retries on first deploy.

ALTER TABLE processed_webhooks
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed'
        CHECK (status IN ('received', 'completed')),
    ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS completed_at timestamptz,
    ADD COLUMN IF NOT EXISTS last_error text,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE processed_webhooks
SET completed_at = created_at
WHERE completed_at IS NULL;

-- Switch the default so new inserts begin life as 'received' (the handler
-- promotes them to 'completed' on success).
ALTER TABLE processed_webhooks ALTER COLUMN status SET DEFAULT 'received';

-- Partial index supports the stale-retry lookup without bloating with completed rows.
CREATE INDEX IF NOT EXISTS idx_processed_webhooks_received_stale
    ON processed_webhooks (created_at)
    WHERE status = 'received';
