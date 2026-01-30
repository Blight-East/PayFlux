import crypto from 'node:crypto';

interface OAuthState {
    orgId: string;
    userId: string;
    nonce: string;
    expiresAt: number;
}

// In-memory store for development
// In production, this should be Redis
const stateStore = new Map<string, OAuthState>();

// Secret for HMAC signing
function getStateSecret(): string {
    const s = process.env.OAUTH_STATE_SECRET;
    if (!s) {
        throw new Error('OAUTH_STATE_SECRET is not defined. State signing cannot proceed.');
    }
    return s;
}

/**
 * Generates a signed state token and stores it in the in-memory store.
 */
export function generateStateToken(orgId: string, userId: string): string {
    const secret = getStateSecret();
    const nonce = crypto.randomBytes(16).toString('hex');
    const ts = Date.now();
    const expiresAt = ts + 10 * 60 * 1000; // 10 minutes expiry

    const payload = `${orgId}:${userId}:${nonce}:${ts}`;
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    // The token includes the payload and signature so we can verify the signature first
    const token = Buffer.from(`${payload}.${signature}`).toString('base64url');

    stateStore.set(token, { orgId, userId, nonce, expiresAt });

    // Periodic cleanup of expired states
    cleanupExpiredStates();

    return token;
}

/**
 * Validates a state token, checks signature, expiry, and existence in store.
 * Returns the state object if valid and deletes it from the store (one-time use).
 */
export function validateAndConsumeState(token: string, userId: string): OAuthState | null {
    const decoded = Buffer.from(token, 'base64url').toString();
    const [payload, signature] = decoded.split('.');
    const secret = getStateSecret();

    if (!payload || !signature) return null;

    // 1. Verify Signature
    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (signature !== expectedSignature) {
        console.error('OAuth state signature mismatch');
        return null;
    }

    // 2. Lookup in store
    const state = stateStore.get(token);
    if (!state) {
        console.error('OAuth state not found or already consumed');
        return null;
    }

    // 3. Verify user binding
    if (state.userId !== userId) {
        console.error('OAuth state binding mismatch: user changed');
        stateStore.delete(token); // Security: delete suspicious state
        return null;
    }

    // 4. Check Expiry
    if (Date.now() > state.expiresAt) {
        console.error('OAuth state expired');
        stateStore.delete(token);
        return null;
    }

    // 5. Consume (one-time use)
    stateStore.delete(token);
    return state;
}

function cleanupExpiredStates() {
    const now = Date.now();
    for (const [token, state] of stateStore.entries()) {
        if (now > state.expiresAt) {
            stateStore.delete(token);
        }
    }
}
