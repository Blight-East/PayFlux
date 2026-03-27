import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const migrationsDir = path.join(repoRoot, 'src', 'lib', 'db', 'migrations');

function getDatabaseUrl() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error('DATABASE_URL is required');
    }
    return url;
}

async function ensureSchemaMigrations(client) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version text PRIMARY KEY,
            applied_at timestamptz NOT NULL DEFAULT now()
        )
    `);
}

async function loadMigrations() {
    const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
    return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
        .map((entry) => entry.name)
        .sort();
}

async function main() {
    const dryRun = process.argv.includes('--dry-run');
    const client = new Client({ connectionString: getDatabaseUrl() });
    await client.connect();

    try {
        await ensureSchemaMigrations(client);
        await client.query(`SELECT pg_advisory_lock(hashtext('payflux-schema-migrations'))`);

        const files = await loadMigrations();
        const { rows } = await client.query('SELECT version FROM schema_migrations');
        const applied = new Set(rows.map((row) => row.version));

        for (const file of files) {
            if (applied.has(file)) {
                console.log(`skip ${file}`);
                continue;
            }

            console.log(`${dryRun ? 'plan' : 'apply'} ${file}`);
            if (dryRun) continue;

            const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
                await client.query('COMMIT');
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
        }
    } finally {
        try {
            await client.query(`SELECT pg_advisory_unlock(hashtext('payflux-schema-migrations'))`);
        } catch {}
        await client.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
