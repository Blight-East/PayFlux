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

        this.reports.push(report);
        RiskMetrics.inc('risk_history_writes_total');

        // Update Snapshot
        const existing = this.snapshots.get(merchantId);
        const currentTier = payload.riskTier;

        let trend: MerchantSnapshot['trend'] = 'STABLE';
        let tierDeltaLast = 0;

        if (existing) {
            tierDeltaLast = currentTier - existing.currentRiskTier;

            // Trend Logic: 
            // - DEGRADING if last 2 scans show strictly increasing riskTier (current > previous)
            // - IMPROVING if last 2 scans show strictly decreasing riskTier (current < previous)
            // Note: Simplification - we only check the shift from the immediate previous.
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

        this.snapshots.set(merchantId, {
            merchantId,
            normalizedHost,
            scanCount: (existing?.scanCount || 0) + 1,
            lastScanAt: report.createdAt,
            currentRiskTier: currentTier,
            tierDeltaLast,
            trend,
            policySurface,
        });
    }

    static async getHistory(url: string): Promise<{ merchantId: string; normalizedHost: string; scans: StoredRiskReport[] }> {
        let hostname = 'unknown';
        try { hostname = new URL(url).hostname.toLowerCase(); } catch { }
        const normalizedHost = hostname;
        const merchantId = Buffer.from(normalizedHost).toString('base64').replace(/=/g, '').slice(-12);
        const scans = this.reports.filter(r => r.merchantId === merchantId);
        RiskMetrics.inc('risk_history_reads_total');
        return { merchantId, normalizedHost, scans };
    }

    static async getTrend(url: string): Promise<MerchantSnapshot | null> {
        let hostname = 'unknown';
        try { hostname = new URL(url).hostname.toLowerCase(); } catch { }
        const normalizedHost = hostname;
        const merchantId = Buffer.from(normalizedHost).toString('base64').replace(/=/g, '').slice(-12);
        RiskMetrics.inc('risk_trend_reads_total');
        return this.snapshots.get(merchantId) || null;
    }
}

const store: RiskStore = new MemoryStore();

// ─────────────────────────────────────────────────────────────────────────────
// Logic Engines
// ─────────────────────────────────────────────────────────────────────────────

export type Tier = 'FREE' | 'PRO' | 'ENTERPRISE' | 'ANONYMOUS';

export interface QuotaConfig {
    capacity: number;
    refillRate: number; // tokens per second
    window: number; // TTL in storage
}

export const TIER_CONFIG: Record<Tier, QuotaConfig> = {
    ANONYMOUS: {
        capacity: 3,
        refillRate: 1 / 60, // 1 req / min
        window: 600,
    },
    FREE: {
        capacity: 10,
        refillRate: 5 / 60, // 5 req / min
        window: 600,
    },
    PRO: {
        capacity: 100,
        refillRate: 1, // 1 req / sec
        window: 3600,
    },
    ENTERPRISE: {
        capacity: 1000,
        refillRate: 10, // 10 req / sec
        window: 3600,
    }
};

export class QuotaManager {
    /**
     * Resolves an API key to a Tier.
     * In prod, this should use a fast cache (Redis) or local bloom filter.
     */
    static async resolve(key?: string | null): Promise<{ tier: Tier; keyId: string }> {
        if (!key) return { tier: 'ANONYMOUS', keyId: 'anon' };

        // Mocking resolution logic:
        // pf_live_... -> PRO
        // pf_test_... -> FREE
        if (key.startsWith('pf_live_')) return { tier: 'PRO', keyId: key.slice(0, 12) };
        if (key.startsWith('pf_test_')) return { tier: 'FREE', keyId: key.slice(0, 12) };

        return { tier: 'FREE', keyId: key.slice(0, 12) };
    }
}

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
     * Checks rate limit for a given identifier (IP or KeyId) and tier.
     */
    static async check(identifier: string, tier: Tier = 'ANONYMOUS') {
        const config = TIER_CONFIG[tier];
        const key = `rl:${tier.toLowerCase()}:${identifier}`;

        const { allowed, headers } = await this.consume(key, config);

        if (!allowed) {
            return { allowed: false, headers, context: { limitType: 'TIER', identifier, tier } };
        }

        return { allowed: true, headers };
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
