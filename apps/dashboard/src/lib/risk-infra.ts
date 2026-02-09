/**
 * Risk Infrastructure Helper
 * 
 * Implements:
 * 1. Storage Interface (Memory/Redis)
 * 2. Token Bucket Rate Limiter (Keyed & Tiered)
 * 3. Risk Caching (URL, Policy, DNS, Negative)
 * 4. Concurrency Deduplication
 * 5. Observability (Metrics & Logging)
 * 6. Quota Management
 */

interface RiskStore {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

const REDIS_URL = process.env.RISK_REDIS_URL;
const REDIS_TOKEN = process.env.RISK_REDIS_TOKEN;

// ─────────────────────────────────────────────────────────────────────────────
// Observability (Metrics & Logs)
// ─────────────────────────────────────────────────────────────────────────────

export class RiskMetrics {
    private static counters = new Map<string, number>();

    static inc(metric: string, tags: Record<string, string> = {}) {
        const tagStr = Object.entries(tags).sort().map(([k, v]) => `${k}=${v}`).join(',');
        const key = `${metric}{${tagStr}}`;
        const current = this.counters.get(key) || 0;
        this.counters.set(key, current + 1);
    }

    static snapshot() {
        return Object.fromEntries(this.counters);
    }

    static clear() {
        this.counters.clear();
    }
}

export class RiskLogger {
    static log(event: string, context: Record<string, any>) {
        if (process.env.NODE_ENV === 'test') return;
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            event,
            ...context
        }));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Implementations
// ─────────────────────────────────────────────────────────────────────────────

class MemoryStore implements RiskStore {
    private store = new Map<string, { val: string; exp: number }>();

    async get(key: string): Promise<string | null> {
        const item = this.store.get(key);
        if (!item) return null;
        if (Date.now() > item.exp) {
            this.store.delete(key);
            return null;
        }
        return item.val;
    }

    async set(key: string, value: string, ttlSeconds: number): Promise<void> {
        this.store.set(key, {
            val: value,
            exp: Date.now() + ttlSeconds * 1000,
        });
        if (Math.random() < 0.01) this.cleanup();
    }

    private cleanup() {
        const now = Date.now();
        for (const [key, val] of this.store.entries()) {
            if (now > val.exp) this.store.delete(key);
        }
    }
}

class RedisStore implements RiskStore {
    private url: string;
    private token: string;

    constructor(url: string, token: string) {
        // Ensure url doesn't have trailing slash for REST API
        this.url = url.endsWith('/') ? url.slice(0, -1) : url;
        this.token = token;
    }

    async get(key: string): Promise<string | null> {
        try {
            const res = await fetch(`${this.url}/get/${key}`, {
                headers: { Authorization: `Bearer ${this.token}` }
            });
            if (!res.ok) {
                console.error('REDIS_GET_ERROR:', { status: res.status, key });
                return null;
            }
            const data = await res.json();
            return data.result;
        } catch (e) {
            console.error('REDIS_GET_EXCEPTION:', { key, error: (e as Error).message });
            return null;
        }
    }

    async set(key: string, value: string, ttlSeconds: number): Promise<void> {
        try {
            const res = await fetch(`${this.url}/set/${key}/${encodeURIComponent(value)}/EX/${ttlSeconds}`, {
                headers: { Authorization: `Bearer ${this.token}` }
            });
            if (!res.ok) console.error('REDIS_SET_ERROR:', { status: res.status, key });
        } catch (e) {
            console.error('REDIS_SET_EXCEPTION:', { key, error: (e as Error).message });
        }
    }

    // Special helpers for Evidence Export (Lists and Hashes)
    async listPush(key: string, value: string): Promise<void> {
        try {
            const res = await fetch(`${this.url}/lpush/${key}/${encodeURIComponent(value)}`, {
                headers: { Authorization: `Bearer ${this.token}` }
            });
            if (!res.ok) console.error('REDIS_LPUSH_ERROR:', { status: res.status, key });
        } catch (e) {
            console.error('REDIS_LPUSH_EXCEPTION:', { key, error: (e as Error).message });
        }
    }

    async listGetAll(key: string): Promise<string[]> {
        try {
            const res = await fetch(`${this.url}/lrange/${key}/0/-1`, {
                headers: { Authorization: `Bearer ${this.token}` }
            });
            if (!res.ok) {
                console.error('REDIS_LRANGE_ERROR:', { status: res.status, key });
                return [];
            }
            const data = await res.json();
            return data.result || [];
        } catch (e) {
            console.error('REDIS_LRANGE_EXCEPTION:', { key, error: (e as Error).message });
            return [];
        }
    }

    async hashSet(key: string, field: string, value: string): Promise<void> {
        try {
            const res = await fetch(`${this.url}/hset/${key}/${field}/${encodeURIComponent(value)}`, {
                headers: { Authorization: `Bearer ${this.token}` }
            });
            if (!res.ok) console.error('REDIS_HSET_ERROR:', { status: res.status, key, field });
        } catch (e) {
            console.error('REDIS_HSET_EXCEPTION:', { key, field, error: (e as Error).message });
        }
    }

    async hashGetAll(key: string): Promise<Record<string, string>> {
        try {
            const res = await fetch(`${this.url}/hgetall/${key}`, {
                headers: { Authorization: `Bearer ${this.token}` }
            });
            if (!res.ok) {
                console.error('REDIS_HGETALL_ERROR:', { status: res.status, key });
                return {};
            }
            const data = await res.json();
            // Upstash hgetall returns [key1, val1, key2, val2, ...]
            const result: Record<string, string> = {};
            const arr = data.result || [];
            for (let i = 0; i < arr.length; i += 2) {
                result[arr[i]] = arr[i + 1];
            }
            return result;
        } catch (e) {
            console.error('REDIS_HGETALL_EXCEPTION:', { key, error: (e as Error).message });
            return {};
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Risk Intelligence (History & Trends) - PR #12
// ─────────────────────────────────────────────────────────────────────────────

export interface StoredRiskReport {
    id: string;
    merchantId: string;
    createdAt: string;
    traceId: string;
    payload: any; // The exact ResponseSchema
    source: 'fresh' | 'cache';
}

export interface MerchantSnapshot {
    merchantId: string;
    normalizedHost: string;
    scanCount: number;
    lastScanAt: string;
    currentRiskTier: number;
    tierDeltaLast: number;
    trend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
    policySurface: {
        present: number;
        weak: number;
        missing: number;
    };
}

export class RiskIntelligence {
    private static reports: StoredRiskReport[] = [];
    private static snapshots = new Map<string, MerchantSnapshot>();

    static async record(traceId: string, payload: any, source: 'fresh' | 'cache' = 'fresh'): Promise<void> {
        console.log('DEBUG_RECORD_ENTRY:', { traceId, source });
        const url = payload.url;
        let hostname = 'unknown';
        try { hostname = new URL(url).hostname.toLowerCase(); } catch { }
        const normalizedHost = hostname;
        const merchantId = Buffer.from(normalizedHost).toString('base64').replace(/=/g, '').slice(-12);

        const report: StoredRiskReport = {
            id: crypto.randomUUID(),
            merchantId,
            createdAt: new Date().toISOString(),
            traceId,
            payload,
            source,
        };

        if (store instanceof RedisStore) {
            await store.listPush('evidence:reports', JSON.stringify(report));
        } else {
            this.reports.push(report);
        }

        RiskMetrics.inc('risk_history_writes_total');

        // Update Snapshot
        const existing = store instanceof RedisStore
            ? JSON.parse(await store.get(`snap:${merchantId}`) || 'null')
            : this.snapshots.get(merchantId);

        const currentTier = payload.riskTier;

        let trend: MerchantSnapshot['trend'] = 'STABLE';
        let tierDeltaLast = 0;

        if (existing) {
            tierDeltaLast = currentTier - existing.currentRiskTier;
            if (tierDeltaLast > 0) trend = 'DEGRADING';
            else if (tierDeltaLast < 0) trend = 'IMPROVING';
            else trend = 'STABLE';
        }

        const policySurface = { present: 0, weak: 0, missing: 0 };
        Object.values(payload.policies || {}).forEach((p: any) => {
            if (p.status === 'Present') policySurface.present++;
            else if (p.status === 'Weak') policySurface.weak++;
            else policySurface.missing++;
        });

        const snapshot: MerchantSnapshot = {
            merchantId,
            normalizedHost,
            scanCount: (existing?.scanCount || 0) + 1,
            lastScanAt: report.createdAt,
            currentRiskTier: currentTier,
            tierDeltaLast,
            trend,
            policySurface,
        };

        if (store instanceof RedisStore) {
            await store.hashSet('evidence:snapshots', merchantId, JSON.stringify(snapshot));
            // Also store individual snapshot for faster trend lookup
            await store.set(`snap:${merchantId}`, JSON.stringify(snapshot), 86400 * 30);
        } else {
            this.snapshots.set(merchantId, snapshot);
        }
        console.log('DEBUG_RECORD_COMPLETE:', { merchantId });
    }

    static async getHistory(url: string): Promise<{ merchantId: string; normalizedHost: string; scans: StoredRiskReport[] }> {
        let hostname = 'unknown';
        try { hostname = new URL(url).hostname.toLowerCase(); } catch { }
        const normalizedHost = hostname;
        const merchantId = Buffer.from(normalizedHost).toString('base64').replace(/=/g, '').slice(-12);
        const allReports = await this.getAllReports();
        const scans = allReports.filter(r => r.merchantId === merchantId);
        RiskMetrics.inc('risk_history_reads_total');
        return { merchantId, normalizedHost, scans };
    }

    static async getTrend(url: string): Promise<MerchantSnapshot | null> {
        let hostname = 'unknown';
        try { hostname = new URL(url).hostname.toLowerCase(); } catch { }
        const normalizedHost = hostname;
        const merchantId = Buffer.from(normalizedHost).toString('base64').replace(/=/g, '').slice(-12);
        RiskMetrics.inc('risk_trend_reads_total');

        if (store instanceof RedisStore) {
            const snap = await store.get(`snap:${merchantId}`);
            return snap ? JSON.parse(snap) : null;
        }
        return this.snapshots.get(merchantId) || null;
    }

    static getStoreType(): string {
        return store instanceof RedisStore ? 'redis' : 'memory';
    }

    static async getAllReports(): Promise<StoredRiskReport[]> {
        if (store instanceof RedisStore) {
            const items = await store.listGetAll('evidence:reports');
            return items.map(i => JSON.parse(i));
        }
        console.log('DEBUG_GET_ALL_MEMORY:', { count: this.reports.length });
        return [...this.reports];
    }

    static async getAllSnapshots(): Promise<MerchantSnapshot[]> {
        if (store instanceof RedisStore) {
            const items = await store.hashGetAll('evidence:snapshots');
            return Object.values(items).map(i => JSON.parse(i));
        }
        return [...this.snapshots.values()];
    }
}

const store: RiskStore = (REDIS_URL && REDIS_TOKEN)
    ? new RedisStore(REDIS_URL, REDIS_TOKEN)
    : new MemoryStore();

// ─────────────────────────────────────────────────────────────────────────────
// Logic Engines
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// Logic Engines
// ─────────────────────────────────────────────────────────────────────────────

export const CACHE_TTL = {
    URL_CRAWL: 600,
    POLICY_PAGE: 3600,
    DNS_SAFE: 21600,
    NEGATIVE: 120,
};

interface BucketState {
    tokens: number;
    lastRefill: number;
}

export class RateLimiter {
    private static async consume(key: string, config: QuotaConfig): Promise<{ allowed: boolean; headers: Record<string, string> }> {
        const now = Date.now();
        const stateStr = await store.get(key);
        let state: BucketState = stateStr ? JSON.parse(stateStr) : { tokens: config.capacity, lastRefill: now };

        const elapsedSeconds = (now - state.lastRefill) / 1000;
        const refillTokens = elapsedSeconds * config.refillRate;

        state.tokens = Math.min(config.capacity, state.tokens + refillTokens);
        state.lastRefill = now;

        const allowed = state.tokens >= 1;
        let reset = 0;

        if (allowed) {
            state.tokens -= 1;
            if (state.tokens < 1) {
                reset = Math.ceil((1 - state.tokens) / config.refillRate);
            }
        } else {
            reset = Math.ceil((1 - state.tokens) / config.refillRate);
        }

        const remaining = Math.floor(state.tokens);
        await store.set(key, JSON.stringify(state), config.window);

        return {
            allowed,
            headers: {
                'x-rate-limit-limit': String(config.capacity),
                'x-rate-limit-remaining': String(remaining),
                'x-rate-limit-reset': String(reset)
            }
        };
    }

    /**
     * Checks rate limit for a given account with numeric config.
     * 
     * BOUNDARY CONTRACT:
     * - accountId: string (identity, NOT tier-dependent)
     * - config: numeric config (capacity, refillRate, window)
     * 
     * NO TIER LOGIC. Tier resolution happens upstream.
     * 
     * @param accountId - Account identifier (stable, not tier-dependent)
     * @param config - Numeric rate limit configuration
     * @returns allowed status and rate limit headers
     */
    static async check(
        accountId: string,
        config: QuotaConfig
    ): Promise<{ allowed: boolean; headers: Record<string, string> }> {
        // Key by accountId ONLY (not tier, not API key)
        const key = `rl:account:${accountId}`;

        return await this.consume(key, config);
    }
}

export class RiskCache {
    static async get(key: string) { return await store.get(key); }
    static async set(key: string, value: any, ttl: number) { await store.set(key, JSON.stringify(value), ttl); }

    static normalizeUrl(urlStr: string): string {
        try {
            const u = new URL(urlStr);
            return u.protocol + '//' + u.hostname.toLowerCase() + u.pathname + u.search;
        } catch { return urlStr; }
    }
}

const flightMap = new Map<string, Promise<any>>();

export class ConcurrencyManager {
    static async dedupe(key: string, fn: () => Promise<any>): Promise<{ result: any; deduped: boolean }> {
        if (flightMap.has(key)) return { result: await flightMap.get(key), deduped: true };

        const promise = fn().catch(err => {
            flightMap.delete(key);
            throw err;
        }).then(res => {
            flightMap.delete(key);
            return res;
        });

        flightMap.set(key, promise);
        return { result: await promise, deduped: false };
    }
}
