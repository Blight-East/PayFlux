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

let client: PostHog | null = null;
let initialized = false;

function getClient(): PostHog | null {
    if (initialized) return client;
    initialized = true;

    const key = process.env.POSTHOG_PROJECT_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

    if (!key) return null;

    client = new PostHog(key, {
        host,
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
        ph.capture({
            event: args.event,
            distinctId: args.distinctId,
            properties: args.properties,
        });
        await ph.flush();
    } catch {
        // Never block business logic on analytics
    }
}
