/**
 * Onboarding Event Logger
 *
 * Structured logging for onboarding funnel transitions.
 * No analytics platform dependency — writes to stdout as structured JSON.
 * Can be piped to any collector later.
 */

type OnboardingEvent =
    | 'sign_up_completed'
    | 'scan_started'
    | 'scan_completed'
    | 'connect_started'
    | 'connect_completed'
    | 'connect_skipped'
    | 'dashboard_preview_viewed'
    | 'upgrade_cta_clicked'
    | 'onboarding_stage_changed';

interface EventPayload {
    event: OnboardingEvent;
    userId?: string;
    workspaceId?: string;
    metadata?: Record<string, unknown>;
    timestamp: string;
}

/**
 * Log a server-side onboarding event.
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

/**
 * Client-side event logger.
 * Posts to /api/onboarding/event (fire-and-forget).
 */
export function logOnboardingEventClient(
    event: OnboardingEvent,
    metadata?: Record<string, unknown>
) {
    // Log locally
    console.log(`[ONBOARDING_EVENT] ${event}`, metadata ?? '');

    // Fire-and-forget POST
    try {
        fetch('/api/onboarding/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event, metadata, timestamp: new Date().toISOString() }),
        }).catch(() => { /* silent */ });
    } catch {
        // Never block UI for logging
    }
}
