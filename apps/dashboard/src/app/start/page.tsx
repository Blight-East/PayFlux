import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { resolveWorkspace } from '@/lib/resolve-workspace';

export const runtime = 'nodejs';

/**
 * /start — Smart entry point for landing page CTAs.
 *
 * Routes the user based on auth + billing state:
 *   - Not logged in       → /sign-up
 *   - No workspace         → /onboarding
 *   - Free tier            → /checkout
 *   - Pro / Enterprise     → /dashboard
 */
export default async function StartPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-up');
    }

    const workspace = await resolveWorkspace(userId);

    if (!workspace) {
        redirect('/onboarding');
    }

    if (workspace.tier === 'free') {
        redirect('/checkout');
    }

    redirect('/dashboard');
}
