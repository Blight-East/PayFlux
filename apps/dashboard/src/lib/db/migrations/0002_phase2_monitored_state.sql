ALTER TABLE monitored_entities
    ADD COLUMN IF NOT EXISTS current_baseline_snapshot_id uuid,
    ADD COLUMN IF NOT EXISTS current_projection_id uuid,
    ADD COLUMN IF NOT EXISTS ready_at timestamptz;

ALTER TABLE activation_runs
    ADD COLUMN IF NOT EXISTS baseline_snapshot_id uuid,
    ADD COLUMN IF NOT EXISTS first_projection_id uuid;

CREATE TABLE IF NOT EXISTS baseline_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    monitored_entity_id uuid NOT NULL REFERENCES monitored_entities(id) ON DELETE CASCADE,
    source_processor_connection_id uuid NOT NULL REFERENCES processor_connections(id) ON DELETE CASCADE,
    risk_tier integer NOT NULL,
    risk_band text NOT NULL,
    stability_score integer NOT NULL,
    trend text NOT NULL,
    policy_surface jsonb NOT NULL DEFAULT '{}'::jsonb,
    source_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
    computed_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS baseline_snapshots_workspace_idx
    ON baseline_snapshots (workspace_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS baseline_snapshots_entity_idx
    ON baseline_snapshots (monitored_entity_id, computed_at DESC);

CREATE TABLE IF NOT EXISTS reserve_projections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    monitored_entity_id uuid NOT NULL REFERENCES monitored_entities(id) ON DELETE CASCADE,
    baseline_snapshot_id uuid NOT NULL REFERENCES baseline_snapshots(id) ON DELETE CASCADE,
    activation_run_id uuid REFERENCES activation_runs(id) ON DELETE SET NULL,
    model_version text NOT NULL,
    instability_signal text NOT NULL,
    current_risk_tier integer NOT NULL,
    trend text NOT NULL,
    tier_delta integer NOT NULL DEFAULT 0,
    projection_basis jsonb NOT NULL,
    reserve_projections jsonb NOT NULL,
    recommended_interventions jsonb NOT NULL DEFAULT '[]'::jsonb,
    simulation_delta jsonb,
    volume_mode text NOT NULL DEFAULT 'bps_only',
    projected_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reserve_projections_workspace_idx
    ON reserve_projections (workspace_id, projected_at DESC);
CREATE INDEX IF NOT EXISTS reserve_projections_entity_idx
    ON reserve_projections (monitored_entity_id, projected_at DESC);
CREATE INDEX IF NOT EXISTS reserve_projections_activation_run_idx
    ON reserve_projections (activation_run_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'monitored_entities_current_baseline_snapshot_fk'
    ) THEN
        ALTER TABLE monitored_entities
            ADD CONSTRAINT monitored_entities_current_baseline_snapshot_fk
            FOREIGN KEY (current_baseline_snapshot_id)
            REFERENCES baseline_snapshots(id)
            ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'monitored_entities_current_projection_fk'
    ) THEN
        ALTER TABLE monitored_entities
            ADD CONSTRAINT monitored_entities_current_projection_fk
            FOREIGN KEY (current_projection_id)
            REFERENCES reserve_projections(id)
            ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'activation_runs_baseline_snapshot_fk'
    ) THEN
        ALTER TABLE activation_runs
            ADD CONSTRAINT activation_runs_baseline_snapshot_fk
            FOREIGN KEY (baseline_snapshot_id)
            REFERENCES baseline_snapshots(id)
            ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'activation_runs_first_projection_fk'
    ) THEN
        ALTER TABLE activation_runs
            ADD CONSTRAINT activation_runs_first_projection_fk
            FOREIGN KEY (first_projection_id)
            REFERENCES reserve_projections(id)
            ON DELETE SET NULL;
    END IF;
END $$;
