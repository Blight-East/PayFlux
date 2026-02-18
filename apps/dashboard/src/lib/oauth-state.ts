import crypto from 'crypto';

interface OAuthState {
    orgId: string;
    userId: string;
    nonce: string;
    expiresAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Layer (Redis with in-memory fallback)
// ─────────────────────────────────────────────────────────────────────────────

const REDIS_URL = process.env.RISK_REDIS_URL;
const REDIS_TOKEN = process.env.RISK_REDIS_TOKEN;
const OAUTH_TTL_SECONDS = 600; // 10 minutes
const REDIS_KEY_PREFIX = 'oauth_state:';

// Fallback in-memory store (used when Redis is unavailable)
const memoryStore = new Map<string, OAuthState>();

async function redisSet(token: string, state: OAuthState): Promise<boolean> {
    if (!REDIS_URL || !REDIS_TOKEN) return false;

    try {
        const key = `${REDIS_KEY_PREFIX}${token}`;
        const value = encodeURIComponent(JSON.stringify(state));
        const res = await fetch(`${REDIS_URL}/set/${key}/${value}/EX/${OAUTH_TTL_SECONDS}`, {
            headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
        });
        return res.ok;
    } catch (e) {
        console.error('[OAUTH_STATE] Redis SET failed:', (e as Error).message);
        return false;
    }
}

async function redisGetAndDelete(token: string): Promise<OAuthState | null> {
    if (!REDIS_URL || !REDIS_TOKEN) return null;

    const key = `${REDIS_KEY_PREFIX}${token}`;

    try {
        // GET
        const getRes = await fetch(`${REDIS_URL}/get/${key}`, {
            headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
        });
        if (!getRes.ok) return null;

        const data = await getRes.json() as { result: string | null };
        if (!data.result) return null;

        // DEL (one-time use: delete immediately after read)
        await fetch(`${REDIS_URL}/del/${key}`, {
            headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
        }).catch((e) => {
            console.error('[OAUTH_STATE] Redis DEL failed:', (e as Error).message);
        });

        return JSON.parse(data.result) as OAuthState;
    } catch (e) {
        console.error('[OAUTH_STATE] Redis GET failed:', (e as Error).message);
        return null;
    }
}

async function setState(token: string, state: OAuthState): Promise<void> {
    const stored = await redisSet(token, state);
    if (!stored) {
        // Fallback to memory
        memoryStore.set(token, state);
    }
}

async function getAndDeleteState(token: string): Promise<OAuthState | null> {
    // Try Redis first
    const fromRedis = await redisGetAndDelete(token);
    if (fromRedis) return fromRedis;

    // Fallback to memory
    const fromMemory = memoryStore.get(token) ?? null;
    if (fromMemory) {
        memoryStore.delete(token);
    }
    return fromMemory;
}

// ─────────────────────────────────────────────────────────────────────────────
// HMAC Signing
// ─────────────────────────────────────────────────────────────────────────────

// Secret for HMAC signing
function getStateSecret(): string {
    const s = process.env.OAUTH_STATE_SECRET;
    if (!s) {
        throw new Error('OAUTH_STATE_SECRET is not defined. State signing cannot proceed.');
    }
    return s;
}

/**
 * Generates a signed state token and stores it in Redis (or memory fallback).
 */
export async function generateStateToken(orgId: string, userId: string): Promise<string> {
    const secret = getStateSecret();
    const nonce = crypto.randomBytes(16).toString('hex');
    const ts = Date.now();
    const expiresAt = ts + 10 * 60 * 1000; // 10 minutes expiry

    const payload = `${orgId}:${userId}:${nonce}:${ts}`;
    const secretBuffer = Buffer.from(secret, 'utf8');
    const signature = crypto.createHmac('sha256', secretBuffer).update(payload).digest('hex');

    // The token includes the payload and signature so we can verify the signature first
    const token = Buffer.from(`${payload}.${signature}`).toString('base64url');

    await setState(token, { orgId, userId, nonce, expiresAt });

    // Periodic cleanup of expired states (memory fallback only)
    cleanupExpiredStates();

    return token;
}

/**
 * Validates a state token, checks signature, expiry, and existence in store.
 * Returns the state object if valid and deletes it from the store (one-time use).
 */
export async function validateAndConsumeState(token: string, userId: string): Promise<OAuthState | null> {
    const decoded = Buffer.from(token, 'base64url').toString();
    const [payload, signature] = decoded.split('.');
    const secret = getStateSecret();

    if (!payload || !signature) return null;

    // 1. Verify Signature
    const secretBuffer = Buffer.from(secret, 'utf8');
    const expectedSignature = crypto.createHmac('sha256', secretBuffer).update(payload).digest('hex');
    if (signature !== expectedSignature) {
        console.error('OAuth state signature mismatch');
        return null;
    }

    // 2. Lookup in store (Redis or memory fallback)
    const state = await getAndDeleteState(token);
    if (!state) {
        console.error('OAuth state not found or already consumed');
        return null;
    }

    // 3. Verify user binding
    if (state.userId !== userId) {
        console.error('OAuth state binding mismatch: user changed');
        // State already deleted by getAndDeleteState — no reuse possible
        return null;
    }

    // 4. Check Expiry
    if (Date.now() > state.expiresAt) {
        console.error('OAuth state expired');
        return null;
    }

    // 5. Consumed (already deleted in step 2)
    return state;
}

function cleanupExpiredStates() {
    const now = Date.now();
    for (const [token, state] of memoryStore.entries()) {
        if (now > state.expiresAt) {
            memoryStore.delete(token);
        }
    }
}
