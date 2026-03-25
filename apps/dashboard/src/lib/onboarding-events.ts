/**
 * Onboarding Event Logger
 *
 * Client-safe module — no Node.js imports.
 * Server helpers that need durable persistence live in onboarding-events-server.ts.
 *
 * Client components import from this file.
 * Server components / API routes import from onboarding-events-server.ts.
 */

export type OnboardingEvent =
    | 'sign_up_completed'
    | 'scan_started'
    | 'scan_completed'
    | 'results_viewed'
    | 'connect_cta_clicked'
    | 'connect_page_viewed'
    | 'connect_completed'
    | 'connect_skipped'
    | 'dashboard_preview_viewed'
    | 'upgrade_cta_clicked'
    | 'checkout_started'
    | 'upgrade_completed'
    | 'onboarding_stage_changed'
    | 'scan_example_viewed'
    | 'invoice_payment_failed'
    | 'invoice_payment_succeeded'
    | 'subscription_status_changed'
    | 'subscription_deleted';

/**
 * Client-side event logger.
 * POSTs to /api/onboarding/event for server-side persistence.
 * Fire-and-forget — never blocks UI.
 */
export function logOnboardingEventClient(
    event: OnboardingEvent,
    metadata?: Record<string, unknown>
) {
    // Log locally for devtools
    console.log(`[ONBOARDING_EVENT] ${event}`, metadata ?? '');

    // POST to backend for durable persistence
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
