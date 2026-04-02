import { auth } from '@clerk/nextjs/server';
export const runtime = 'nodejs';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import PastDueBanner from '@/components/PastDueBanner';
import { resolveOnboardingState } from '@/lib/onboarding-state';
import { resolveActivationStatus } from '@/lib/activation-state';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-in');
    }

    // Use resolveOnboardingState for consistency with /start routing semantics.
    // This ensures the layout and the entry router agree on stage → route mapping.
    const onboarding = await resolveOnboardingState(userId);

    // No workspace → route to scan (same as /start for stage "none")
    if (!onboarding.workspace) {
        redirect('/scan');
    }

    // Detect past_due for grace period banner
    const isPastDue = onboarding.workspace.paymentStatus === 'past_due';

    // DB-backed activation-aware routing for paid users.
    // Paid workspaces must not reach the dashboard until scoped monitored readiness exists.
    // Past-due users with completed activation get through (grace period).
    if (onboarding.workspace.tier === 'pro' || onboarding.workspace.tier === 'enterprise') {
        const activation = await resolveActivationStatus(userId);
        if (!activation) {
            redirect('/activate');
        }
        if (activation.state === 'paid_unconnected') {
            redirect('/activate');
        }
        if (activation.state === 'connected_generating' || activation.state === 'activation_failed') {
            redirect('/activate/arming');
        }
        // live_monitored -> continue to dashboard (fall through)
    }

    // IMPORTANT: Free-tier users see a limited dashboard preview.
    // Do NOT redirect free tier to /checkout — value before payment.
    // The page-level component (DashboardPage) handles free vs paid rendering.

    return (
        <div className="flex flex-col min-h-screen bg-[#0F172A]">
            {isPastDue && <PastDueBanner />}
            <div className="flex flex-1">
                <aside className="w-64 flex-shrink-0 border-r border-slate-800">
                    <Sidebar workspace={onboarding.workspace} />
                </aside>
                <main className="dashboard-canvas min-h-screen flex-1 overflow-y-auto bg-[#F8FAFC]">
                    {children}
                </main>
            </div>
        </div>
    );
}

