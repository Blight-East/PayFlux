/**
 * Onboarding Event Logger
 *
 * Client-safe module — no Node.js imports.
 * Server helpers that need durable persistence live in onboarding-events-server.ts.
 *
 * Client components import from this file.
 * Server components / API routes import from onboarding-events-server.ts.
 */

import { getJourneyId } from './journey';

export type OnboardingEvent =
    // Funnel view events
    | 'start_viewed'
    | 'scan_viewed'
    | 'scan_submitted'
    | 'scan_results_viewed'
    | 'scan_results_continue_clicked'
    | 'signup_viewed'
    | 'signup_completed'
    | 'connect_viewed'
    | 'connect_clicked'
    | 'stripe_connect_started'
    | 'stripe_connect_completed'
    | 'upgrade_viewed'
    | 'upgrade_checkout_clicked'
    | 'checkout_started'
    | 'checkout_completed'
    | 'activate_viewed'
    | 'activate_arming_viewed'
    | 'arming_completed'
    // Activation lifecycle (fine-grained, server-side, post-purchase)
    | 'user_paid'
    | 'stripe_connected'
    | 'activation_state_changed'
    | 'activation_started'
    | 'activation_completed'
    | 'activation_failed'
    | 'activation_stalled'
    | 'activation_overridden'
    // Dashboard / internal events
    | 'dashboard_preview_viewed'
    | 'onboarding_stage_changed'
    // Billing lifecycle (server-only)
    | 'invoice_payment_failed'
    | 'invoice_payment_succeeded'
    | 'subscription_status_changed'
    | 'subscription_deleted'
    // Legacy aliases (deprecated — kept for backward compat with stored data)
    | 'sign_up_completed'
    | 'scan_started'
    | 'scan_completed'
    | 'results_viewed'
    | 'connect_cta_clicked'
    | 'connect_page_viewed'
    | 'connect_completed'
    | 'connect_skipped'
    | 'upgrade_cta_clicked'
    | 'upgrade_completed'
    | 'scan_example_viewed';

/**
 * Client-side event logger.
 * POSTs to /api/onboarding/event for server-side persistence.
 * Auto-attaches journey_id for anonymous→auth stitching.
 * Fire-and-forget — never blocks UI.
 */
export function logOnboardingEventClient(
    event: OnboardingEvent,
    metadata?: Record<string, unknown>
) {
    const journeyId = getJourneyId();
    const enriched = { ...metadata, journey_id: journeyId };

    // Log locally for devtools
    console.log(`[ONBOARDING_EVENT] ${event}`, enriched);

    // POST to backend for durable persistence
    try {
        fetch('/api/onboarding/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event, metadata: enriched, timestamp: new Date().toISOString() }),
        }).catch(() => { /* silent */ });
    } catch {
        // Never block UI for logging
    }
}
