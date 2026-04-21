import { Pool } from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM-safe __dirname (Playwright loads configs/setup as ESM).
const __filename = typeof __dirname !== 'undefined' ? '' : fileURLToPath(import.meta.url);
const __dirnameESM = typeof __dirname !== 'undefined' ? __dirname : path.dirname(__filename);

/**
 * Global setup: ensure the target Postgres is reachable and all dashboard
 * migrations have been applied. Safe to run against an existing populated
 * database — each migration is idempotent via its `IF NOT EXISTS` guards.
 */
export default async function globalSetup(): Promise<void> {
    const databaseUrl =
        process.env.DATABASE_URL ??
        'postgres://payflux:payflux@127.0.0.1:5433/payflux';

    const pool = new Pool({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 5_000,
        max: 2,
    });

    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version text PRIMARY KEY,
                applied_at timestamptz NOT NULL DEFAULT now()
            )
        `);

        const migrationsDir = path.resolve(
            __dirnameESM,
            '..',
            'src',
            'lib',
            'db',
            'migrations'
        );
        const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
        const allFiles = entries
            .filter((e) => e.isFile() && e.name.endsWith('.sql'))
            .map((e) => e.name)
            .sort();

        // Detect a fresh DB: if `billing_customers` doesn't exist, the
        // `0000*_legacy_*` scripts (which assume a pre-existing legacy
        // table) are no-ops at best and broken at worst. Skip them and
        // mark them applied so subsequent boots do the same. Migration
        // `0001_phase1a_workspace_fulfillment.sql` creates the table
        // correctly from scratch.
        const billingExists = await client.query<{ exists: boolean }>(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = 'billing_customers'
            ) AS exists
        `);
        const isFreshDb = !billingExists.rows[0]?.exists;
        const skippedLegacy = new Set<string>();

        const files = isFreshDb
            ? allFiles.filter((f) => {
                  if (f.startsWith('0000_') || f.startsWith('0000a_') || f.startsWith('0000b_')) {
                      skippedLegacy.add(f);
                      return false;
                  }
                  return true;
              })
            : allFiles;

        for (const file of skippedLegacy) {
            await client.query(
                `INSERT INTO schema_migrations (version)
                 VALUES ($1)
                 ON CONFLICT (version) DO NOTHING`,
                [file]
            );
        }

        for (const file of files) {
            const existing = await client.query(
                'SELECT 1 FROM schema_migrations WHERE version = $1',
                [file]
            );
            if (existing.rowCount) continue;
            const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query(
                    'INSERT INTO schema_migrations (version) VALUES ($1)',
                    [file]
                );
                await client.query('COMMIT');
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            }
        }
    } finally {
        client.release();
        await pool.end();
    }
}
