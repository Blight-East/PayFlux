'use client';

import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import posthog from 'posthog-js';
import { getJourneyId } from '@/lib/journey';
import { POSTHOG_HOST, POSTHOG_KEY, warnOnPostHogEnvMismatch } from '@/lib/posthog-config';

let initialized = false;
let identifiedUserId: string | null = null;

function initOnce() {
    if (initialized) return;
    if (typeof window === 'undefined') return;

    warnOnPostHogEnvMismatch('client');
    const journeyId = getJourneyId();

    posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        persistence: 'memory',
        capture_pageview: true,
        capture_pageleave: false,
        respect_dnt: true,
        ip: false,
        autocapture: true,
        property_blacklist: ['$ip', '$ip_address'],
        bootstrap: journeyId ? { distinctID: journeyId, isIdentifiedID: false } : undefined,
        loaded: (ph) => {
            console.log('[POSTHOG_FUNNEL_DEBUG] init', {
                distinct_id: ph.get_distinct_id(),
                journey_id: journeyId || null,
                host: POSTHOG_HOST,
            });
        },
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
    const { isLoaded, isSignedIn, user } = useUser();

    useEffect(() => {
        initOnce();
    }, []);

    useEffect(() => {
        if (!initialized) return;
        if (!isLoaded) return;
        if (isSignedIn && user && identifiedUserId !== user.id) {
            const previousDistinctId = posthog.get_distinct_id();
            posthog.identify(user.id, {
                email: user.primaryEmailAddress?.emailAddress,
                name: user.fullName ?? undefined,
            });
            identifiedUserId = user.id;
            console.log('[POSTHOG_FUNNEL_DEBUG] identify', {
                previous_distinct_id: previousDistinctId,
                distinct_id: posthog.get_distinct_id(),
                clerk_user_id: user.id,
            });
        } else if (initialized && !isSignedIn && identifiedUserId) {
            posthog.reset();
            identifiedUserId = null;
            console.log('[POSTHOG_FUNNEL_DEBUG] reset', {
                distinct_id: posthog.get_distinct_id(),
            });
        }
        // Only the listed primitive fields drive re-identify. Including the full
        // `user` object would re-run on every Clerk render and re-send identify.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoaded, isSignedIn, user?.id, user?.primaryEmailAddress?.emailAddress, user?.fullName]);

    return <>{children}</>;
}
