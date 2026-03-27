DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'billing_customers'
    ) AND NOT EXISTS (
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
END $$;
