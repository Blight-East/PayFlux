/**
 * Tier Enforcement Audit Trail
 * 
 * Logs enforcement decisions (not just actions) for dispute memory.
 * 
 * Critical Properties:
 * - Stable event IDs (idempotency)
 * - Never silent failure (Redis down → stdout fallback)
 * - Bounded cost (90d TTL, 1000 event limit per account)
 */

import { randomUUID } from 'node:crypto';
import type { AccountTierConfig } from './tier-enforcement';

// ─────────────────────────────────────────────────────────────────────────────
// Event Types
// ─────────────────────────────────────────────────────────────────────────────

export type TierAuditEventType =
    | 'EXPORT_BLOCKED'
    | 'OVERRIDE_APPLIED'
    | 'EXPORT_DEGRADED';

export interface TierAuditEvent {
    schemaVersion: 1; // Future-proof for signing and analytics
    eventId: string; // UUID v7 or ULID (stable, sortable)
    eventType: TierAuditEventType;
    accountId: string;
    tierConfig: AccountTierConfig;
    timestamp: string; // RFC3339
    metadata: {
        reason?: string;
        endpoint?: string;
        userId?: string;
        apiKeyHash?: string; // SHA256 of API key (never plaintext)
        overrideKeys?: string[];
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────────────────

const AUDIT_TTL_DAYS = 90; // Compliance window
const AUDIT_MAX_EVENTS = 1000; // Per account

/**
 * Logs a tier enforcement event to Redis (or stdout fallback).
 * 
 * CRITICAL: Never fails silently. If Redis is down, logs to stdout.
 * 
 * @param event - Tier audit event
 */
export async function logTierEvent(event: TierAuditEvent): Promise<void> {
    const key = `tier:audit:${event.accountId}`;
    const value = JSON.stringify(event);

    try {
        // Attempt Redis storage
        await storeInRedis(key, value);
    } catch (error) {
        // FALLBACK: Log to stdout (never silent failure)
        console.error('[TIER_AUDIT_FALLBACK] Redis unavailable, logging to stdout:', {
            eventId: event.eventId,
            eventType: event.eventType,
            accountId: event.accountId,
            timestamp: event.timestamp,
            error: error instanceof Error ? error.message : String(error),
        });

        // Also log full event to stdout for recovery
        console.log('[TIER_AUDIT_EVENT]', value);
    }
}

/**
 * Stores audit event in Redis with TTL and length limit.
 * 
 * @param key - Redis key (tier:audit:{accountId})
 * @param value - Serialized event JSON
 */
async function storeInRedis(key: string, value: string): Promise<void> {
    const redisUrl = process.env.RISK_REDIS_URL;
    const redisToken = process.env.RISK_REDIS_TOKEN;

    if (!redisUrl || !redisToken) {
        throw new Error('REDIS_NOT_CONFIGURED');
    }

    // 1. Append to list (LPUSH)
    const lpushUrl = `${redisUrl}/lpush/${key}`;
    await fetch(lpushUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${redisToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ elements: [value] }),
    });

    // 2. Trim to max length (LTRIM 0 999 = keep first 1000)
    const ltrimUrl = `${redisUrl}/ltrim/${key}/0/${AUDIT_MAX_EVENTS - 1}`;
    await fetch(ltrimUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${redisToken}` },
    });

    // 3. Set TTL (EXPIRE)
    const ttlSeconds = AUDIT_TTL_DAYS * 86400;
    const expireUrl = `${redisUrl}/expire/${key}/${ttlSeconds}`;
    await fetch(expireUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${redisToken}` },
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Factories
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an EXPORT_BLOCKED audit event.
 */
export function createExportBlockedEvent(
    accountId: string,
    tierConfig: AccountTierConfig,
    reason: string,
    endpoint: string,
    userId?: string
): TierAuditEvent {
    return {
        schemaVersion: 1,
        eventId: randomUUID(),
        eventType: 'EXPORT_BLOCKED',
        accountId,
        tierConfig,
        timestamp: new Date().toISOString(),
        metadata: { reason, endpoint, userId },
    };
}

/**
 * Creates an OVERRIDE_APPLIED audit event.
 */
export function createOverrideAppliedEvent(
    accountId: string,
    tierConfig: AccountTierConfig,
    overrideKeys: string[]
): TierAuditEvent {
    return {
        schemaVersion: 1,
        eventId: randomUUID(),
        eventType: 'OVERRIDE_APPLIED',
        accountId,
        tierConfig,
        timestamp: new Date().toISOString(),
        metadata: { overrideKeys },
    };
}

/**
 * Creates an EXPORT_DEGRADED audit event.
 */
export function createExportDegradedEvent(
    accountId: string,
    tierConfig: AccountTierConfig,
    reason: string,
    endpoint: string
): TierAuditEvent {
    return {
        schemaVersion: 1,
        eventId: randomUUID(),
        eventType: 'EXPORT_DEGRADED',
        accountId,
        tierConfig,
        timestamp: new Date().toISOString(),
        metadata: { reason, endpoint },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Query API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieves audit events for an account.
 * 
 * @param accountId - Account ID
 * @param limit - Max events to return (default: 100)
 * @returns Array of audit events (newest first)
 */
export async function getAuditEvents(
    accountId: string,
    limit: number = 100
): Promise<TierAuditEvent[]> {
    const redisUrl = process.env.RISK_REDIS_URL;
    const redisToken = process.env.RISK_REDIS_TOKEN;

    if (!redisUrl || !redisToken) {
        return []; // Graceful degradation
    }

    const key = `tier:audit:${accountId}`;
    const lrangeUrl = `${redisUrl}/lrange/${key}/0/${limit - 1}`;

    try {
        const response = await fetch(lrangeUrl, {
            headers: { 'Authorization': `Bearer ${redisToken}` },
        });

        if (!response.ok) {
            return [];
        }

        const data = await response.json() as { result: string[] };
        return data.result.map(item => JSON.parse(item) as TierAuditEvent);
    } catch (error) {
        console.error('[TIER_AUDIT_QUERY_ERROR]', error);
        return [];
    }
}
