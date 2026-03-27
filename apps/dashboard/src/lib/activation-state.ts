/**
 * Activation State Model
 *
 * Post-purchase state machine for PayFlux Core.
 * Customer-critical readiness is derived from DB-backed workspace fulfillment state only.
 *
 *   paid_unconnected     → paid workspace, no verified processor connection
 *   connected_generating → connection exists, but scoped monitored readiness is not proven yet
 *   live_monitored       → completed activation run proves baseline + projection readiness
 */

import { getLatestActivationRunByWorkspaceId, getLatestCompletedActivationRunByWorkspaceId } from './db/activation-runs';
import { getBaselineSnapshotById } from './db/baseline-snapshots';
import { getMonitoredEntityByWorkspaceId } from './db/monitored-entities';
import { getStripeProcessorConnectionByWorkspaceId } from './db/processor-connections';
import { getReserveProjectionById } from './db/reserve-projections';
import { resolveWorkspace, type WorkspaceContext } from './resolve-workspace';

export type ActivationState = 'paid_unconnected' | 'connected_generating' | 'live_monitored';

export interface ActivationStatus {
    state: ActivationState;
    workspace: WorkspaceContext;
    /** Individual conditions for the binary "live monitored" check */
    conditions: {
        paidTier: boolean;
        processorConnected: boolean;
        baselineGenerated: boolean;
        projectionExists: boolean;
        alertsArmed: boolean;
    };
    /** Raw metadata for the arming page progress display */
    meta: {
        stripeAccountId?: string;
        baselineGeneratedAt?: string;
        firstProjectionAt?: string;
        alertPolicyArmedAt?: string;
        activationCompletedAt?: string;
    };
}

/**
 * Resolve activation status for a paid user.
 * Returns null if the user is not paid (this flow is post-purchase only).
 */
export async function resolveActivationStatus(userId: string): Promise<ActivationStatus | null> {
    const workspace = await resolveWorkspace(userId, { allowAdminBypass: false });
    if (!workspace) return null;

    // Only applies to paid users
    if (workspace.tier !== 'pro' && workspace.tier !== 'enterprise') {
        return null;
    }

    const [processorConnection, monitoredEntity, latestActivationRun, latestCompletedActivationRun] = await Promise.all([
        getStripeProcessorConnectionByWorkspaceId(workspace.workspaceRecordId),
        getMonitoredEntityByWorkspaceId(workspace.workspaceRecordId),
        getLatestActivationRunByWorkspaceId(workspace.workspaceRecordId),
        getLatestCompletedActivationRunByWorkspaceId(workspace.workspaceRecordId),
    ]);
    const [baselineSnapshot, reserveProjection] = await Promise.all([
        monitoredEntity?.current_baseline_snapshot_id ? getBaselineSnapshotById(monitoredEntity.current_baseline_snapshot_id) : Promise.resolve(null),
        monitoredEntity?.current_projection_id ? getReserveProjectionById(monitoredEntity.current_projection_id) : Promise.resolve(null),
    ]);

    const conditions = {
        paidTier: true,
        processorConnected: processorConnection?.status === 'connected',
        baselineGenerated: latestCompletedActivationRun?.baseline_ready === true && Boolean(baselineSnapshot),
        projectionExists: latestCompletedActivationRun?.first_projection_ready === true && Boolean(reserveProjection),
        alertsArmed: false,
    };

    const meta = {
        stripeAccountId: processorConnection?.stripe_account_id,
        baselineGeneratedAt: baselineSnapshot?.computed_at ?? undefined,
        firstProjectionAt: reserveProjection?.projected_at ?? undefined,
        alertPolicyArmedAt: undefined,
        activationCompletedAt: latestCompletedActivationRun?.completed_at ?? undefined,
    };

    let state: ActivationState;
    if (
        conditions.processorConnected &&
        Boolean(monitoredEntity?.current_baseline_snapshot_id) &&
        Boolean(monitoredEntity?.current_projection_id) &&
        conditions.baselineGenerated &&
        conditions.projectionExists
    ) {
        state = 'live_monitored';
    } else if (conditions.processorConnected) {
        state = 'connected_generating';
    } else {
        state = 'paid_unconnected';
    }

    // If activation is still running or a monitored entity has not been established,
    // keep the workspace in the generating state rather than allowing a partial dashboard.
    if (
        state === 'live_monitored' &&
        latestActivationRun &&
        latestActivationRun.status !== 'completed'
    ) {
        state = 'connected_generating';
    }

    return { state, workspace, conditions, meta };
}

/**
 * Binary check: is this workspace fully live monitored?
 */
export function isLiveMonitored(conditions: ActivationStatus['conditions']): boolean {
    return (
        conditions.paidTier &&
        conditions.processorConnected &&
        conditions.baselineGenerated &&
        conditions.projectionExists
    );
}
