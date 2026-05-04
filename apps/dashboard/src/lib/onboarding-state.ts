/**
 * Onboarding State Model
 *
 * DB-backed source of truth for where a user is in the onboarding funnel.
 *
 * Stages (ordered):
 *   "none"                 — signed up, no workspace-attached scan context
 *   "scanned"              — scan context attached, Stripe not connected
 *   "connected_free"       — Stripe connected, free tier, activation not yet complete
 *   "live_monitored_free"  — Stripe connected, free tier, baseline + projection ready (capped to 30d)
 *   "upgraded"             — paid tier (kept for routing compatibility)
 */

import { getStripeProcessorConnectionByWorkspaceId } from './db/processor-connections';
import { findWorkspaceById } from './db/workspaces';
import { getMonitoredEntityByWorkspaceId } from './db/monitored-entities';
import { resolveWorkspace, type WorkspaceContext } from './resolve-workspace';

export type OnboardingStage =
    | 'none'
    | 'scanned'
    | 'connected_free'
    | 'live_monitored_free'
    | 'upgraded';

export interface OnboardingState {
    stage: OnboardingStage;
    workspace: WorkspaceContext | null;
    hasStripeConnection: boolean;
    hasScanCompleted: boolean;
}

/**
 * Resolve the current onboarding stage for a user.
 *
 * Decision tree:
 *   1. tier is pro or enterprise → "upgraded"
 *   2. processor connection exists AND monitored entity has baseline + projection → "live_monitored_free"
 *   3. processor connection exists → "connected_free"
 *   4. workspace-attached scan context exists → "scanned"
 *   5. otherwise → "none"
 */
export async function resolveOnboardingState(userId: string): Promise<OnboardingState> {
    const workspace = await resolveWorkspace(userId, { allowAdminBypass: false });

    // No workspace yet — user just signed up, no org
    if (!workspace) {
        return {
            stage: 'none',
            workspace: null,
            hasStripeConnection: false,
            hasScanCompleted: false,
        };
    }

    const [workspaceRecord, processorConnection] = await Promise.all([
        findWorkspaceById(workspace.workspaceRecordId),
        getStripeProcessorConnectionByWorkspaceId(workspace.workspaceRecordId),
    ]);

    const hasStripeConnection = processorConnection?.status === 'connected';
    const latestScanSummary = workspaceRecord?.latest_scan_summary ?? {};
    const hasScanCompleted = Boolean(
        workspaceRecord?.scan_attached_at ||
        (typeof latestScanSummary.url === 'string' && latestScanSummary.url.length > 0)
    );

    if (workspace.tier === 'pro' || workspace.tier === 'enterprise') {
        return {
            stage: 'upgraded',
            workspace,
            hasStripeConnection,
            hasScanCompleted,
        };
    }

    let stage: OnboardingStage = 'none';
    if (hasStripeConnection) {
        const monitoredEntity = await getMonitoredEntityByWorkspaceId(workspace.workspaceRecordId);
        const isLive = Boolean(
            monitoredEntity?.current_baseline_snapshot_id &&
            monitoredEntity?.current_projection_id &&
            monitoredEntity?.primary_host
        );
        stage = isLive ? 'live_monitored_free' : 'connected_free';
    } else if (hasScanCompleted) {
        stage = 'scanned';
    }

    return { stage, workspace, hasStripeConnection, hasScanCompleted };
}
