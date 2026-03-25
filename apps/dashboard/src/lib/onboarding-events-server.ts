/**
 * Server-side Onboarding Event Logger
 *
 * Writes to stdout + persists to durable event store.
 * Only imported by server components / API routes — never by client components.
 */

import { persistEvent } from './event-store';
import type { OnboardingEvent } from './onboarding-events';

export type { OnboardingEvent };

interface EventPayload {
    event: OnboardingEvent;
    userId?: string;
    workspaceId?: string;
    metadata?: Record<string, unknown>;
    timestamp: string;
}

/**
 * Log a server-side onboarding event.
 * Writes to stdout AND persists to event store.
 */
export function logOnboardingEvent(
    event: OnboardingEvent,
    opts?: {
        userId?: string;
        workspaceId?: string;
        metadata?: Record<string, unknown>;
    }
) {
    const payload: EventPayload = {
        event,
        userId: opts?.userId,
        workspaceId: opts?.workspaceId,
        metadata: opts?.metadata,
        timestamp: new Date().toISOString(),
    };

    console.log(`[ONBOARDING_EVENT] ${JSON.stringify(payload)}`);

    // Persist durably — fire-and-forget, never blocks
    persistEvent({
        eventName: event,
        userId: opts?.userId,
        workspaceId: opts?.workspaceId,
        metadata: opts?.metadata,
    }).catch(() => { /* silent */ });
}

/**
 * Log a stage transition (server-side convenience wrapper).
 * Emits `onboarding_stage_changed` with `from` and `to` in metadata.
 */
export function logStageTransition(
    from: string,
    to: string,
    opts?: {
        userId?: string;
        workspaceId?: string;
    }
) {
    logOnboardingEvent('onboarding_stage_changed', {
        userId: opts?.userId,
        workspaceId: opts?.workspaceId,
        metadata: { from, to },
    });
}
