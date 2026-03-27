import fs from 'fs/promises';
import path from 'path';
import { Pool, type PoolClient, type QueryResult } from 'pg';

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

async function applyMigrations(client: PoolClient): Promise<void> {
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
    const nextPool = new Pool({
        connectionString: getDatabaseUrl(),
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    });

    if (shouldAutoApplyMigrations()) {
        const client = await nextPool.connect();
        try {
            await applyMigrations(client);
        } finally {
            client.release();
        }
    }

    return nextPool;
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

export async function dbQuery<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params: readonly unknown[] = []
): Promise<QueryResult<T>> {
    const activePool = await getDbPool();
    return activePool.query<T>(text, params as any[]);
}

export async function withDbTransaction<T>(
    fn: (client: PoolClient) => Promise<T>
): Promise<T> {
    const activePool = await getDbPool();
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
}
