CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_provider_enum') THEN
        CREATE TYPE billing_provider_enum AS ENUM ('stripe');
    END IF;
END $$;

DO $$
DECLARE
    billing_customers_exists boolean := false;
    billing_customers_has_workspace_id boolean := false;
    billing_customers_has_provider boolean := false;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'billing_customers'
    ) INTO billing_customers_exists;

    IF billing_customers_exists THEN
        IF EXISTS (
            SELECT 1
            FROM billing_customers
            GROUP BY stripe_customer_id
            HAVING COUNT(*) > 1
        ) THEN
            RAISE EXCEPTION 'Compatibility migration blocked: legacy billing_customers contains duplicate stripe_customer_id values.';
        END IF;

        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'billing_customers'
              AND column_name = 'workspace_id'
        ) INTO billing_customers_has_workspace_id;

        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'billing_customers'
              AND column_name = 'provider'
        ) INTO billing_customers_has_provider;

        IF billing_customers_has_workspace_id AND billing_customers_has_provider THEN
            IF EXISTS (
                SELECT 1
                FROM billing_customers
                WHERE workspace_id IS NOT NULL
                GROUP BY workspace_id, provider
                HAVING COUNT(*) > 1
            ) THEN
                RAISE EXCEPTION 'Compatibility migration blocked: billing_customers contains duplicate non-null (workspace_id, provider) pairs.';
            END IF;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'billing_customers'
    ) THEN
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'billing_customers'
              AND column_name = 'id'
        ) THEN
            ALTER TABLE billing_customers
                ADD COLUMN id uuid;
        END IF;

        UPDATE billing_customers
        SET id = gen_random_uuid()
        WHERE id IS NULL;

        ALTER TABLE billing_customers
            ALTER COLUMN id SET DEFAULT gen_random_uuid(),
            ALTER COLUMN id SET NOT NULL;

        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = 'public.billing_customers'::regclass
              AND contype = 'p'
        ) THEN
            ALTER TABLE billing_customers
                ADD CONSTRAINT billing_customers_pkey PRIMARY KEY (id);
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conrelid = 'public.billing_customers'::regclass
              AND contype IN ('p', 'u')
              AND conkey = ARRAY[
                  (
                      SELECT attnum
                      FROM pg_attribute
                      WHERE attrelid = 'public.billing_customers'::regclass
                        AND attname = 'id'
                  )
              ]::smallint[]
        ) THEN
            ALTER TABLE billing_customers
                ADD CONSTRAINT billing_customers_id_key UNIQUE (id);
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'billing_customers'
              AND column_name = 'workspace_id'
        ) THEN
            ALTER TABLE billing_customers
                ADD COLUMN workspace_id uuid;
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'billing_customers'
              AND column_name = 'provider'
        ) THEN
            ALTER TABLE billing_customers
                ADD COLUMN provider billing_provider_enum;
        END IF;

        UPDATE billing_customers
        SET provider = 'stripe'
        WHERE provider IS NULL;

        ALTER TABLE billing_customers
            ALTER COLUMN provider SET DEFAULT 'stripe',
            ALTER COLUMN provider SET NOT NULL;

        ALTER TABLE billing_customers
            ALTER COLUMN created_at SET DEFAULT now(),
            ALTER COLUMN updated_at SET DEFAULT now();

        ALTER TABLE billing_customers
            ALTER COLUMN email DROP NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS billing_customers_workspace_idx
    ON billing_customers (workspace_id);

CREATE UNIQUE INDEX IF NOT EXISTS billing_customers_workspace_provider_uidx
    ON billing_customers (workspace_id, provider)
    WHERE workspace_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS billing_customers_stripe_customer_id_uidx
    ON billing_customers (stripe_customer_id);

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
          AND constraint_name = 'billing_customers_workspace_provider_key'
    ) THEN
        ALTER TABLE billing_customers
            ADD CONSTRAINT billing_customers_workspace_provider_key
            UNIQUE (workspace_id, provider);
    END IF;
END $$;
