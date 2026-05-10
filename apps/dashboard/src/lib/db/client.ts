import fs from 'fs/promises';
import path from 'path';
import { Client, Pool, type PoolClient, type QueryResult } from 'pg';
import * as Sentry from '@sentry/nextjs';

const MIGRATIONS_DIR = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations');

let pool: Pool | null = null;
let initPromise: Promise<Pool> | null = null;

function shouldAutoApplyMigrations(): boolean {
    if (process.env.DB_AUTO_MIGRATE === 'true') return true;
    if (process.env.DB_AUTO_MIGRATE === 'false') return false;
    return process.env.NODE_ENV !== 'production';
}

function getDatabaseUrl(): string {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error('DATABASE_URL is required for workspace fulfillment persistence');
    }
    return url;
}

// DIRECT_URL bypasses the connection pooler and is used for schema migrations.
// In production, DATABASE_URL points at Supavisor/PgBouncer (transaction mode);
// long-running DDL on a pooled connection holds a pool slot for the duration
// and competes with request-path queries. The direct URL avoids that and also
// preserves any session-level features (advisory locks, SET LOCAL on the
// migration session) that transaction pooling would not honor.
function getMigrationDatabaseUrl(): string {
    return process.env.DIRECT_URL || getDatabaseUrl();
}

async function applyMigrations(client: Client | PoolClient): Promise<void> {
    await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version text PRIMARY KEY,
            applied_at timestamptz NOT NULL DEFAULT now()
        )
    `);

    const entries = await fs.readdir(MIGRATIONS_DIR, { withFileTypes: true });
    const files = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
        .map((entry) => entry.name)
        .sort();

    for (const file of files) {
        const existing = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [file]);
        if (existing.rowCount) continue;

        const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
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
}

async function initializePool(): Promise<Pool> {
    // Per-instance pool of 5. With Supavisor/PgBouncer in front, total backend
    // connections = lambda_concurrency × 5 / pooler_multiplexing. Pooler must
    // be configured with default_pool_size sized to (postgres max_connections
    // - reserved) and pool_mode = transaction.
    const nextPool = new Pool({
        connectionString: getDatabaseUrl(),
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    });

    if (shouldAutoApplyMigrations()) {
        await runMigrationsWithDirectConnection();
    }

    return nextPool;
}

// Migrations run on a one-shot direct connection (DIRECT_URL when set, falling
// back to DATABASE_URL for local dev). This avoids holding a runtime pool slot
// during DDL and works correctly even when DATABASE_URL is a transaction-mode
// pooler that would otherwise route the migration's statements across
// different backend sessions.
export async function runMigrationsWithDirectConnection(): Promise<void> {
    const client = new Client({ connectionString: getMigrationDatabaseUrl() });
    await client.connect();
    try {
        await applyMigrations(client);
    } finally {
        await client.end();
    }
}

export { applyMigrations };

export async function getDbPool(): Promise<Pool> {
    if (pool) return pool;
    if (!initPromise) {
        initPromise = initializePool()
            .then((nextPool) => {
                pool = nextPool;
                return nextPool;
            })
            .catch((error) => {
                initPromise = null;
                throw error;
            });
    }
    return initPromise;
}

function describeQuery(text: string): { op: string; description: string } {
    // Cheap classification — first non-whitespace keyword. Used for span tagging
    // only; never parsed for safety-critical decisions.
    const trimmed = text.trim();
    const firstWord = trimmed.split(/\s+/, 1)[0]?.toUpperCase() ?? 'QUERY';
    // Truncate the SQL preview so a 50KB payload doesn't bloat trace storage.
    const description = trimmed.length > 200 ? trimmed.slice(0, 200) + '…' : trimmed;
    return { op: firstWord, description };
}

export async function dbQuery<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params: readonly unknown[] = []
): Promise<QueryResult<T>> {
    const activePool = await getDbPool();
    const { op, description } = describeQuery(text);
    return Sentry.startSpan(
        {
            name: `pg.${op.toLowerCase()}`,
            op: 'db.query',
            attributes: {
                'db.system': 'postgresql',
                'db.statement': description,
                'db.operation': op,
            },
        },
        () => activePool.query<T>(text, params as any[]),
    );
}

export async function withDbTransaction<T>(
    fn: (client: PoolClient) => Promise<T>
): Promise<T> {
    const activePool = await getDbPool();
    return Sentry.startSpan(
        {
            name: 'pg.transaction',
            op: 'db.transaction',
            attributes: { 'db.system': 'postgresql' },
        },
        async () => {
            const client = await activePool.connect();
            try {
                await client.query('BEGIN');
                const result = await fn(client);
                await client.query('COMMIT');
                return result;
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        },
    );
}
