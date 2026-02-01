/**
 * Risk Infrastructure Helper
 * 
 * Implements:
 * 1. Storage Interface (Memory/Redis)
 * 2. Token Bucket Rate Limiter
 * 3. Risk Caching (URL, Policy, DNS, Negative)
 * 4. Concurrency Deduplication
 */

interface RiskStore {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds: number): Promise<void>;
}

const REDIS_URL = process.env.RISK_REDIS_URL;

// ─────────────────────────────────────────────────────────────────────────────
// Storage Implementations
// ─────────────────────────────────────────────────────────────────────────────

// In-Memory Store (Map) - Default / Dev
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
        // Cleanup periodically
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
// Logic Engines
// ─────────────────────────────────────────────────────────────────────────────

const store: RiskStore = new MemoryStore(); // Default to Memory

export const CACHE_TTL = {
    URL_CRAWL: 600,  // 10 min
    POLICY_PAGE: 3600, // 60 min
    DNS_SAFE: 21600, // 6 hours
    NEGATIVE: 120,   // 2 min (errors)
};

interface BucketState {
    tokens: number;
    lastRefill: number; // Unix timestamp in ms
}

// Token Bucket Config: 
// IP: 10 requests per 10 minutes (0.01666/sec), Cap 3.
const LIMIT_CONFIG = {
    IP: {
        capacity: 3,
        refillRate: 10 / 600, // ~0.0166 tokens/sec (1 token every 60s)
        window: 600,
    },
    HOST: {
        capacity: 5,
        refillRate: 5 / 600,
        window: 600,
    }
};

export class RateLimiter {
    /**
     * Consumes tokens from the bucket.
     * Returns allowed status and standard rate limit headers.
     * x-rate-limit-reset is SECONDS until the next token is available (or 0 if full/allowed).
     */
    private static async consume(key: string, config: typeof LIMIT_CONFIG.IP): Promise<{ allowed: boolean; headers: Record<string, string> }> {
        const now = Date.now();
        const stateStr = await store.get(key);
        let state: BucketState = stateStr ? JSON.parse(stateStr) : { tokens: config.capacity, lastRefill: now };

        // Refill
        const elapsedSeconds = (now - state.lastRefill) / 1000;
        const refillTokens = elapsedSeconds * config.refillRate;

        state.tokens = Math.min(config.capacity, state.tokens + refillTokens);
        state.lastRefill = now;

        const allowed = state.tokens >= 1;

        let reset = 0; // Seconds until next token

        if (allowed) {
            state.tokens -= 1;
            // If we still have tokens, reset is 0 (immediate). 
            // If we dropped below 1 (partially consumed?), technically next token is immediate if tokens > 1.
            // But if we went from 1.5 -> 0.5, we aren't allowed next.
            // Wait, "allowed" check was (tokens >= 1).
            // So if we have 0.5 left, we are NOT allowed next request.
            // Reset time should be time to reach 1.0 from current.
            if (state.tokens < 1) {
                const missing = 1 - state.tokens;
                reset = Math.ceil(missing / config.refillRate);
            }
        } else {
            // Not allowed. Calculate time to reach 1 token.
            const missing = 1 - state.tokens;
            reset = Math.ceil(missing / config.refillRate);
        }

        // Remaining: Floor of current tokens
        const remaining = Math.floor(state.tokens);

        // Save state (TTL = window ensures we don't lose track, but strictly can be capped at time-to-full)
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

    static async check(ip: string, targetHost?: string) {
        // 1. IP Limit
        const { allowed: ipAllowed, headers: ipHeaders } = await this.consume(`rl:ip:${ip}`, LIMIT_CONFIG.IP);

        if (!ipAllowed) {
            return { allowed: false, headers: ipHeaders };
        }

        // 2. IP + Host Limit (Optional)
        if (targetHost) {
            const { allowed: hostAllowed, headers: hostHeaders } = await this.consume(`rl:host:${ip}:${targetHost}`, LIMIT_CONFIG.HOST);
            if (!hostAllowed) {
                return { allowed: false, headers: hostHeaders };
            }
        }

        return { allowed: true, headers: ipHeaders };
    }
}

export class RiskCache {
    static async get(key: string) {
        return await store.get(key);
    }

    static async set(key: string, value: any, ttl: number) {
        await store.set(key, JSON.stringify(value), ttl);
    }

    /**
     * Normalize URL for caching:
     * - Lowercase hostname
     * - Preserve path ordering
     * - Strip fragments
     */
    static normalizeUrl(urlStr: string): string {
        try {
            const u = new URL(urlStr);
            // Protocol + Hostname (lower) + Path + Search
            return u.protocol + '//' + u.hostname.toLowerCase() + u.pathname + u.search;
        } catch {
            return urlStr;
        }
    }
}

// In-Process deduplication
const flightMap = new Map<string, Promise<any>>();

export class ConcurrencyManager {
    static async dedupe(key: string, fn: () => Promise<any>): Promise<{ result: any; deduped: boolean }> {
        if (flightMap.has(key)) {
            return { result: await flightMap.get(key), deduped: true };
        }

        const promise = fn().catch(err => {
            flightMap.delete(key);
            throw err;
        }).then(res => {
            flightMap.delete(key);
            return res;
        });

        flightMap.set(key, promise);

        // Wait for it
        const result = await promise;

        // NOTE: We don't delete immediately here? Promise logic above deletes on settlement.
        // It's already deleted by the .then()/.catch() callbacks.

        return { result, deduped: false };
    }
}
