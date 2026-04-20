/**
 * Account Resolution for Tier Enforcement
 *
 * Database-backed resolver with auto-init.
 * - Postgres when DATABASE_URL is set (production / Netlify)
 * - SQLite when no DATABASE_URL (local development)
 */

import crypto from 'crypto';
import { type Account, type PricingTier } from './tier-enforcement';

// ─────────────────────────────────────────────────────────────────────────────
// Database Abstraction
// ─────────────────────────────────────────────────────────────────────────────

interface AccountRow {
    id: string;
    tier: string;
    created_at: string;
    onboarding_completed?: number | boolean | null;
    onboarding_step?: string | null;
    onboarding_completed_at?: string | null;
    onboarding_mode?: string | null;
    last_api_activity_at?: string | null;
}

type OnboardingStep = 'IDENTIFIED' | 'ACTION_SELECTED' | 'VALUE_REALIZED';
type OnboardingMode = 'UI_SCAN' | 'API_FIRST' | 'NO_SITE';

interface DB {
    init(): Promise<void>;
    getAccount(id: string): Promise<AccountRow | null>;
    createAccount(id: string, tier: string): Promise<AccountRow>;
    updateOnboarding(
        id: string,
        onboarding: {
            completed: boolean;
            step: OnboardingStep;
            completedAt?: string;
            mode?: OnboardingMode;
        }
    ): Promise<AccountRow>;
    recordAPIActivity(id: string, at: string): Promise<void>;
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
                onboarding_completed INTEGER,
                onboarding_step TEXT,
                onboarding_completed_at TEXT,
                onboarding_mode TEXT,
                last_api_activity_at TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        `);

        const columns = db.prepare(`PRAGMA table_info(accounts)`).all() as Array<{ name: string }>;
        const existingColumns = new Set(columns.map((column) => column.name));
        const migrations = [
            ['onboarding_completed', 'ALTER TABLE accounts ADD COLUMN onboarding_completed INTEGER'],
            ['onboarding_step', 'ALTER TABLE accounts ADD COLUMN onboarding_step TEXT'],
            ['onboarding_completed_at', 'ALTER TABLE accounts ADD COLUMN onboarding_completed_at TEXT'],
            ['onboarding_mode', 'ALTER TABLE accounts ADD COLUMN onboarding_mode TEXT'],
            ['last_api_activity_at', 'ALTER TABLE accounts ADD COLUMN last_api_activity_at TEXT'],
        ] as const;

        for (const [column, sql] of migrations) {
            if (!existingColumns.has(column)) {
                db.exec(sql);
            }
        }
    }

    async getAccount(id: string): Promise<AccountRow | null> {
        const db = await this.getDB();
        const row = db.prepare(
            `SELECT id, tier, created_at, onboarding_completed, onboarding_step,
                    onboarding_completed_at, onboarding_mode, last_api_activity_at
             FROM accounts
             WHERE id = ?`
        ).get(id) as AccountRow | undefined;
        return row ?? null;
    }

    async createAccount(id: string, tier: string): Promise<AccountRow> {
        const now = new Date().toISOString();
        const db = await this.getDB();
        db.prepare(
            `INSERT INTO accounts (
                id, tier, onboarding_completed, onboarding_step, created_at
            )
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(id) DO NOTHING`
        ).run(id, tier, 0, 'IDENTIFIED', now);
        // Re-fetch to handle concurrent insert (ON CONFLICT)
        const row = await this.getAccount(id);
        return row!;
    }

    async updateOnboarding(
        id: string,
        onboarding: {
            completed: boolean;
            step: OnboardingStep;
            completedAt?: string;
            mode?: OnboardingMode;
        }
    ): Promise<AccountRow> {
        const db = await this.getDB();
        db.prepare(
            `UPDATE accounts
             SET onboarding_completed = ?,
                 onboarding_step = ?,
                 onboarding_completed_at = ?,
                 onboarding_mode = ?
             WHERE id = ?`
        ).run(
            onboarding.completed ? 1 : 0,
            onboarding.step,
            onboarding.completedAt ?? null,
            onboarding.mode ?? null,
            id
        );
        const row = await this.getAccount(id);
        return row!;
    }

    async recordAPIActivity(id: string, at: string): Promise<void> {
        const db = await this.getDB();
        db.prepare(
            `UPDATE accounts
             SET last_api_activity_at = ?
             WHERE id = ?`
        ).run(at, id);
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
                onboarding_completed BOOLEAN,
                onboarding_step TEXT,
                onboarding_completed_at TIMESTAMPTZ,
                onboarding_mode TEXT,
                last_api_activity_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
        await pool.query(`
            ALTER TABLE accounts
            ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN,
            ADD COLUMN IF NOT EXISTS onboarding_step TEXT,
            ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS onboarding_mode TEXT,
            ADD COLUMN IF NOT EXISTS last_api_activity_at TIMESTAMPTZ
        `);
    }

    async getAccount(id: string): Promise<AccountRow | null> {
        const pool = await this.getPool();
        const { rows } = await pool.query(
            `SELECT id, tier, created_at, onboarding_completed, onboarding_step,
                    onboarding_completed_at, onboarding_mode, last_api_activity_at
             FROM accounts
             WHERE id = $1`,
            [id]
        );
        if (rows.length === 0) return null;
        return {
            id: rows[0].id,
            tier: rows[0].tier,
            onboarding_completed: rows[0].onboarding_completed,
            onboarding_step: rows[0].onboarding_step,
            onboarding_completed_at: rows[0].onboarding_completed_at instanceof Date
                ? rows[0].onboarding_completed_at.toISOString()
                : rows[0].onboarding_completed_at
                    ? String(rows[0].onboarding_completed_at)
                    : null,
            onboarding_mode: rows[0].onboarding_mode,
            last_api_activity_at: rows[0].last_api_activity_at instanceof Date
                ? rows[0].last_api_activity_at.toISOString()
                : rows[0].last_api_activity_at
                    ? String(rows[0].last_api_activity_at)
                    : null,
            created_at: rows[0].created_at instanceof Date
                ? rows[0].created_at.toISOString()
                : String(rows[0].created_at),
        };
    }

    async createAccount(id: string, tier: string): Promise<AccountRow> {
        const pool = await this.getPool();
        const { rows } = await pool.query(
            `INSERT INTO accounts (id, tier, onboarding_completed, onboarding_step)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO NOTHING
             RETURNING id, tier, onboarding_completed, onboarding_step,
                       onboarding_completed_at, onboarding_mode, last_api_activity_at, created_at`,
            [id, tier, false, 'IDENTIFIED']
        );
        // If ON CONFLICT fired, RETURNING is empty — re-fetch
        if (rows.length === 0) {
            const existing = await this.getAccount(id);
            return existing!;
        }
        return {
            id: rows[0].id,
            tier: rows[0].tier,
            onboarding_completed: rows[0].onboarding_completed,
            onboarding_step: rows[0].onboarding_step,
            onboarding_completed_at: rows[0].onboarding_completed_at instanceof Date
                ? rows[0].onboarding_completed_at.toISOString()
                : rows[0].onboarding_completed_at
                    ? String(rows[0].onboarding_completed_at)
                    : null,
            onboarding_mode: rows[0].onboarding_mode,
            last_api_activity_at: rows[0].last_api_activity_at instanceof Date
                ? rows[0].last_api_activity_at.toISOString()
                : rows[0].last_api_activity_at
                    ? String(rows[0].last_api_activity_at)
                    : null,
            created_at: rows[0].created_at instanceof Date
                ? rows[0].created_at.toISOString()
                : String(rows[0].created_at),
        };
    }

    async updateOnboarding(
        id: string,
        onboarding: {
            completed: boolean;
            step: OnboardingStep;
            completedAt?: string;
            mode?: OnboardingMode;
        }
    ): Promise<AccountRow> {
        const pool = await this.getPool();
        await pool.query(
            `UPDATE accounts
             SET onboarding_completed = $2,
                 onboarding_step = $3,
                 onboarding_completed_at = $4,
                 onboarding_mode = $5
             WHERE id = $1`,
            [id, onboarding.completed, onboarding.step, onboarding.completedAt ?? null, onboarding.mode ?? null]
        );
        const row = await this.getAccount(id);
        return row!;
    }

    async recordAPIActivity(id: string, at: string): Promise<void> {
        const pool = await this.getPool();
        await pool.query(
            `UPDATE accounts
             SET last_api_activity_at = $2
             WHERE id = $1`,
            [id, at]
        );
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
    const onboardingStep = validateOnboardingStep(row.onboarding_step);
    const onboarding =
        row.onboarding_completed === null ||
        row.onboarding_completed === undefined ||
        onboardingStep === null
            ? undefined
            : {
                completed: Boolean(row.onboarding_completed),
                step: onboardingStep,
                completedAt: row.onboarding_completed_at ?? undefined,
                mode: validateOnboardingMode(row.onboarding_mode) ?? undefined,
            };

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
        onboarding,
    };
}

function validateTier(tier: string): PricingTier {
    if (tier === 'free' || tier === 'pro' || tier === 'enterprise') {
        return tier;
    }
    return 'free';
}

function validateOnboardingStep(step: unknown): OnboardingStep | null {
    if (step === 'IDENTIFIED' || step === 'ACTION_SELECTED' || step === 'VALUE_REALIZED') {
        return step;
    }
    return null;
}

function validateOnboardingMode(mode: unknown): OnboardingMode | null {
    if (mode === 'UI_SCAN' || mode === 'API_FIRST' || mode === 'NO_SITE') {
        return mode;
    }
    return null;
}

function accountIdForUser(userId: string): string {
    return `acc_${userId}`;
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
    const accountId = accountIdForUser(userId);

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
    if (process.env.DATABASE_URL) {
        try {
            const { dbQuery } = await import('./db/client');
            const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
            const { rows } = await dbQuery<{
                key_id: string;
                workspace_id: string;
                entitlement_tier: string;
            }>(
                `
                SELECT
                    k.id AS key_id,
                    w.id AS workspace_id,
                    w.entitlement_tier
                FROM workspace_api_keys k
                INNER JOIN workspaces w
                    ON w.id = k.workspace_id
                WHERE k.key_hash = $1
                  AND k.revoked_at IS NULL
                  AND w.deleted_at IS NULL
                LIMIT 1
                `,
                [keyHash]
            );

            const row = rows[0];
            if (row) {
                await dbQuery(
                    `
                    UPDATE workspace_api_keys
                    SET
                        last_used_at = now(),
                        updated_at = now()
                    WHERE id = $1
                    `,
                    [row.key_id]
                ).catch(() => null);

                const tier = validateTier(String(row.entitlement_tier));
                return {
                    id: `acc_workspace_${row.workspace_id}`,
                    billingTier: tier,
                    tierHistory: [
                        {
                            billingTier: tier,
                            changedAt: new Date().toISOString(),
                            reason: 'workspace_api_key',
                        },
                    ],
                };
            }

            return null;
        } catch (error) {
            console.error('[API_KEY_RESOLUTION_FAILED]', error);
            return null;
        }
    }

    const store = await getDB();
    const accountId = `acc_api_${apiKey.slice(0, 8)}`;

    const existing = await store.getAccount(accountId);
    if (existing) {
        return rowToAccount(existing);
    }

    const created = await store.createAccount(accountId, 'free');
    return rowToAccount(created);
}

export async function completeOnboarding(
    userId: string,
    mode: OnboardingMode
): Promise<Account['onboarding']> {
    const store = await getDB();
    const accountId = accountIdForUser(userId);
    const existing = await store.getAccount(accountId);

    if (!existing) {
        await store.createAccount(accountId, 'free');
    }

    const completedAt = new Date().toISOString();
    const updated = await store.updateOnboarding(accountId, {
        completed: true,
        step: 'VALUE_REALIZED',
        completedAt,
        mode,
    });

    return rowToAccount(updated).onboarding!;
}

export async function recordAccountAPIActivity(userId: string): Promise<void> {
    const store = await getDB();
    const accountId = accountIdForUser(userId);
    const existing = await store.getAccount(accountId);

    if (!existing) {
        await store.createAccount(accountId, 'free');
    }

    await store.recordAPIActivity(accountId, new Date().toISOString());
}

export async function hasAccountAPIActivity(userId: string): Promise<boolean> {
    const store = await getDB();
    const accountId = accountIdForUser(userId);
    const existing = await store.getAccount(accountId);
    return Boolean(existing?.last_api_activity_at);
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
