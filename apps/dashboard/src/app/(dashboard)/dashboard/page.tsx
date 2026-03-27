import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getMonitoredEntityByWorkspaceId } from '@/lib/db/monitored-entities';
import { findWorkspaceById } from '@/lib/db/workspaces';
import { normalizeHostCandidate } from '@/lib/db/rows';
import { resolveWorkspace } from '@/lib/resolve-workspace';
import { resolveOnboardingState } from '@/lib/onboarding-state';
import { resolveActivationStatus } from '@/lib/activation-state';
import ProjectionRoot from '@/components/ProjectionRoot';
import DashboardFreePreview from '@/components/DashboardFreePreview';
import ActivationBanner from '@/components/ActivationBanner';

function deriveFreePreviewHost(scanSummary: Record<string, unknown>, primaryHostCandidate: string | null): string | null {
    if (primaryHostCandidate) {
        return primaryHostCandidate;
    }

    const summaryUrl = typeof scanSummary.url === 'string' ? scanSummary.url : null;
    return normalizeHostCandidate(summaryUrl);
}

export default async function DashboardPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-in');
    }

    const workspace = await resolveWorkspace(userId, { allowAdminBypass: false });

    if (!workspace) {
        redirect('/scan');
    }

    const workspaceRecord = await findWorkspaceById(workspace.workspaceRecordId);

    // Resolve onboarding state for rendering decisions
    const onboarding = await resolveOnboardingState(userId);

    // Free tier → limited preview dashboard
    if (workspace.tier === 'free') {
        const primaryHost = deriveFreePreviewHost(
            (workspaceRecord?.latest_scan_summary as Record<string, unknown> | undefined) ?? {},
            workspaceRecord?.primary_host_candidate ?? null
        );

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
    const monitoredEntity = await getMonitoredEntityByWorkspaceId(workspace.workspaceRecordId);

    if (!activation || activation.state === 'paid_unconnected') {
        redirect('/activate');
    }

    if (activation.state !== 'live_monitored') {
        redirect('/activate/arming');
    }

    if (!monitoredEntity?.primary_host) {
        redirect('/activate/arming');
    }

    return (
        <div>
            {/* Show activation status banner for freshly activated or still-warming workspaces */}
            <ActivationBanner
                isActivated={isActivated}
                isWarming={isWarming}
                activationMeta={activation?.meta}
            />
            <ProjectionRoot tier={workspace.tier} host={monitoredEntity.primary_host} activationReady />
        </div>
    );
}
