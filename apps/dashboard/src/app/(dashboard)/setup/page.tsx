import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { resolveWorkspace } from '@/lib/resolve-workspace';
import { resolveActivationStatus } from '@/lib/activation-state';

export const runtime = 'nodejs';

/**
 * /setup — Legacy entry point.
 *
 * Redirects to the correct location based on current workspace state.
 * The /setup/* sub-pages are for self-hosted Go backend configuration
 * and should not be shown to SaaS customers in the normal flow.
 */
export default async function SetupPage() {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const workspace = await resolveWorkspace(userId, { allowAdminBypass: false });
    if (!workspace) redirect('/scan');

    // Paid users go through the activation flow
    if (workspace.tier === 'pro' || workspace.tier === 'enterprise') {
        const activation = await resolveActivationStatus(userId);
        if (!activation || activation.state === 'paid_unconnected') {
            redirect('/activate');
        }
        if (activation.state === 'connected_generating' || activation.state === 'awaiting_activity' || activation.state === 'activation_failed') {
            redirect('/activate/arming');
        }
        redirect('/dashboard');
    }

    // Free users go to the dashboard
    redirect('/dashboard');
}
