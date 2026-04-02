#!/usr/bin/env node
/**
 * One-time data migration: payment-node → payflux-prod schema.
 * 
 * Migrates rows from legacy `subscriptions` and `billing_customers` (user_id PK)
 * into payflux-prod's workspace-scoped `billing_customers` and `billing_subscriptions`.
 * 
 * SAFETY:
 *   - Runs in DRY RUN mode by default (rolls back at the end)
 *   - Pass --commit to actually persist changes
 *   - All INSERTs use ON CONFLICT DO NOTHING — safe to re-run
 *   - Never drops or modifies legacy tables
 * 
 * Usage:
 *   DATABASE_URL="postgresql://..." node scripts/cutover-migrate.mjs            # dry run
 *   DATABASE_URL="postgresql://..." node scripts/cutover-migrate.mjs --commit   # persist
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
const COMMIT = process.argv.includes('--commit');

if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is required.');
    process.exit(1);
}

const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 10000,
    ssl: DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
});

async function run() {
    const client = await pool.connect();

    console.log(`\n=== PayFlux Data Migration ${COMMIT ? '(LIVE)' : '(DRY RUN — pass --commit to persist)'} ===\n`);

    try {
        await client.query('BEGIN');

        // Pre-check: do legacy tables exist?
        const { rows: [checks] } = await client.query(`
            SELECT 
                EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = 'subscriptions') AS has_legacy_subs,
                EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = 'workspaces') AS has_workspaces,
                EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = 'billing_subscriptions') AS has_new_subs,
                EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='billing_customers' AND column_name='user_id') AS has_legacy_customers
        `);

        if (!checks.has_workspaces || !checks.has_new_subs) {
            console.error('ERROR: Payflux-prod schema not found. Run migrations first.');
            await client.query('ROLLBACK');
            process.exit(1);
        }

        if (!checks.has_legacy_subs) {
            console.log('ℹ️  No legacy subscriptions table found. Nothing to migrate.');
            await client.query('ROLLBACK');
            process.exit(0);
        }

        // Step 1: Count legacy data
        const { rows: [legacyCounts] } = await client.query(`
            SELECT 
                (SELECT COUNT(*)::int FROM subscriptions) AS legacy_sub_count,
                (SELECT COUNT(*)::int FROM subscriptions WHERE status IN ('active', 'trialing', 'past_due')) AS active_legacy_subs
        `);
        console.log(`Legacy subscriptions: ${legacyCounts.legacy_sub_count} total, ${legacyCounts.active_legacy_subs} active/trialing/past_due`);

        if (legacyCounts.legacy_sub_count === 0) {
            console.log('ℹ️  No legacy subscriptions to migrate.');
            await client.query('ROLLBACK');
            process.exit(0);
        }

        // Step 2: Migrate billing_customers (legacy user_id → workspace-scoped)
        if (checks.has_legacy_customers) {
            // Legacy billing_customers has user_id as PK
            // We need to join with workspaces.owner_clerk_user_id to get workspace_id
            const migrateCustomers = await client.query(`
                INSERT INTO billing_customers (workspace_id, provider, stripe_customer_id, email, created_at, updated_at)
                SELECT 
                    w.id AS workspace_id,
                    'stripe'::billing_provider_enum AS provider,
                    bc_legacy.stripe_customer_id,
                    bc_legacy.email,
                    bc_legacy.created_at,
                    bc_legacy.updated_at
                FROM billing_customers bc_legacy
                JOIN workspaces w ON w.owner_clerk_user_id = bc_legacy.user_id
                WHERE bc_legacy.user_id IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM billing_customers bc2 
                      WHERE bc2.workspace_id = w.id 
                        AND bc2.provider = 'stripe'
                        AND bc2.stripe_customer_id = bc_legacy.stripe_customer_id
                  )
                ON CONFLICT (stripe_customer_id) DO NOTHING
            `);
            console.log(`Billing customers migrated: ${migrateCustomers.rowCount} rows`);
        } else {
            // billing_customers is already in new format (workspace_id FK, uuid PK)
            // Check if subscriptions need customer records created
            console.log('billing_customers already in new format, checking subscription linkage...');
        }

        // Step 3: Migrate subscriptions → billing_subscriptions
        const migrateSubs = await client.query(`
            INSERT INTO billing_subscriptions (
                workspace_id, billing_customer_id, provider,
                stripe_subscription_id, stripe_checkout_session_id, stripe_price_id,
                status, grants_tier, raw_status,
                current_period_end, cancel_at_period_end,
                last_webhook_event_at, last_reconciled_at,
                created_at, updated_at
            )
            SELECT
                bc.workspace_id,
                bc.id AS billing_customer_id,
                'stripe'::billing_provider_enum AS provider,
                old.stripe_subscription_id,
                old.stripe_checkout_session_id,
                old.stripe_price_id,
                CASE old.status
                    WHEN 'active' THEN 'active'::subscription_status_enum
                    WHEN 'trialing' THEN 'trialing'::subscription_status_enum
                    WHEN 'past_due' THEN 'past_due'::subscription_status_enum
                    WHEN 'canceled' THEN 'canceled'::subscription_status_enum
                    WHEN 'unpaid' THEN 'unpaid'::subscription_status_enum
                    WHEN 'incomplete' THEN 'incomplete'::subscription_status_enum
                    WHEN 'incomplete_expired' THEN 'incomplete_expired'::subscription_status_enum
                    ELSE 'active'::subscription_status_enum
                END,
                CASE old.plan
                    WHEN 'pro' THEN 'pro'::workspace_tier_enum
                    WHEN 'enterprise' THEN 'enterprise'::workspace_tier_enum
                    ELSE 'pro'::workspace_tier_enum
                END,
                old.status,
                old.current_period_end,
                COALESCE(old.cancel_at_period_end::boolean, false),
                CASE WHEN old.last_event_timestamp > 0 
                     THEN to_timestamp(old.last_event_timestamp) 
                     ELSE NULL 
                END,
                NOW(),
                old.created_at,
                old.updated_at
            FROM subscriptions old
            JOIN billing_customers bc ON bc.stripe_customer_id = old.stripe_customer_id
            WHERE NOT EXISTS (
                SELECT 1 FROM billing_subscriptions bs2
                WHERE bs2.stripe_subscription_id = old.stripe_subscription_id
            )
            ON CONFLICT (stripe_subscription_id) DO NOTHING
        `);
        console.log(`Subscriptions migrated: ${migrateSubs.rowCount} rows`);

        // Step 4: Update workspace state for migrated active subscriptions
        const updateWorkspaces = await client.query(`
            UPDATE workspaces w
            SET entitlement_tier = bs.grants_tier,
                payment_status = CASE bs.status
                    WHEN 'active' THEN 'current'::workspace_payment_status_enum
                    WHEN 'trialing' THEN 'trialing'::workspace_payment_status_enum
                    WHEN 'past_due' THEN 'past_due'::workspace_payment_status_enum
                    WHEN 'canceled' THEN 'canceled'::workspace_payment_status_enum
                    ELSE 'none'::workspace_payment_status_enum
                END,
                activation_state = 'paid_unconnected'::workspace_activation_state_enum,
                updated_at = NOW()
            FROM billing_subscriptions bs
            WHERE bs.workspace_id = w.id
              AND bs.status IN ('active', 'trialing', 'past_due')
              AND w.entitlement_tier = 'free'
        `);
        console.log(`Workspaces upgraded: ${updateWorkspaces.rowCount} rows`);

        // Step 5: Verification counts
        const { rows: verification } = await client.query(`
            SELECT 'billing_customers (new)' AS entity, COUNT(*)::int AS count FROM billing_customers WHERE workspace_id IS NOT NULL
            UNION ALL
            SELECT 'billing_subscriptions', COUNT(*) FROM billing_subscriptions
            UNION ALL
            SELECT 'workspaces (paid)', COUNT(*) FROM workspaces WHERE entitlement_tier != 'free'
        `);
        console.log('\nPost-migration verification:');
        for (const v of verification) {
            console.log(`  ${v.entity.padEnd(30)} ${v.count} rows`);
        }

        if (COMMIT) {
            await client.query('COMMIT');
            console.log('\n✅ Migration COMMITTED successfully.');
        } else {
            await client.query('ROLLBACK');
            console.log('\n🔄 DRY RUN complete — changes rolled back.');
            console.log('   Run with --commit to persist changes.');
        }

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('\n❌ Migration FAILED — rolled back:', err.message);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
