#!/usr/bin/env node
/**
 * Pre-cutover database audit script.
 * 
 * Usage:
 *   DATABASE_URL="postgresql://..." node scripts/cutover-audit.mjs
 * 
 * Determines which schema scenario is live and reports what migration/data work is needed.
 */

import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is required.');
    console.error('Usage: DATABASE_URL="postgresql://..." node scripts/cutover-audit.mjs');
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
    try {
        console.log('\n=== PayFlux Pre-Cutover Database Audit ===\n');

        // 1. Determine schema scenario
        const { rows: [scenario] } = await client.query(`
            SELECT 
                EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = 'workspaces')           AS has_workspaces,
                EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = 'schema_migrations')    AS has_migrations,
                EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = 'billing_subscriptions') AS has_billing_subscriptions,
                EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = 'subscriptions')        AS has_legacy_subscriptions,
                EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = 'billing_customers')    AS has_billing_customers,
                EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = 'stripe_webhook_events') AS has_legacy_webhooks
        `);

        console.log('Schema Detection:');
        console.log(`  workspaces table:           ${scenario.has_workspaces ? '✅' : '❌'}`);
        console.log(`  schema_migrations table:    ${scenario.has_migrations ? '✅' : '❌'}`);
        console.log(`  billing_subscriptions:      ${scenario.has_billing_subscriptions ? '✅' : '❌'}`);
        console.log(`  billing_customers:          ${scenario.has_billing_customers ? '✅' : '❌'}`);
        console.log(`  legacy subscriptions:       ${scenario.has_legacy_subscriptions ? '✅' : '❌'}`);
        console.log(`  legacy webhook_events:      ${scenario.has_legacy_webhooks ? '✅' : '❌'}`);

        // Determine scenario
        if (scenario.has_workspaces && scenario.has_migrations && scenario.has_billing_subscriptions) {
            console.log('\n📋 SCENARIO A: Payflux-prod schema is live.');
            console.log('   Migration framework is active. No schema changes needed.');
        } else if (scenario.has_legacy_subscriptions && !scenario.has_workspaces) {
            console.log('\n📋 SCENARIO B: Payment-node (legacy) schema only.');
            console.log('   Must run payflux-prod migrations + data migration.');
        } else if (scenario.has_legacy_subscriptions && scenario.has_workspaces) {
            console.log('\n📋 SCENARIO C: Both schemas coexist.');
            console.log('   Migrations may be partially applied. Run remaining migrations + data migration.');
        } else {
            console.log('\n📋 SCENARIO: Empty database or unknown state.');
            console.log('   Payflux-prod migrations will bootstrap everything from scratch.');
        }

        // 2. List all applied migrations
        if (scenario.has_migrations) {
            const { rows: migrations } = await client.query('SELECT version, applied_at FROM schema_migrations ORDER BY version');
            console.log(`\nApplied Migrations (${migrations.length}):`);
            for (const m of migrations) {
                console.log(`  ${m.version}  (${new Date(m.applied_at).toISOString()})`);
            }
        }

        // 3. Count rows in key tables
        console.log('\nRow Counts:');
        const tables = [
            'workspaces', 'billing_customers', 'billing_subscriptions',
            'processor_connections', 'monitored_entities', 'activation_runs',
            'baseline_snapshots', 'reserve_projections', 'workspace_api_keys',
            'subscriptions', 'stripe_webhook_events'
        ];

        for (const table of tables) {
            try {
                const { rows: [{ count }] } = await client.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
                console.log(`  ${table.padEnd(30)} ${count} rows`);
            } catch {
                // Table doesn't exist
            }
        }

        // 4. Check for active subscriptions in legacy table
        if (scenario.has_legacy_subscriptions) {
            const { rows: legacySubs } = await client.query(
                `SELECT status, COUNT(*)::int AS count FROM subscriptions GROUP BY status ORDER BY count DESC`
            );
            console.log('\nLegacy Subscription Status Breakdown:');
            for (const s of legacySubs) {
                console.log(`  ${s.status.padEnd(25)} ${s.count}`);
            }
        }

        // 5. Check billing_customers PK type (text = legacy, uuid = prod)
        if (scenario.has_billing_customers) {
            const { rows: [pkInfo] } = await client.query(`
                SELECT data_type FROM information_schema.columns 
                WHERE table_schema='public' AND table_name='billing_customers' AND column_name='id'
            `);
            const { rows: hasUserId } = await client.query(`
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema='public' AND table_name='billing_customers' AND column_name='user_id'
            `);
            
            if (hasUserId.length > 0) {
                console.log('\n⚠️  billing_customers has user_id column (legacy schema)');
            }
            if (pkInfo) {
                console.log(`   billing_customers.id type: ${pkInfo.data_type}`);
            }
        }

        // 6. Check workspace tier distribution
        if (scenario.has_workspaces) {
            const { rows: tiers } = await client.query(
                `SELECT entitlement_tier, payment_status, activation_state, COUNT(*)::int AS count 
                 FROM workspaces GROUP BY entitlement_tier, payment_status, activation_state ORDER BY count DESC`
            );
            console.log('\nWorkspace State Distribution:');
            for (const t of tiers) {
                console.log(`  tier=${t.entitlement_tier.padEnd(12)} payment=${t.payment_status.padEnd(15)} activation=${t.activation_state.padEnd(25)} count=${t.count}`);
            }
        }

        console.log('\n=== Audit Complete ===\n');

    } finally {
        client.release();
        await pool.end();
    }
}

run().catch((err) => {
    console.error('Audit failed:', err.message);
    process.exit(1);
});
