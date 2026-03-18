import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { resolveOnboardingState } from '@/lib/onboarding-state';
import { logOnboardingEvent } from '@/lib/onboarding-events';

export const runtime = 'nodejs';

/**
 * /start — Canonical entry router.
 *
 * Routes users based on onboarding state:
 *   - Not logged in        → /sign-up
 *   - stage "none"          → /scan
 *   - stage "scanned"       → /connect (encourage, not require)
 *   - stage "connected_free"→ /dashboard (free preview)
 *   - stage "upgraded"      → /dashboard (full)
 */
export default async function StartPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-up');
    }

    const state = await resolveOnboardingState(userId);

    // Only emit sign_up_completed for genuinely new users (stage "none").
    // Returning users hit /start on every visit — don't pollute telemetry.
    if (state.stage === 'none') {
        logOnboardingEvent('sign_up_completed', { userId, metadata: { stage: state.stage } });
    }

    switch (state.stage) {
        case 'none':
            redirect('/scan');
        case 'scanned':
            // Encourage connection but don't force — they can skip to dashboard
            redirect('/connect');
        case 'connected_free':
            redirect('/dashboard');
        case 'upgraded':
            redirect('/dashboard');
        default:
            redirect('/scan');
    }
}
