CREATE TABLE IF NOT EXISTS signal_failure_velocity (
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    hour_bucket timestamptz NOT NULL,
    failure_count integer NOT NULL DEFAULT 0,
    PRIMARY KEY (workspace_id, hour_bucket)
);

CREATE INDEX IF NOT EXISTS signal_failure_velocity_workspace_idx ON signal_failure_velocity (workspace_id, hour_bucket DESC);
