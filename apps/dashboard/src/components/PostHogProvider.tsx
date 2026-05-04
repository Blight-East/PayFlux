'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import posthog from 'posthog-js';

let initialized = false;

function initOnce() {
    if (initialized) return;
    if (typeof window === 'undefined') return;

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

    if (!key) return;

    posthog.init(key, {
        api_host: host,
        persistence: 'memory',
        capture_pageview: true,
        capture_pageleave: false,
        respect_dnt: true,
        ip: false,
        autocapture: true,
        property_blacklist: ['$ip', '$ip_address'],
    });

    initialized = true;
}

/**
 * PostHog client-side provider.
 *
 * Initializes posthog-js once and binds Clerk identity to the PostHog
 * distinct_id when the user signs in. On sign-out, resets so the next
 * anonymous session is a fresh distinct_id.
 *
 * No-op when NEXT_PUBLIC_POSTHOG_KEY is unset — safe to ship before
 * the project key is provisioned.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
    const { isSignedIn, user } = useUser();

    useEffect(() => {
        initOnce();
    }, []);

    useEffect(() => {
        if (!initialized) return;
        if (isSignedIn && user) {
            posthog.identify(user.id, {
                email: user.primaryEmailAddress?.emailAddress,
                name: user.fullName ?? undefined,
            });
        } else if (initialized && !isSignedIn) {
            posthog.reset();
        }
        // Only the listed primitive fields drive re-identify. Including the full
        // `user` object would re-run on every Clerk render and re-send identify.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSignedIn, user?.id, user?.primaryEmailAddress?.emailAddress, user?.fullName]);

    return <>{children}</>;
}
