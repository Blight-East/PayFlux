CREATE TABLE IF NOT EXISTS stripe_financials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    stripe_account_id text NOT NULL,
    available_balance bigint NOT NULL DEFAULT 0,
    pending_balance bigint NOT NULL DEFAULT 0,
    total_volume_30d bigint NOT NULL DEFAULT 0,
    dispute_count_30d integer NOT NULL DEFAULT 0,
    avg_payout_delay_days numeric(5,2),
    last_payout_at timestamptz,
    raw_payouts jsonb,
    fetched_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stripe_financials_workspace_idx ON stripe_financials (workspace_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS stripe_financials_account_idx ON stripe_financials (stripe_account_id);
