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
