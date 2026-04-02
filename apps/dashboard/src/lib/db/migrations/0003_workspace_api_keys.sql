CREATE TABLE IF NOT EXISTS workspace_api_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    label text NOT NULL DEFAULT 'Primary key',
    key_prefix text NOT NULL,
    key_hash text NOT NULL UNIQUE,
    created_by_clerk_user_id text,
    last_used_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspace_api_keys_workspace_idx
    ON workspace_api_keys (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS workspace_api_keys_active_idx
    ON workspace_api_keys (workspace_id, revoked_at)
    WHERE revoked_at IS NULL;
