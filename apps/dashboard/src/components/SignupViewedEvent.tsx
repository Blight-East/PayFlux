'use client';

import { useEffect } from 'react';
import { logOnboardingEventClient } from '@/lib/onboarding-events';

/**
 * Fires signup_viewed once on mount.
 * Drop into the sign-up page to track sign-up page views.
 */
export default function SignupViewedEvent() {
    useEffect(() => {
        logOnboardingEventClient('signup_viewed', { source_page: 'sign_up' });
    }, []);

    return null;
}
