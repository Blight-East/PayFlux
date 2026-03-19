import { auth } from '@clerk/nextjs/server';
export const runtime = 'nodejs';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
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

    // ── Activation-aware routing for paid users ────────────────────────────
    // If user is paid but hasn't completed activation, route them into the
    // activation flow instead of showing an empty dashboard.
    if (onboarding.workspace.tier === 'pro' || onboarding.workspace.tier === 'enterprise') {
        const activation = await resolveActivationStatus(userId);
        if (activation) {
            if (activation.state === 'paid_unconnected') {
                redirect('/activate');
            }
            if (activation.state === 'connected_generating') {
                redirect('/activate/arming');
            }
            // live_monitored → continue to dashboard (fall through)
        }
    }

    // IMPORTANT: Free-tier users see a limited dashboard preview.
    // Do NOT redirect free tier to /checkout — value before payment.
    // The page-level component (DashboardPage) handles free vs paid rendering.

    return (
        <div className="flex min-h-screen bg-slate-950 text-white">
            <aside className="w-64 border-r border-slate-800">
                <Sidebar workspace={onboarding.workspace} />
            </aside>
            <main className="flex-1 p-8">
                {children}
            </main>
        </div>
    );
}
