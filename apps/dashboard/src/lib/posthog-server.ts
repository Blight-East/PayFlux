/**
 * PostHog server-side helper.
 *
 * Singleton wrapper around posthog-node. Returns null when no key is
 * configured so the rest of the codebase can call captureServer()
 * unconditionally without env-checking at every call site.
 *
 * Used from API routes, webhooks, and the server-side onboarding event
 * logger to mirror funnel events into PostHog. Client-side events go
 * through posthog-js directly via the PostHogProvider.
 */

import { PostHog } from 'posthog-node';
import { POSTHOG_HOST, POSTHOG_KEY, warnOnPostHogEnvMismatch } from './posthog-config';

let client: PostHog | null = null;
let initialized = false;

function getClient(): PostHog | null {
    if (initialized) return client;
    initialized = true;

    warnOnPostHogEnvMismatch('server');

    client = new PostHog(POSTHOG_KEY, {
        host: POSTHOG_HOST,
        flushAt: 1,
        flushInterval: 0,
    });

    return client;
}

export async function captureServer(args: {
    event: string;
    distinctId: string;
    properties?: Record<string, unknown>;
}): Promise<void> {
    const ph = getClient();
    if (!ph) return;

    try {
        console.log('[POSTHOG_FUNNEL_DEBUG] capture_server', {
            event: args.event,
            distinct_id: args.distinctId,
            host: POSTHOG_HOST,
        });
        ph.capture({
            event: args.event,
            distinctId: args.distinctId,
            properties: args.properties,
        });
        await ph.flush();
    } catch (err) {
        // Never block business logic on analytics
        console.warn('[POSTHOG_FUNNEL_DEBUG] capture_server_failed', {
            event: args.event,
            distinct_id: args.distinctId,
            message: err instanceof Error ? err.message : String(err),
        });
    }
}
