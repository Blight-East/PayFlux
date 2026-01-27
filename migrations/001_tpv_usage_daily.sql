-- TPV Usage Daily Snapshots Table
-- This table stores daily snapshots of TPV usage for audit/billing purposes
-- Primary key ensures one row per merchant per day per currency

CREATE TABLE IF NOT EXISTS tpv_usage_daily (
    merchant_id_hash TEXT NOT NULL,
    day DATE NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    usage_cents BIGINT NOT NULL DEFAULT 0,
    coverage_tier TEXT,
    monthly_limit_cents BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (merchant_id_hash, day, currency)
);

-- Index for querying by day (most recent snapshots)
CREATE INDEX IF NOT EXISTS idx_tpv_usage_day ON tpv_usage_daily(day DESC);

-- Index for querying by merchant
CREATE INDEX IF NOT EXISTS idx_tpv_usage_merchant ON tpv_usage_daily(merchant_id_hash);
