import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { mirrorWorkspaceStateToClerk } from '@/lib/clerk-mirror';
import {
    ensurePendingActivationRun,
    getLatestActivationRunByWorkspaceId,
    getLatestCompletedActivationRunByWorkspaceId,
    markActivationRunCompleted,
    markActivationRunFailed,
    markActivationRunRunning,
} from '@/lib/db/activation-runs';
import { createBaselineSnapshot, getBaselineSnapshotById } from '@/lib/db/baseline-snapshots';
import {
    getMonitoredEntityByWorkspaceId,
    hydrateMonitoredEntityPrimaryHost,
    markMonitoredEntityReady,
} from '@/lib/db/monitored-entities';
import { getStripeProcessorConnectionByWorkspaceId } from '@/lib/db/processor-connections';
import { createReserveProjection, getReserveProjectionById } from '@/lib/db/reserve-projections';
import { findWorkspaceById, updateWorkspaceState } from '@/lib/db/workspaces';
import { logOnboardingEvent } from '@/lib/onboarding-events-server';
import { resolveWorkspace } from '@/lib/resolve-workspace';
import {
    STRIPE_BASELINE_MODEL_VERSION,
    deriveBaselineAndProjection,
    fetchStripeActivationInputs,
} from '@/lib/stripe-activation-contract';

export const runtime = 'nodejs';

interface ActivationStep {
    step: string;
    status: 'completed' | 'skipped' | 'failed';
    detail?: string;
}

function projectionWindowMap(projections: Array<{ windowDays: number; worstCaseTrappedBps: number }>) {
    const byWindow = (windowDays: number) => projections.find((projection) => projection.windowDays === windowDays);
    return {
        t30: { trappedBps: byWindow(30)?.worstCaseTrappedBps ?? 0 },
        t60: { trappedBps: byWindow(60)?.worstCaseTrappedBps ?? 0 },
        t90: { trappedBps: byWindow(90)?.worstCaseTrappedBps ?? 0 },
    };
}

function failClosedResponse(code: string, error: string, state: string, steps: ActivationStep[], status: number = 409) {
    return NextResponse.json({ error, code, state, steps }, { status });
}

export async function POST() {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await resolveWorkspace(userId, { allowAdminBypass: false });
    if (!workspace || (workspace.tier !== 'pro' && workspace.tier !== 'enterprise')) {
        return NextResponse.json({ error: 'Not a paid workspace', state: 'not_paid' }, { status: 403 });
    }

    const workspaceRecord = await findWorkspaceById(workspace.workspaceRecordId);
    if (!workspaceRecord) {
        return NextResponse.json({ error: 'Workspace missing', state: 'not_ready' }, { status: 404 });
    }

    const processorConnection = await getStripeProcessorConnectionByWorkspaceId(workspace.workspaceRecordId);
    if (!processorConnection || processorConnection.status !== 'connected') {
        await updateWorkspaceState({
            workspaceId: workspace.workspaceRecordId,
            activationState: 'paid_unconnected',
        });
        await mirrorWorkspaceStateToClerk(workspaceRecord.clerk_org_id, { activationState: 'paid_unconnected' });
        return failClosedResponse(
            'PROCESSOR_CONNECTION_REQUIRED',
            'No processor connected',
            'paid_unconnected',
            [{ step: 'processor_check', status: 'failed', detail: 'No connected processor row found' }]
        );
    }

    const monitoredEntity = await getMonitoredEntityByWorkspaceId(workspace.workspaceRecordId);
    if (!monitoredEntity) {
        await updateWorkspaceState({
            workspaceId: workspace.workspaceRecordId,
            activationState: 'connection_pending_verification',
        });
        await mirrorWorkspaceStateToClerk(workspaceRecord.clerk_org_id, { activationState: 'connection_pending_verification' });
        return failClosedResponse(
            'MONITORED_ENTITY_REQUIRED',
            'Monitored entity not ready',
            'connected_generating',
            [{ step: 'monitored_entity_check', status: 'failed', detail: 'No monitored entity row found' }]
        );
    }

    await updateWorkspaceState({
        workspaceId: workspace.workspaceRecordId,
        activationState: 'ready_for_activation',
    });

    const pendingRun = await ensurePendingActivationRun({
        workspaceId: workspace.workspaceRecordId,
        processorConnectionId: processorConnection.id,
        monitoredEntityId: monitoredEntity.id,
        trigger: 'manual_retry',
        triggeredBy: 'user',
    });

    if (pendingRun.status === 'running') {
        return NextResponse.json({
            state: 'connected_generating',
            message: 'Activation already in progress',
        }, { status: 200 });
    }

    await markActivationRunRunning({
        activationRunId: pendingRun.id,
        processorConnectionId: processorConnection.id,
        monitoredEntityId: monitoredEntity.id,
    });

    await updateWorkspaceState({
        workspaceId: workspace.workspaceRecordId,
        activationState: 'activation_in_progress',
    });
    await mirrorWorkspaceStateToClerk(workspaceRecord.clerk_org_id, { activationState: 'activation_in_progress' });

    const steps: ActivationStep[] = [];

    try {
        const activationInputs = await fetchStripeActivationInputs(processorConnection.stripe_account_id);
        steps.push({ step: 'processor_check', status: 'completed', detail: processorConnection.stripe_account_id });

        let activationMonitoredEntity = monitoredEntity;
        if (!activationMonitoredEntity.primary_host && activationInputs.account.businessUrl) {
            const hydrated = await hydrateMonitoredEntityPrimaryHost({
                workspaceId: workspace.workspaceRecordId,
                primaryHost: activationInputs.account.businessUrl,
                primaryHostSource: 'stripe_profile',
            });
            if (hydrated) {
                activationMonitoredEntity = hydrated;
                steps.push({
                    step: 'monitored_host_hydration',
                    status: 'completed',
                    detail: activationMonitoredEntity.primary_host ?? activationInputs.account.businessUrl,
                });
            }
        }

        if (!activationMonitoredEntity.primary_host) {
            throw new Error('MONITORED_ENTITY_HOST_REQUIRED');
        }

        const computed = deriveBaselineAndProjection(activationInputs);

        const computedAt = new Date().toISOString();
        const baselineSnapshot = await createBaselineSnapshot({
            workspaceId: workspace.workspaceRecordId,
            monitoredEntityId: activationMonitoredEntity.id,
            sourceProcessorConnectionId: processorConnection.id,
            riskTier: computed.riskTier,
            riskBand: computed.riskBand,
            stabilityScore: computed.stabilityScore,
            trend: computed.trend,
            policySurface: computed.policySurface,
            sourceSummary: computed.sourceSummary,
            computedAt,
        });
        steps.push({ step: 'baseline_generation', status: 'completed', detail: `tier=${computed.riskTier} band=${computed.riskBand}` });

        const reserveProjection = await createReserveProjection({
            workspaceId: workspace.workspaceRecordId,
            monitoredEntityId: activationMonitoredEntity.id,
            baselineSnapshotId: baselineSnapshot.id,
            activationRunId: pendingRun.id,
            modelVersion: STRIPE_BASELINE_MODEL_VERSION,
            instabilitySignal: computed.instabilitySignal,
            currentRiskTier: computed.riskTier,
            trend: computed.trend,
            tierDelta: computed.tierDelta,
            projectionBasis: computed.projectionBasis,
            reserveProjections: computed.reserveProjections,
            recommendedInterventions: computed.recommendedInterventions,
            simulationDelta: computed.simulationDelta,
            volumeMode: 'bps_only',
            projectedAt: computedAt,
        });
        steps.push({
            step: 'first_projection',
            status: 'completed',
            detail: `signal=${computed.instabilitySignal} windows=${computed.reserveProjections.length}`,
        });

        await markMonitoredEntityReady({
            workspaceId: workspace.workspaceRecordId,
            baselineSnapshotId: baselineSnapshot.id,
            projectionId: reserveProjection.id,
            lastSyncAt: computedAt,
        });

        await markActivationRunCompleted({
            activationRunId: pendingRun.id,
            baselineSnapshotId: baselineSnapshot.id,
            firstProjectionId: reserveProjection.id,
        });

        await updateWorkspaceState({
            workspaceId: workspace.workspaceRecordId,
            activationState: 'active',
        });
        await mirrorWorkspaceStateToClerk(workspaceRecord.clerk_org_id, {
            activationState: 'active',
        });

        logOnboardingEvent('arming_completed', {
            userId,
            workspaceId: workspace.workspaceRecordId,
            metadata: {
                baselineSnapshotId: baselineSnapshot.id,
                reserveProjectionId: reserveProjection.id,
                stripeAccountId: processorConnection.stripe_account_id,
                modelVersion: STRIPE_BASELINE_MODEL_VERSION,
            },
        });

        return NextResponse.json({
            state: 'live_monitored',
            steps,
            workspace: {
                id: workspace.workspaceRecordId,
                name: workspace.workspaceName,
                tier: workspace.tier,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'ACTIVATION_FAILED';
        const failureCode = message === 'INSUFFICIENT_STRIPE_ACTIVITY' || message === 'PROCESSOR_ACCOUNT_NOT_READY' || message === 'MONITORED_ENTITY_HOST_REQUIRED'
            ? message
            : 'ACTIVATION_FAILED';

        await markActivationRunFailed({
            activationRunId: pendingRun.id,
            failureCode,
            failureDetail: message,
        });

        await updateWorkspaceState({
            workspaceId: workspace.workspaceRecordId,
            activationState: 'activation_failed',
        });
        await mirrorWorkspaceStateToClerk(workspaceRecord.clerk_org_id, { activationState: 'activation_failed' });

        steps.push({ step: 'baseline_generation', status: 'failed', detail: message });

        const status = failureCode === 'INSUFFICIENT_STRIPE_ACTIVITY' || failureCode === 'PROCESSOR_ACCOUNT_NOT_READY' ? 409 : 500;
        const responseStatus = failureCode === 'MONITORED_ENTITY_HOST_REQUIRED' ? 409 : status;
        return failClosedResponse(
            failureCode,
            failureCode === 'INSUFFICIENT_STRIPE_ACTIVITY'
                ? 'Not enough recent Stripe activity to build a real baseline yet'
                : failureCode === 'PROCESSOR_ACCOUNT_NOT_READY'
                    ? 'Connected Stripe account is not fully ready for monitoring'
                    : failureCode === 'MONITORED_ENTITY_HOST_REQUIRED'
                        ? 'Connected Stripe account does not expose a usable business host for scoped monitoring'
                    : 'Activation failed',
            'connected_generating',
            steps,
            responseStatus
        );
    }
}

export async function GET() {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspace = await resolveWorkspace(userId, { allowAdminBypass: false });
    if (!workspace || (workspace.tier !== 'pro' && workspace.tier !== 'enterprise')) {
        return NextResponse.json({ error: 'Not a paid workspace', state: 'not_paid' }, { status: 403 });
    }

    const [workspaceRecord, processorConnection, monitoredEntity, latestActivationRun, latestCompletedActivationRun] = await Promise.all([
        findWorkspaceById(workspace.workspaceRecordId),
        getStripeProcessorConnectionByWorkspaceId(workspace.workspaceRecordId),
        getMonitoredEntityByWorkspaceId(workspace.workspaceRecordId),
        getLatestActivationRunByWorkspaceId(workspace.workspaceRecordId),
        getLatestCompletedActivationRunByWorkspaceId(workspace.workspaceRecordId),
    ]);

    if (!workspaceRecord) {
        return NextResponse.json({ error: 'Workspace missing' }, { status: 404 });
    }

    const baselineSnapshot = latestCompletedActivationRun?.baseline_snapshot_id
        ? await getBaselineSnapshotById(latestCompletedActivationRun.baseline_snapshot_id)
        : null;
    const reserveProjection = latestCompletedActivationRun?.first_projection_id
        ? await getReserveProjectionById(latestCompletedActivationRun.first_projection_id)
        : null;

    const conditions = {
        paidTier: true,
        processorConnected: processorConnection?.status === 'connected',
        baselineGenerated: latestCompletedActivationRun?.baseline_ready === true && Boolean(baselineSnapshot),
        projectionExists: latestCompletedActivationRun?.first_projection_ready === true && Boolean(reserveProjection),
        alertsArmed: false,
    };

    let state = 'paid_unconnected';
    if (conditions.processorConnected) {
        state = 'connected_generating';
    }
    if (conditions.processorConnected && workspaceRecord.activation_state === 'activation_failed') {
        state = 'activation_failed';
    }
    if (workspaceRecord.activation_state === 'active' && conditions.baselineGenerated && conditions.projectionExists) {
        state = 'live_monitored';
    }

    return NextResponse.json({
        state,
        conditions,
        meta: {
            baselineGeneratedAt: baselineSnapshot?.computed_at,
            firstProjectionAt: reserveProjection?.projected_at,
            alertPolicyArmedAt: undefined,
            activationCompletedAt: latestCompletedActivationRun?.completed_at,
            baselineRiskSurface: baselineSnapshot ? {
                riskTier: baselineSnapshot.risk_tier,
                riskBand: baselineSnapshot.risk_band,
                stabilityScore: baselineSnapshot.stability_score,
                trend: baselineSnapshot.trend,
            } : undefined,
            latestProjection: reserveProjection ? {
                riskTier: reserveProjection.current_risk_tier,
                riskBand: baselineSnapshot?.risk_band ?? 'elevated',
                reserveRate: Number((reserveProjection.projection_basis as Record<string, unknown>)?.constants && ((reserveProjection.projection_basis as Record<string, any>).constants.baseReserveRate ?? 0)),
                windows: projectionWindowMap(
                    Array.isArray(reserveProjection.reserve_projections)
                        ? reserveProjection.reserve_projections as Array<{ windowDays: number; worstCaseTrappedBps: number }>
                        : []
                ),
                trend: reserveProjection.trend,
            } : undefined,
        },
        activationState: workspaceRecord.activation_state,
        latestActivationRun: latestActivationRun ? {
            id: latestActivationRun.id,
            status: latestActivationRun.status,
            failureCode: latestActivationRun.failure_code,
            failureDetail: latestActivationRun.failure_detail,
        } : null,
        monitoredEntity: monitoredEntity ? {
            id: monitoredEntity.id,
            primaryHost: monitoredEntity.primary_host,
            status: monitoredEntity.status,
        } : null,
    });
}
