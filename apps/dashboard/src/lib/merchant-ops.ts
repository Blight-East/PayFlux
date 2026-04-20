export type IncidentStatus = 'new' | 'reviewing' | 'resolved';

export interface RiskIncidentRecord {
    workspaceId: string;
    host: string;
    status: IncidentStatus;
    owner: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

interface DB {
    init(): Promise<void>;
    getIncident(workspaceId: string, host: string): Promise<RiskIncidentRecord | null>;
    upsertIncident(
        input: Pick<RiskIncidentRecord, 'workspaceId' | 'host' | 'status' | 'owner' | 'notes'>
    ): Promise<RiskIncidentRecord>;
}

function normalizeHost(host: string): string {
    return host.trim().toLowerCase();
}

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
                throw new Error('SQLite cannot run in the browser');
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
            CREATE TABLE IF NOT EXISTS risk_incidents (
                workspace_id TEXT NOT NULL,
                host TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved')),
                owner TEXT,
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                PRIMARY KEY (workspace_id, host)
            )
        `);
    }

    async getIncident(workspaceId: string, host: string): Promise<RiskIncidentRecord | null> {
        const db = await this.getDB();
        const row = db.prepare(
            `SELECT workspace_id, host, status, owner, notes, created_at, updated_at
             FROM risk_incidents
             WHERE workspace_id = ? AND host = ?`
        ).get(workspaceId, normalizeHost(host)) as any;

        if (!row) return null;

        return {
            workspaceId: row.workspace_id,
            host: row.host,
            status: row.status,
            owner: row.owner ?? null,
            notes: row.notes ?? null,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    async upsertIncident(
        input: Pick<RiskIncidentRecord, 'workspaceId' | 'host' | 'status' | 'owner' | 'notes'>
    ): Promise<RiskIncidentRecord> {
        const now = new Date().toISOString();
        const host = normalizeHost(input.host);
        const db = await this.getDB();

        db.prepare(
            `INSERT INTO risk_incidents (
                workspace_id, host, status, owner, notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(workspace_id, host) DO UPDATE SET
                status = excluded.status,
                owner = excluded.owner,
                notes = excluded.notes,
                updated_at = excluded.updated_at`
        ).run(
            input.workspaceId,
            host,
            input.status,
            input.owner,
            input.notes,
            now,
            now
        );

        return (await this.getIncident(input.workspaceId, host))!;
    }
}

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
                throw new Error('Postgres cannot run in the browser');
            }
        }
        return this.pool;
    }

    async init(): Promise<void> {
        const pool = await this.getPool();
        await pool.query(`
            CREATE TABLE IF NOT EXISTS risk_incidents (
                workspace_id TEXT NOT NULL,
                host TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved')),
                owner TEXT,
                notes TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (workspace_id, host)
            )
        `);
    }

    async getIncident(workspaceId: string, host: string): Promise<RiskIncidentRecord | null> {
        const pool = await this.getPool();
        const { rows } = await pool.query(
            `SELECT workspace_id, host, status, owner, notes, created_at, updated_at
             FROM risk_incidents
             WHERE workspace_id = $1 AND host = $2`,
            [workspaceId, normalizeHost(host)]
        );

        if (rows.length === 0) return null;

        return {
            workspaceId: rows[0].workspace_id,
            host: rows[0].host,
            status: rows[0].status,
            owner: rows[0].owner ?? null,
            notes: rows[0].notes ?? null,
            createdAt: rows[0].created_at instanceof Date ? rows[0].created_at.toISOString() : String(rows[0].created_at),
            updatedAt: rows[0].updated_at instanceof Date ? rows[0].updated_at.toISOString() : String(rows[0].updated_at),
        };
    }

    async upsertIncident(
        input: Pick<RiskIncidentRecord, 'workspaceId' | 'host' | 'status' | 'owner' | 'notes'>
    ): Promise<RiskIncidentRecord> {
        const pool = await this.getPool();
        const host = normalizeHost(input.host);
        const { rows } = await pool.query(
            `INSERT INTO risk_incidents (
                workspace_id, host, status, owner, notes
            ) VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (workspace_id, host) DO UPDATE SET
                status = EXCLUDED.status,
                owner = EXCLUDED.owner,
                notes = EXCLUDED.notes,
                updated_at = NOW()
            RETURNING workspace_id, host, status, owner, notes, created_at, updated_at`,
            [input.workspaceId, host, input.status, input.owner, input.notes]
        );

        return {
            workspaceId: rows[0].workspace_id,
            host: rows[0].host,
            status: rows[0].status,
            owner: rows[0].owner ?? null,
            notes: rows[0].notes ?? null,
            createdAt: rows[0].created_at instanceof Date ? rows[0].created_at.toISOString() : String(rows[0].created_at),
            updatedAt: rows[0].updated_at instanceof Date ? rows[0].updated_at.toISOString() : String(rows[0].updated_at),
        };
    }
}

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
        initPromise = db.init();
    }
    await initPromise;
    return db;
}

export async function getRiskIncident(workspaceId: string, host: string) {
    const store = await getDB();
    return store.getIncident(workspaceId, host);
}

export async function upsertRiskIncident(
    input: Pick<RiskIncidentRecord, 'workspaceId' | 'host' | 'status' | 'owner' | 'notes'>
) {
    const store = await getDB();
    return store.upsertIncident({
        ...input,
        host: normalizeHost(input.host),
    });
}
