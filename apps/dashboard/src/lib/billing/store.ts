import type { PricingTier } from '@/lib/tier-enforcement';

export type BillingStatus =
    | 'incomplete'
    | 'incomplete_expired'
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'unpaid'
    | 'paused';

export interface BillingCustomerRecord {
    userId: string;
    email: string;
    stripeCustomerId: string;
    createdAt: string;
    updatedAt: string;
}

export interface SubscriptionRecord {
    id: string;
    userId: string;
    workspaceId: string | null;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    stripeCheckoutSessionId: string | null;
    status: BillingStatus;
    plan: PricingTier;
    stripePriceId: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    lastEventTimestamp: number;
    createdAt: string;
    updatedAt: string;
}

type SqliteDatabase = any;
type PostgresPool = any;

let sqliteDb: SqliteDatabase | null = null;
let pgPool: PostgresPool | null = null;
let initPromise: Promise<void> | null = null;

const SQLITE_PATH = '.data/billing.db';

async function getSqliteDb(): Promise<SqliteDatabase> {
    if (!sqliteDb) {
        try {
            const fs = await import('fs');
            if (!fs.existsSync('.data')) {
                fs.mkdirSync('.data', { recursive: true });
            }
            const moduleName = 'better-sqlite3' as any;
            const sqlite3 = await import(moduleName);
            const Database = sqlite3.default || sqlite3;
            sqliteDb = new Database(SQLITE_PATH);
            sqliteDb.pragma('journal_mode = WAL');
        } catch (error) {
            console.error('SQLite unavailable (expected on serverless):', (error as Error).message);
            throw new Error('DATABASE_URL is required in production — SQLite is not available on serverless runtimes');
        }
    }
    return sqliteDb;
}

async function getPgPool(): Promise<PostgresPool> {
    if (!pgPool) {
        const moduleName = 'pg' as any;
        const pg = await import(moduleName);
        const Pool = pg.Pool || pg.default?.Pool;
        const connectionString = process.env.DATABASE_URL!;
        const needsSsl = connectionString.includes('neon.tech') || connectionString.includes('sslmode=require');
        pgPool = new Pool({
            connectionString,
            max: 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
        });
    }
    return pgPool;
}

async function runSql(sql: string): Promise<void> {
    if (process.env.DATABASE_URL) {
        const pool = await getPgPool();
        await pool.query(sql);
        return;
    }

    const db = await getSqliteDb();
    db.exec(sql);
}

async function hasColumn(tableName: string, columnName: string): Promise<boolean> {
    if (process.env.DATABASE_URL) {
        const pool = await getPgPool();
        const { rows } = await pool.query(
            `SELECT 1
             FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
             LIMIT 1`,
            [tableName, columnName]
        );
        return rows.length > 0;
    }

    const db = await getSqliteDb();
    const rows = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return rows.some((row: any) => row.name === columnName);
}

async function ensureColumn(tableName: string, columnName: string, definition: string): Promise<void> {
    if (await hasColumn(tableName, columnName)) {
        return;
    }

    await runSql(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

export async function runPgQuery(sql: string, params: any[] = []): Promise<{ rowCount: number; rows: any[] }> {
    await initBillingStore();
    if (process.env.DATABASE_URL) {
        const pool = await getPgPool();
        const result = await pool.query(sql, params);
        return { rowCount: result.rowCount ?? 0, rows: result.rows };
    }
    const db = await getSqliteDb();
    const stmt = db.prepare(sql.replace(/\$\d+/g, '?'));
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
        const rows = stmt.all(...params);
        return { rowCount: rows.length, rows };
    }
    const result = stmt.run(...params);
    return { rowCount: result.changes, rows: [] };
}

export async function initBillingStore(): Promise<void> {
    if (!initPromise) {
        initPromise = (async () => {
            await runSql(`
                CREATE TABLE IF NOT EXISTS billing_customers (
                    user_id TEXT PRIMARY KEY,
                    email TEXT NOT NULL,
                    stripe_customer_id TEXT NOT NULL UNIQUE,
                    created_at ${process.env.DATABASE_URL ? 'TIMESTAMPTZ' : 'TEXT'} NOT NULL DEFAULT ${process.env.DATABASE_URL ? 'NOW()' : "(datetime('now'))"},
                    updated_at ${process.env.DATABASE_URL ? 'TIMESTAMPTZ' : 'TEXT'} NOT NULL DEFAULT ${process.env.DATABASE_URL ? 'NOW()' : "(datetime('now'))"}
                )
            `);

            await runSql(`
                CREATE TABLE IF NOT EXISTS subscriptions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    workspace_id TEXT,
                    stripe_customer_id TEXT NOT NULL,
                    stripe_subscription_id TEXT NOT NULL UNIQUE,
                    stripe_checkout_session_id TEXT UNIQUE,
                    status TEXT NOT NULL,
                    plan TEXT NOT NULL DEFAULT 'free',
                    stripe_price_id TEXT,
                    current_period_end ${process.env.DATABASE_URL ? 'TIMESTAMPTZ' : 'TEXT'},
                    cancel_at_period_end ${process.env.DATABASE_URL ? 'BOOLEAN' : 'INTEGER'} NOT NULL DEFAULT ${process.env.DATABASE_URL ? 'FALSE' : '0'},
                    last_event_timestamp ${process.env.DATABASE_URL ? 'BIGINT' : 'INTEGER'} NOT NULL DEFAULT 0,
                    created_at ${process.env.DATABASE_URL ? 'TIMESTAMPTZ' : 'TEXT'} NOT NULL DEFAULT ${process.env.DATABASE_URL ? 'NOW()' : "(datetime('now'))"},
                    updated_at ${process.env.DATABASE_URL ? 'TIMESTAMPTZ' : 'TEXT'} NOT NULL DEFAULT ${process.env.DATABASE_URL ? 'NOW()' : "(datetime('now'))"}
                )
            `);

            await ensureColumn(
                'subscriptions',
                'last_event_timestamp',
                `${process.env.DATABASE_URL ? 'BIGINT' : 'INTEGER'} NOT NULL DEFAULT 0`
            );

            await runSql(`
                CREATE TABLE IF NOT EXISTS stripe_webhook_events (
                    event_id TEXT PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    created_at ${process.env.DATABASE_URL ? 'TIMESTAMPTZ' : 'TEXT'} NOT NULL DEFAULT ${process.env.DATABASE_URL ? 'NOW()' : "(datetime('now'))"}
                )
            `);

            await runSql(`
                CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
                ON subscriptions (user_id)
            `);

            await runSql(`
                CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_id
                ON subscriptions (workspace_id)
            `);

            await runSql(`
                CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id
                ON subscriptions (stripe_customer_id)
            `);
        })();
    }

    await initPromise;
}

function normalizeTimestamp(value: unknown): string | null {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    return String(value);
}

function mapCustomerRow(row: any): BillingCustomerRecord {
    return {
        userId: row.user_id,
        email: row.email,
        stripeCustomerId: row.stripe_customer_id,
        createdAt: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
        updatedAt: normalizeTimestamp(row.updated_at) ?? new Date().toISOString(),
    };
}

function mapSubscriptionRow(row: any): SubscriptionRecord {
    return {
        id: row.id,
        userId: row.user_id,
        workspaceId: row.workspace_id ?? null,
        stripeCustomerId: row.stripe_customer_id,
        stripeSubscriptionId: row.stripe_subscription_id,
        stripeCheckoutSessionId: row.stripe_checkout_session_id ?? null,
        status: row.status,
        plan: row.plan,
        stripePriceId: row.stripe_price_id ?? null,
        currentPeriodEnd: normalizeTimestamp(row.current_period_end),
        cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
        lastEventTimestamp: Number(row.last_event_timestamp ?? 0),
        createdAt: normalizeTimestamp(row.created_at) ?? new Date().toISOString(),
        updatedAt: normalizeTimestamp(row.updated_at) ?? new Date().toISOString(),
    };
}

export async function getBillingCustomerByUserId(userId: string): Promise<BillingCustomerRecord | null> {
    await initBillingStore();

    if (process.env.DATABASE_URL) {
        const pool = await getPgPool();
        const { rows } = await pool.query(
            `SELECT user_id, email, stripe_customer_id, created_at, updated_at
             FROM billing_customers
             WHERE user_id = $1
             LIMIT 1`,
            [userId]
        );
        return rows[0] ? mapCustomerRow(rows[0]) : null;
    }

    const db = await getSqliteDb();
    const row = db.prepare(
        `SELECT user_id, email, stripe_customer_id, created_at, updated_at
         FROM billing_customers
         WHERE user_id = ?
         LIMIT 1`
    ).get(userId);
    return row ? mapCustomerRow(row) : null;
}

export async function saveBillingCustomer(
    userId: string,
    email: string,
    stripeCustomerId: string
): Promise<BillingCustomerRecord> {
    await initBillingStore();

    if (process.env.DATABASE_URL) {
        const pool = await getPgPool();
        const { rows } = await pool.query(
            `INSERT INTO billing_customers (user_id, email, stripe_customer_id, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (user_id) DO UPDATE SET
                email = EXCLUDED.email,
                stripe_customer_id = EXCLUDED.stripe_customer_id,
                updated_at = NOW()
             RETURNING user_id, email, stripe_customer_id, created_at, updated_at`,
            [userId, email, stripeCustomerId]
        );
        return mapCustomerRow(rows[0]);
    }

    const db = await getSqliteDb();
    db.prepare(
        `INSERT INTO billing_customers (user_id, email, stripe_customer_id, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
            email = excluded.email,
            stripe_customer_id = excluded.stripe_customer_id,
            updated_at = datetime('now')`
    ).run(userId, email, stripeCustomerId);

    return (await getBillingCustomerByUserId(userId))!;
}

export async function getSubscriptionByUserId(userId: string): Promise<SubscriptionRecord | null> {
    await initBillingStore();

    if (process.env.DATABASE_URL) {
        const pool = await getPgPool();
        const { rows } = await pool.query(
            `SELECT *
             FROM subscriptions
             WHERE user_id = $1
             ORDER BY updated_at DESC
             LIMIT 1`,
            [userId]
        );
        return rows[0] ? mapSubscriptionRow(rows[0]) : null;
    }

    const db = await getSqliteDb();
    const row = db.prepare(
        `SELECT *
         FROM subscriptions
         WHERE user_id = ?
         ORDER BY updated_at DESC
         LIMIT 1`
    ).get(userId);
    return row ? mapSubscriptionRow(row) : null;
}

export async function getSubscriptionByWorkspaceId(workspaceId: string): Promise<SubscriptionRecord | null> {
    await initBillingStore();

    if (process.env.DATABASE_URL) {
        const pool = await getPgPool();
        const { rows } = await pool.query(
            `SELECT *
             FROM subscriptions
             WHERE workspace_id = $1
             ORDER BY updated_at DESC
             LIMIT 1`,
            [workspaceId]
        );
        return rows[0] ? mapSubscriptionRow(rows[0]) : null;
    }

    const db = await getSqliteDb();
    const row = db.prepare(
        `SELECT *
         FROM subscriptions
         WHERE workspace_id = ?
         ORDER BY updated_at DESC
         LIMIT 1`
    ).get(workspaceId);
    return row ? mapSubscriptionRow(row) : null;
}

export async function upsertSubscription(
    input: Omit<SubscriptionRecord, 'createdAt' | 'updatedAt'>
): Promise<SubscriptionRecord> {
    await initBillingStore();

    if (process.env.DATABASE_URL) {
        const pool = await getPgPool();
        const { rows } = await pool.query(
            `INSERT INTO subscriptions (
                id,
                user_id,
                workspace_id,
                stripe_customer_id,
                stripe_subscription_id,
                stripe_checkout_session_id,
                status,
                plan,
                stripe_price_id,
                current_period_end,
                cancel_at_period_end,
                last_event_timestamp,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
            ON CONFLICT (stripe_subscription_id) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                workspace_id = EXCLUDED.workspace_id,
                stripe_customer_id = EXCLUDED.stripe_customer_id,
                stripe_checkout_session_id = EXCLUDED.stripe_checkout_session_id,
                status = EXCLUDED.status,
                plan = EXCLUDED.plan,
                stripe_price_id = EXCLUDED.stripe_price_id,
                current_period_end = EXCLUDED.current_period_end,
                cancel_at_period_end = EXCLUDED.cancel_at_period_end,
                last_event_timestamp = EXCLUDED.last_event_timestamp,
                updated_at = NOW()
            WHERE subscriptions.last_event_timestamp <= EXCLUDED.last_event_timestamp
            RETURNING *`,
            [
                input.id,
                input.userId,
                input.workspaceId,
                input.stripeCustomerId,
                input.stripeSubscriptionId,
                input.stripeCheckoutSessionId,
                input.status,
                input.plan,
                input.stripePriceId,
                input.currentPeriodEnd ? new Date(input.currentPeriodEnd) : null,
                input.cancelAtPeriodEnd,
                input.lastEventTimestamp,
            ]
        );
        // If no rows returned, it means an older event tried to overwrite newer state — return existing
        if (!rows[0]) {
            const existing = await pool.query(
                `SELECT * FROM subscriptions WHERE stripe_subscription_id = $1 LIMIT 1`,
                [input.stripeSubscriptionId]
            );
            if (existing.rows[0]) {
                console.log(`Out-of-order event skipped for ${input.stripeSubscriptionId} (event ts: ${input.lastEventTimestamp})`);
                return mapSubscriptionRow(existing.rows[0]);
            }
        }
        return mapSubscriptionRow(rows[0]);
    }

    const db = await getSqliteDb();
    db.prepare(
        `INSERT INTO subscriptions (
            id,
            user_id,
            workspace_id,
            stripe_customer_id,
            stripe_subscription_id,
            stripe_checkout_session_id,
            status,
            plan,
            stripe_price_id,
            current_period_end,
            cancel_at_period_end,
            last_event_timestamp,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(stripe_subscription_id) DO UPDATE SET
            user_id = excluded.user_id,
            workspace_id = excluded.workspace_id,
            stripe_customer_id = excluded.stripe_customer_id,
            stripe_checkout_session_id = excluded.stripe_checkout_session_id,
            status = excluded.status,
            plan = excluded.plan,
            stripe_price_id = excluded.stripe_price_id,
            current_period_end = excluded.current_period_end,
            cancel_at_period_end = excluded.cancel_at_period_end,
            last_event_timestamp = excluded.last_event_timestamp,
            updated_at = datetime('now')
        WHERE last_event_timestamp <= excluded.last_event_timestamp`
    ).run(
        input.id,
        input.userId,
        input.workspaceId,
        input.stripeCustomerId,
        input.stripeSubscriptionId,
        input.stripeCheckoutSessionId,
        input.status,
        input.plan,
        input.stripePriceId,
        input.currentPeriodEnd,
        input.cancelAtPeriodEnd ? 1 : 0,
        input.lastEventTimestamp
    );

    const row = db.prepare(
        `SELECT *
         FROM subscriptions
         WHERE stripe_subscription_id = ?
         LIMIT 1`
    ).get(input.stripeSubscriptionId);
    return mapSubscriptionRow(row);
}
