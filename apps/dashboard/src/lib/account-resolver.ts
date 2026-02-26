/**
 * Account Resolution for Tier Enforcement
 *
 * Database-backed resolver with auto-init.
 * - Postgres when DATABASE_URL is set (production / Netlify)
 * - SQLite when no DATABASE_URL (local development)
 */

import { type Account, type PricingTier } from './tier-enforcement';

// ─────────────────────────────────────────────────────────────────────────────
// Database Abstraction
// ─────────────────────────────────────────────────────────────────────────────

interface AccountRow {
    id: string;
    tier: string;
    created_at: string;
}

interface DB {
    init(): Promise<void>;
    getAccount(id: string): Promise<AccountRow | null>;
    createAccount(id: string, tier: string): Promise<AccountRow>;
}

// ─────────────────────────────────────────────────────────────────────────────
// SQLite Implementation (local development)
// ─────────────────────────────────────────────────────────────────────────────

class SQLiteDB implements DB {
    private db: any = null;

    private async getDB(): Promise<any> {
        if (!this.db) {
            if (process.env.RUNTIME === 'node' || typeof window === 'undefined') {
                const moduleName = 'better-sqlite3' as any;
                const sqlite3 = await import(/* webpackIgnore: true */ moduleName);
                const Database = sqlite3.default || sqlite3;
                this.db = new Database('.data/accounts.db');
                this.db.pragma('journal_mode = WAL');
            } else {
                throw new Error("SQLite cannot run in the browser");
            }
        }
        return this.db;
    }

    async init(): Promise<void> {
        const fs = await import('fs');
        if (!fs.existsSync('.data')) {
            fs.mkdirSync('.data', { recursive: true });
        }
        const db = await this.getDB();
        db.exec(`
            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','pro','enterprise')),
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        `);
    }

    async getAccount(id: string): Promise<AccountRow | null> {
        const db = await this.getDB();
        const row = db.prepare(
            'SELECT id, tier, created_at FROM accounts WHERE id = ?'
        ).get(id) as AccountRow | undefined;
        return row ?? null;
    }

    async createAccount(id: string, tier: string): Promise<AccountRow> {
        const now = new Date().toISOString();
        const db = await this.getDB();
        db.prepare(
            'INSERT INTO accounts (id, tier, created_at) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING'
        ).run(id, tier, now);
        // Re-fetch to handle concurrent insert (ON CONFLICT)
        const row = await this.getAccount(id);
        return row!;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Postgres Implementation (production)
// ─────────────────────────────────────────────────────────────────────────────

class PostgresDB implements DB {
    private pool: any = null;

    private async getPool(): Promise<any> {
        if (!this.pool) {
            if (process.env.RUNTIME === 'node' || typeof window === 'undefined') {
                const moduleName = 'pg' as any;
                const pg = await import(/* webpackIgnore: true */ moduleName);
                const Pool = pg.Pool || pg.default?.Pool;
                this.pool = new Pool({
                    connectionString: process.env.DATABASE_URL,
                    max: 5,
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 5000,
                });
            } else {
                throw new Error("Postgres cannot run in the browser");
            }
        }
        return this.pool;
    }

    async init(): Promise<void> {
        const pool = await this.getPool();
        await pool.query(`
            CREATE TABLE IF NOT EXISTS accounts (
                id TEXT PRIMARY KEY,
                tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','pro','enterprise')),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
    }

    async getAccount(id: string): Promise<AccountRow | null> {
        const pool = await this.getPool();
        const { rows } = await pool.query(
            'SELECT id, tier, created_at FROM accounts WHERE id = $1',
            [id]
        );
        if (rows.length === 0) return null;
        return {
            id: rows[0].id,
            tier: rows[0].tier,
            created_at: rows[0].created_at instanceof Date
                ? rows[0].created_at.toISOString()
                : String(rows[0].created_at),
        };
    }

    async createAccount(id: string, tier: string): Promise<AccountRow> {
        const pool = await this.getPool();
        const { rows } = await pool.query(
            `INSERT INTO accounts (id, tier) VALUES ($1, $2)
             ON CONFLICT (id) DO NOTHING
             RETURNING id, tier, created_at`,
            [id, tier]
        );
        // If ON CONFLICT fired, RETURNING is empty — re-fetch
        if (rows.length === 0) {
            const existing = await this.getAccount(id);
            return existing!;
        }
        return {
            id: rows[0].id,
            tier: rows[0].tier,
            created_at: rows[0].created_at instanceof Date
                ? rows[0].created_at.toISOString()
                : String(rows[0].created_at),
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton DB instance with lazy init
// ─────────────────────────────────────────────────────────────────────────────

let db: DB | null = null;
let initPromise: Promise<void> | null = null;

function createDB(): DB {
    if (process.env.DATABASE_URL) {
        return new PostgresDB();
    }
    return new SQLiteDB();
}

async function getDB(): Promise<DB> {
    if (!db) {
        db = createDB();
        // Shared promise prevents concurrent init races
        initPromise = db.init();
    }
    await initPromise;
    return db;
}

// ─────────────────────────────────────────────────────────────────────────────
// Row → Account conversion
// ─────────────────────────────────────────────────────────────────────────────

function rowToAccount(row: AccountRow): Account {
    const tier = validateTier(row.tier);
    return {
        id: row.id,
        billingTier: tier,
        tierHistory: [
            {
                billingTier: tier,
                changedAt: row.created_at,
                reason: 'initial',
            },
        ],
    };
}

function validateTier(tier: string): PricingTier {
    if (tier === 'free' || tier === 'pro' || tier === 'enterprise') {
        return tier;
    }
    return 'free';
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API (signatures unchanged)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve account information for a given user ID.
 *
 * Queries database. Creates account with tier=free if not found.
 *
 * @param userId - Clerk user ID
 * @returns Account object or null if userId is null
 */
export async function resolveAccount(userId: string | null): Promise<Account | null> {
    if (!userId) {
        return null;
    }

    const store = await getDB();
    const accountId = `acc_${userId}`;

    const existing = await store.getAccount(accountId);
    if (existing) {
        return rowToAccount(existing);
    }

    const created = await store.createAccount(accountId, 'free');
    return rowToAccount(created);
}

/**
 * Resolves an account from an API key.
 *
 * Queries database. Creates account with tier=free if not found.
 *
 * @param apiKey - API key from Authorization header
 * @returns Account object or null if not found
 */
export async function resolveAccountFromAPIKey(apiKey: string): Promise<Account | null> {
    const store = await getDB();
    const accountId = `acc_api_${apiKey.slice(0, 8)}`;

    const existing = await store.getAccount(accountId);
    if (existing) {
        return rowToAccount(existing);
    }

    const created = await store.createAccount(accountId, 'free');
    return rowToAccount(created);
}

/**
 * Environment variable fallback for tier resolution.
 *
 * This provides backward compatibility with the old PAYFLUX_TIER env var.
 *
 * @deprecated Use account-based tier resolution instead
 * @returns PricingTier based on PAYFLUX_TIER env var
 */
export function getEnvTierFallback(): PricingTier {
    const envTier = process.env.PAYFLUX_TIER;

    // Map old tier1/tier2 to new pricing tiers
    if (envTier === 'tier1') {
        return 'free';
    }
    if (envTier === 'tier2') {
        return 'pro';
    }

    // Default to free if not set
    return 'free';
}
