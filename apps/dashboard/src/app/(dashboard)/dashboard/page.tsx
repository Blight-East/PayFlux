import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { resolveWorkspace } from '@/lib/resolve-workspace';
import { resolveOnboardingState } from '@/lib/onboarding-state';
import { resolveActivationStatus } from '@/lib/activation-state';
import { RiskIntelligence } from '@/lib/risk-infra';
import ProjectionRoot from '@/components/ProjectionRoot';
import DashboardFreePreview from '@/components/DashboardFreePreview';
import ActivationBanner from '@/components/ActivationBanner';

export default async function DashboardPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-in');
    }

    const workspace = await resolveWorkspace(userId, { allowAdminBypass: false });

    if (!workspace) {
        redirect('/scan');
    }

    // Resolve onboarding state for rendering decisions
    const onboarding = await resolveOnboardingState(userId);

    // Free tier → limited preview dashboard
    if (workspace.tier === 'free') {
        let primaryHost: string | null = null;
        try {
            const snapshots = await RiskIntelligence.getAllSnapshots();
            if (snapshots.length > 0) {
                primaryHost = snapshots[snapshots.length - 1].normalizedHost;
            }
        } catch { /* non-fatal */ }

        return (
            <DashboardFreePreview
                host={primaryHost}
                hasStripeConnection={onboarding.hasStripeConnection}
                onboardingStage={onboarding.stage}
            />
        );
    }

    // Paid tier — check activation state for proper UX
    const activation = await resolveActivationStatus(userId);
    const isActivated = activation?.state === 'live_monitored';
    const isWarming = activation?.state === 'connected_generating';

    let primaryHost: string | null = null;
    try {
        const snapshots = await RiskIntelligence.getAllSnapshots();
        if (snapshots.length > 0) {
            primaryHost = snapshots[snapshots.length - 1].normalizedHost;
        }
    } catch { /* non-fatal */ }

    return (
        <div>
            {/* Show activation status banner for freshly activated or still-warming workspaces */}
            <ActivationBanner
                isActivated={isActivated}
                isWarming={isWarming}
                activationMeta={activation?.meta}
            />
            <ProjectionRoot tier={workspace.tier} host={primaryHost} />
        </div>
    );
}
