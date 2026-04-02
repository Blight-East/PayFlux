import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { resolveActivationStatus } from '@/lib/activation-state';
import { isInternalOperatorUser } from '@/lib/resolve-workspace';
import ArmingProgress from './ArmingProgress';

export const runtime = 'nodejs';

/**
 * /activate/arming — Server-side gate for the arming progress page.
 *
 * Guards:
 *   - unauthenticated        → /sign-in
 *   - not paid (free/no ws)  → /start
 *   - paid_unconnected       → /activate
 *   - live_monitored         → /dashboard
 *   - connected_generating   → render ArmingProgress (client component)
 *
 * This ensures the progress UI never renders for users who shouldn't see it.
 * The client component handles real-time polling once the server has confirmed
 * the user is in the correct state.
 */
export default async function ArmingPage() {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in?redirect_url=%2Factivate%2Farming');

    const [status, allowInternalVerification] = await Promise.all([
        resolveActivationStatus(userId),
        isInternalOperatorUser(userId),
    ]);

    // Not paid → this flow is post-purchase only
    if (!status) redirect('/start');

    // Route based on activation state
    switch (status.state) {
        case 'paid_unconnected':
            redirect('/activate');
        case 'live_monitored':
            redirect('/dashboard');
        case 'awaiting_activity':
            return <ArmingProgress
                initialFailure={{
                    code: status.meta.failureCode,
                    detail: status.meta.failureDetail,
                }}
                allowInternalVerification={allowInternalVerification}
            />;
        case 'activation_failed':
            return <ArmingProgress
                initialFailure={{
                    code: status.meta.failureCode,
                    detail: status.meta.failureDetail,
                }}
                allowInternalVerification={allowInternalVerification}
            />;
        case 'connected_generating':
            return <ArmingProgress allowInternalVerification={allowInternalVerification} />;
        default:
            redirect('/start');
    }
}
