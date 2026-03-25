/**
 * Server-side Onboarding Event Logger
 *
 * Writes to stdout + persists to durable event store.
 * Only imported by server components / API routes — never by client components.
 *
 * Automatically attaches journey_id from the pf_journey cookie when available,
 * so server-rendered events can be stitched with client-side anonymous events.
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
 * Read journey_id from the pf_journey cookie via Next.js cookies() API.
 * Returns undefined if cookie is absent or cookies() is unavailable
 * (e.g. during Stripe webhook processing where there is no request context).
 */
function getServerJourneyId(): string | undefined {
    try {
        // Dynamic import-like access — cookies() is synchronous in Next.js 14+
        // but throws outside a request context (webhooks, cron), so we catch.
        const { cookies } = require('next/headers');
        const cookieStore = cookies();
        return cookieStore.get('pf_journey')?.value ?? undefined;
    } catch {
        // No request context (webhook, cron job, etc.) — journey_id unavailable
        return undefined;
    }
}

/**
 * Log a server-side onboarding event.
 * Writes to stdout AND persists to event store.
 * Auto-attaches journey_id from pf_journey cookie when not already in metadata.
 */
export function logOnboardingEvent(
    event: OnboardingEvent,
    opts?: {
        userId?: string;
        workspaceId?: string;
        metadata?: Record<string, unknown>;
    }
) {
    const metadata = { ...opts?.metadata };

    // Auto-attach journey_id from cookie if not already present
    if (!metadata.journey_id) {
        const journeyId = getServerJourneyId();
        if (journeyId) {
            metadata.journey_id = journeyId;
        }
    }

    const payload: EventPayload = {
        event,
        userId: opts?.userId,
        workspaceId: opts?.workspaceId,
        metadata,
        timestamp: new Date().toISOString(),
    };

    console.log(`[ONBOARDING_EVENT] ${JSON.stringify(payload)}`);

    // Persist durably — fire-and-forget, never blocks
    persistEvent({
        eventName: event,
        userId: opts?.userId,
        workspaceId: opts?.workspaceId,
        metadata,
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
