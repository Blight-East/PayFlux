/**
 * Onboarding Event Store
 *
 * Durable persistence for onboarding funnel events.
 * - Postgres when DATABASE_URL is set (production / Netlify)
 * - SQLite when no DATABASE_URL (local development)
 *
 * Follows the same dual-DB pattern as account-resolver.ts.
 */

export interface OnboardingEventRow {
    id: string;
    event_name: string;
    user_id: string | null;
    workspace_id: string | null;
    metadata: string; // JSON string
    created_at: string;
}

interface EventDB {
    init(): Promise<void>;
    insert(row: Omit<OnboardingEventRow, 'id'>): Promise<void>;
    query(opts: { limit?: number; userId?: string; eventName?: string }): Promise<OnboardingEventRow[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// SQLite Implementation (local development)
// ─────────────────────────────────────────────────────────────────────────────

class SQLiteEventDB implements EventDB {
    private db: any = null;

    private async getDB(): Promise<any> {
        if (!this.db) {
            const moduleName = 'better-sqlite3' as any;
            const sqlite3 = await import(/* webpackIgnore: true */ moduleName);
            const Database = sqlite3.default || sqlite3;

            const fsModule = 'fs' as any;
            const fs = await import(/* webpackIgnore: true */ fsModule);
            if (!fs.existsSync('.data')) {
                fs.mkdirSync('.data', { recursive: true });
            }

            this.db = new Database('.data/events.db');
            this.db.pragma('journal_mode = WAL');
        }
        return this.db;
    }

    async init(): Promise<void> {
        const db = await this.getDB();
        db.exec(`
            CREATE TABLE IF NOT EXISTS onboarding_events (
                id TEXT PRIMARY KEY,
                event_name TEXT NOT NULL,
                user_id TEXT,
                workspace_id TEXT,
                metadata TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_events_user ON onboarding_events(user_id);
        `);
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_events_name ON onboarding_events(event_name);
        `);
    }

    async insert(row: Omit<OnboardingEventRow, 'id'>): Promise<void> {
        const db = await this.getDB();
        const id = crypto.randomUUID();
        db.prepare(
            'INSERT INTO onboarding_events (id, event_name, user_id, workspace_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(id, row.event_name, row.user_id, row.workspace_id, row.metadata, row.created_at);
    }

    async query(opts: { limit?: number; userId?: string; eventName?: string }): Promise<OnboardingEventRow[]> {
        const db = await this.getDB();
        const conditions: string[] = [];
        const params: any[] = [];

        if (opts.userId) {
            conditions.push('user_id = ?');
            params.push(opts.userId);
        }
        if (opts.eventName) {
            conditions.push('event_name = ?');
            params.push(opts.eventName);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limit = opts.limit ?? 100;

        return db.prepare(
            `SELECT id, event_name, user_id, workspace_id, metadata, created_at FROM onboarding_events ${where} ORDER BY created_at DESC LIMIT ?`
        ).all(...params, limit) as OnboardingEventRow[];
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Postgres Implementation (production)
// ─────────────────────────────────────────────────────────────────────────────

class PostgresEventDB implements EventDB {
    private pool: any = null;

    private async getPool(): Promise<any> {
        if (!this.pool) {
            // pg is bundled by Next.js into server chunks
            const pg = await import('pg');
            const Pool = pg.Pool || (pg as any).default?.Pool;
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                max: 3,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000,
            });
        }
        return this.pool;
    }

    async init(): Promise<void> {
        const pool = await this.getPool();
        await pool.query(`
            CREATE TABLE IF NOT EXISTS onboarding_events (
                id TEXT PRIMARY KEY,
                event_name TEXT NOT NULL,
                user_id TEXT,
                workspace_id TEXT,
                metadata JSONB NOT NULL DEFAULT '{}',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_events_user ON onboarding_events(user_id)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_events_name ON onboarding_events(event_name)
        `);
    }

    async insert(row: Omit<OnboardingEventRow, 'id'>): Promise<void> {
        const pool = await this.getPool();
        const id = crypto.randomUUID();
        await pool.query(
            'INSERT INTO onboarding_events (id, event_name, user_id, workspace_id, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
            [id, row.event_name, row.user_id, row.workspace_id, row.metadata, row.created_at]
        );
    }

    async query(opts: { limit?: number; userId?: string; eventName?: string }): Promise<OnboardingEventRow[]> {
        const pool = await this.getPool();
        const conditions: string[] = [];
        const params: any[] = [];
        let paramIdx = 1;

        if (opts.userId) {
            conditions.push(`user_id = $${paramIdx++}`);
            params.push(opts.userId);
        }
        if (opts.eventName) {
            conditions.push(`event_name = $${paramIdx++}`);
            params.push(opts.eventName);
        }

        const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        params.push(opts.limit ?? 100);

        const { rows } = await pool.query(
            `SELECT id, event_name, user_id, workspace_id, metadata, created_at FROM onboarding_events ${where} ORDER BY created_at DESC LIMIT $${paramIdx}`,
            params
        );

        return rows.map((r: any) => ({
            id: r.id,
            event_name: r.event_name,
            user_id: r.user_id,
            workspace_id: r.workspace_id,
            metadata: typeof r.metadata === 'string' ? r.metadata : JSON.stringify(r.metadata),
            created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
        }));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton with lazy init
// ─────────────────────────────────────────────────────────────────────────────

let db: EventDB | null = null;
let initPromise: Promise<void> | null = null;

function createDB(): EventDB {
    if (process.env.DATABASE_URL) {
        return new PostgresEventDB();
    }
    return new SQLiteEventDB();
}

async function getEventDB(): Promise<EventDB> {
    if (!db) {
        db = createDB();
        initPromise = db.init().catch((err) => {
            // Reset so next call retries
            db = null;
            initPromise = null;
            throw err;
        });
    }
    await initPromise;
    return db;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persist an onboarding event to the durable store.
 * Fire-and-forget safe — never throws.
 */
export async function persistEvent(opts: {
    eventName: string;
    userId?: string | null;
    workspaceId?: string | null;
    metadata?: Record<string, unknown>;
}): Promise<void> {
    try {
        const store = await getEventDB();
        await store.insert({
            event_name: opts.eventName,
            user_id: opts.userId ?? null,
            workspace_id: opts.workspaceId ?? null,
            metadata: JSON.stringify(opts.metadata ?? {}),
            created_at: new Date().toISOString(),
        });
    } catch (err) {
        // Never block caller — log and move on
        console.error('[EVENT_STORE] Failed to persist event:', opts.eventName, err);
    }
}

/**
 * Query onboarding events. For diagnostics and funnel verification.
 */
export async function queryEvents(opts: {
    limit?: number;
    userId?: string;
    eventName?: string;
} = {}): Promise<OnboardingEventRow[]> {
    const store = await getEventDB();
    return store.query(opts);
}
