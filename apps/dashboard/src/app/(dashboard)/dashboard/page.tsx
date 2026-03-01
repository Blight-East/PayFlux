import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { resolveWorkspace } from '@/lib/resolve-workspace';
import { RiskIntelligence } from '@/lib/risk-infra';
import ProjectionRoot from '@/components/ProjectionRoot';

export default async function DashboardPage() {
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-in');
    }

    const workspace = await resolveWorkspace(userId);

    if (!workspace) {
        redirect('/onboarding');
    }

    // Resolve the primary merchant host from the most recent scan
    let primaryHost: string | null = null;
    try {
        const snapshots = await RiskIntelligence.getAllSnapshots();
        if (snapshots.length > 0) {
            // Use the most recently scanned merchant
            primaryHost = snapshots[snapshots.length - 1].normalizedHost;
        }
    } catch {
        // Non-fatal — panel will render empty state
    }

    return <ProjectionRoot tier={workspace.tier} host={primaryHost} />;
}
