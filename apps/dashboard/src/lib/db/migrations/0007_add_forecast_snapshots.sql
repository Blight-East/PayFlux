CREATE TABLE IF NOT EXISTS forecast_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    stripe_account_id text NOT NULL,
    stripe_financials_id uuid NOT NULL REFERENCES stripe_financials(id) ON DELETE CASCADE,
    model_version text NOT NULL,
    forecasted_t30_cents bigint NOT NULL,
    confidence_band text NOT NULL,
    data_completeness numeric(3,2) NOT NULL,
    feature_hash text NOT NULL,
    feature_snapshot_json jsonb NOT NULL,
    realized_reserve_cents bigint,
    reconciled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS forecast_snapshots_workspace_idx ON forecast_snapshots (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS forecast_snapshots_financials_idx ON forecast_snapshots (stripe_financials_id);
CREATE INDEX IF NOT EXISTS forecast_snapshots_hash_idx ON forecast_snapshots (feature_hash);
