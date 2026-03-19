import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { resolveOnboardingState } from '@/lib/onboarding-state';
import { resolveActivationStatus } from '@/lib/activation-state';
import { logOnboardingEvent } from '@/lib/onboarding-events-server';

export const runtime = 'nodejs';

/**
 * /start — Canonical entry router.
 *
 * Routes users based on onboarding state:
 *   - Not logged in        → /sign-up
 *   - stage "none"          → /scan
 *   - stage "scanned"       → /connect (encourage, not require)
 *   - stage "connected_free"→ /dashboard (free preview)
 *   - stage "upgraded"      → /activate (post-purchase activation flow)
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
        case 'upgraded': {
            // Route through activation flow — it handles all sub-states
            const activation = await resolveActivationStatus(userId);
            if (activation?.state === 'live_monitored') {
                redirect('/dashboard');
            }
            redirect('/activate');
        }
        default:
            redirect('/scan');
    }
}
