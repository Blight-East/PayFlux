import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getMonitoredEntityByWorkspaceId } from '@/lib/db/monitored-entities';
import { getStripeProcessorConnectionByWorkspaceId } from '@/lib/db/processor-connections';
import { getLatestActivationRunByWorkspaceId } from '@/lib/db/activation-runs';
import { resolveWorkspace } from '@/lib/resolve-workspace';

export const runtime = 'nodejs';

/**
 * Tier-agnostic activation-status read for the free-tier "warming" UI.
 *
 * Mirrors the conditions resolveActivationStatus checks for paid tiers, but
 * doesn't gate on tier and only returns enough info for the progressive-reveal
 * component to advance its stage:
 *
 *   - "connecting"  → processor not yet linked
 *   - "baseline"    → connected, no baseline snapshot yet
 *   - "projecting"  → baseline ready, projection still pending
 *   - "ready"       → baseline + projection populated; dashboard can render
 *
 * Used by FreeArmingProgress on the free-tier dashboard. Cheap and idempotent.
 */
export async function GET() {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await resolveWorkspace(userId, { allowAdminBypass: false });
    if (!workspace) {
        return NextResponse.json({ stage: 'connecting' });
    }

    const [processorConnection, monitoredEntity, latestRun] = await Promise.all([
        getStripeProcessorConnectionByWorkspaceId(workspace.workspaceRecordId),
        getMonitoredEntityByWorkspaceId(workspace.workspaceRecordId),
        getLatestActivationRunByWorkspaceId(workspace.workspaceRecordId),
    ]);

    if (processorConnection?.status !== 'connected') {
        return NextResponse.json({ stage: 'connecting' });
    }

    const baselineReady = Boolean(monitoredEntity?.current_baseline_snapshot_id);
    const projectionReady = Boolean(monitoredEntity?.current_projection_id);
    const primaryHostReady = Boolean(monitoredEntity?.primary_host);

    if (baselineReady && projectionReady && primaryHostReady) {
        return NextResponse.json({ stage: 'ready' });
    }
    if (baselineReady) {
        return NextResponse.json({ stage: 'projecting' });
    }
    return NextResponse.json({
        stage: 'baseline',
        startedAt: latestRun?.created_at ?? null,
        failed: latestRun?.status === 'failed',
        failureCode: latestRun?.status === 'failed' ? latestRun.failure_code ?? null : null,
    });
}
