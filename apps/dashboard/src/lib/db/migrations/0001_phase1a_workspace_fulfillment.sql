CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_tier_enum') THEN
        CREATE TYPE workspace_tier_enum AS ENUM ('free', 'pro', 'enterprise');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_status_enum') THEN
        CREATE TYPE workspace_status_enum AS ENUM ('provisioning', 'active', 'suspended', 'deleted');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_payment_status_enum') THEN
        CREATE TYPE workspace_payment_status_enum AS ENUM ('none', 'current', 'trialing', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_activation_state_enum') THEN
        CREATE TYPE workspace_activation_state_enum AS ENUM ('not_started', 'paid_unconnected', 'connection_pending_verification', 'ready_for_activation', 'activation_in_progress', 'active', 'activation_failed');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_provider_enum') THEN
        CREATE TYPE billing_provider_enum AS ENUM ('stripe');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status_enum') THEN
        CREATE TYPE subscription_status_enum AS ENUM ('checkout_pending', 'trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'processor_provider_enum') THEN
        CREATE TYPE processor_provider_enum AS ENUM ('stripe');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'processor_connection_status_enum') THEN
        CREATE TYPE processor_connection_status_enum AS ENUM ('pending', 'connected', 'verification_failed', 'disconnected');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'monitored_entity_type_enum') THEN
        CREATE TYPE monitored_entity_type_enum AS ENUM ('stripe_account');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'monitored_entity_status_enum') THEN
        CREATE TYPE monitored_entity_status_enum AS ENUM ('pending', 'ready', 'error', 'inactive');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'host_source_enum') THEN
        CREATE TYPE host_source_enum AS ENUM ('scan', 'manual', 'stripe_profile', 'unknown');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activation_run_status_enum') THEN
        CREATE TYPE activation_run_status_enum AS ENUM ('pending', 'running', 'completed', 'failed');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activation_trigger_enum') THEN
        CREATE TYPE activation_trigger_enum AS ENUM ('post_payment', 'post_connect', 'manual_retry', 'system_reconcile');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS workspaces (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_org_id text NOT NULL UNIQUE,
    name text NOT NULL,
    owner_clerk_user_id text,
    status workspace_status_enum NOT NULL DEFAULT 'active',
    entitlement_tier workspace_tier_enum NOT NULL DEFAULT 'free',
    payment_status workspace_payment_status_enum NOT NULL DEFAULT 'none',
    activation_state workspace_activation_state_enum NOT NULL DEFAULT 'not_started',
    primary_host_candidate text,
    scan_attached_at timestamptz,
    latest_scan_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS workspaces_entitlement_idx
    ON workspaces (entitlement_tier, payment_status);
CREATE INDEX IF NOT EXISTS workspaces_activation_idx
    ON workspaces (activation_state);
CREATE INDEX IF NOT EXISTS workspaces_owner_idx
    ON workspaces (owner_clerk_user_id);

CREATE TABLE IF NOT EXISTS billing_customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    provider billing_provider_enum NOT NULL DEFAULT 'stripe',
    stripe_customer_id text NOT NULL UNIQUE,
    email text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, provider)
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'billing_customers'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'billing_customers'
          AND constraint_name = 'billing_customers_workspace_fk'
    ) THEN
        ALTER TABLE billing_customers
            ADD CONSTRAINT billing_customers_workspace_fk
            FOREIGN KEY (workspace_id)
            REFERENCES workspaces(id)
            ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS billing_customers_workspace_idx
    ON billing_customers (workspace_id);

CREATE TABLE IF NOT EXISTS billing_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    billing_customer_id uuid NOT NULL REFERENCES billing_customers(id) ON DELETE CASCADE,
    provider billing_provider_enum NOT NULL DEFAULT 'stripe',
    stripe_subscription_id text UNIQUE,
    stripe_checkout_session_id text,
    stripe_price_id text,
    status subscription_status_enum NOT NULL,
    grants_tier workspace_tier_enum NOT NULL DEFAULT 'pro',
    current_period_start timestamptz,
    current_period_end timestamptz,
    cancel_at_period_end boolean NOT NULL DEFAULT false,
    canceled_at timestamptz,
    trial_start timestamptz,
    trial_end timestamptz,
    latest_invoice_id text,
    raw_status text NOT NULL,
    last_webhook_event_at timestamptz,
    last_reconciled_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS billing_subscriptions_checkout_session_uidx
    ON billing_subscriptions (stripe_checkout_session_id)
    WHERE stripe_checkout_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS billing_subscriptions_workspace_idx
    ON billing_subscriptions (workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS billing_subscriptions_status_idx
    ON billing_subscriptions (status);
CREATE INDEX IF NOT EXISTS billing_subscriptions_customer_idx
    ON billing_subscriptions (billing_customer_id);

CREATE TABLE IF NOT EXISTS processor_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    provider processor_provider_enum NOT NULL DEFAULT 'stripe',
    stripe_account_id text NOT NULL UNIQUE,
    status processor_connection_status_enum NOT NULL DEFAULT 'pending',
    oauth_scope text NOT NULL,
    connected_at timestamptz,
    last_verified_at timestamptz,
    disconnected_at timestamptz,
    connection_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, provider)
);

CREATE INDEX IF NOT EXISTS processor_connections_workspace_idx
    ON processor_connections (workspace_id, status);
CREATE INDEX IF NOT EXISTS processor_connections_status_idx
    ON processor_connections (status);

CREATE TABLE IF NOT EXISTS monitored_entities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    processor_connection_id uuid NOT NULL REFERENCES processor_connections(id) ON DELETE CASCADE,
    entity_type monitored_entity_type_enum NOT NULL DEFAULT 'stripe_account',
    status monitored_entity_status_enum NOT NULL DEFAULT 'pending',
    primary_host text,
    primary_host_source host_source_enum NOT NULL DEFAULT 'unknown',
    first_data_at timestamptz,
    last_data_at timestamptz,
    last_sync_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (workspace_id),
    UNIQUE (processor_connection_id)
);

CREATE INDEX IF NOT EXISTS monitored_entities_workspace_idx
    ON monitored_entities (workspace_id, status);
CREATE INDEX IF NOT EXISTS monitored_entities_host_idx
    ON monitored_entities (primary_host);

CREATE TABLE IF NOT EXISTS activation_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    processor_connection_id uuid REFERENCES processor_connections(id) ON DELETE SET NULL,
    monitored_entity_id uuid REFERENCES monitored_entities(id) ON DELETE SET NULL,
    status activation_run_status_enum NOT NULL DEFAULT 'pending',
    trigger activation_trigger_enum NOT NULL,
    triggered_by text,
    attempt_number integer NOT NULL DEFAULT 1,
    connection_verified boolean NOT NULL DEFAULT false,
    baseline_ready boolean NOT NULL DEFAULT false,
    first_projection_ready boolean NOT NULL DEFAULT false,
    failure_code text,
    failure_detail text,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activation_runs_workspace_idx
    ON activation_runs (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activation_runs_status_idx
    ON activation_runs (status);
CREATE UNIQUE INDEX IF NOT EXISTS activation_runs_one_open_idx
    ON activation_runs (workspace_id)
    WHERE status IN ('pending', 'running');
