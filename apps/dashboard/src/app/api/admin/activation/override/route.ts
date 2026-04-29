/**
 * Admin Manual Activation Override
 *
 * Forces a paid workspace to `live_monitored` state when the normal
 * activation runner has failed for the INSUFFICIENT_STRIPE_ACTIVITY
 * gate. Use case: distressed merchants who match ICP perfectly but
 * have <10 recent charges (frozen processor, paused processing).
 *
 * Behavior: runs the same baseline/projection logic as the normal
 * activation runner, but with `bypassActivityThreshold: true`. Real
 * baseline + projection records are still created (from whatever Stripe
 * data is available); the dashboard depends on those records existing.
 *
 * Auth: requires `isInternalOperatorUser`. Tied to a real human
 * identity — no CRON_SECRET fallback.
 *
 * Body: { workspaceId: string, reason: string }
 *
 * Reason is required and persisted in event metadata + alert payload
 * so override actions are auditable. Use it for "manually verified
 * via 30-min call on 2026-04-29; processing paused, ICP confirmed."
 *
 * NOT permitted: account-not-ready (charges/payouts/details disabled).
 * If a Stripe account isn't actually capable of charging, no override
 * helps — the customer needs to fix Stripe first.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { mirrorWorkspaceStateToClerk } from '@/lib/clerk-mirror';
import {
    ensurePendingActivationRun,
    markActivationRunCompleted,
    markActivationRunFailed,
    markActivationRunRunning,
} from '@/lib/db/activation-runs';
import { createBaselineSnapshot } from '@/lib/db/baseline-snapshots';
import { getMonitoredEntityByWorkspaceId, markMonitoredEntityReady } from '@/lib/db/monitored-entities';
import { getStripeProcessorConnectionByWorkspaceId } from '@/lib/db/processor-connections';
import { createReserveProjection } from '@/lib/db/reserve-projections';
import { findWorkspaceById, updateWorkspaceState } from '@/lib/db/workspaces';
import { logOnboardingEvent } from '@/lib/onboarding-events-server';
import { isInternalOperatorUser } from '@/lib/resolve-workspace';
import { sendActivationAlert } from '@/lib/activation-alerts';
import {
    STRIPE_BASELINE_MODEL_VERSION,
    deriveBaselineAndProjection,
    fetchStripeActivationInputs,
} from '@/lib/stripe-activation-contract';

export const runtime = 'nodejs';

interface OverrideBody {
    workspaceId?: unknown;
    reason?: unknown;
}

export async function POST(request: Request) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isInternalOperatorUser(userId);
    if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden', code: 'ADMIN_REQUIRED' }, { status: 403 });
    }

    let body: OverrideBody = {};
    try {
        body = (await request.json()) as OverrideBody;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const targetWorkspaceId = typeof body.workspaceId === 'string' ? body.workspaceId.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    if (!targetWorkspaceId) {
        return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }
    if (!reason) {
        return NextResponse.json({ error: 'reason is required (audit trail)' }, { status: 400 });
    }
    if (reason.length > 500) {
        return NextResponse.json({ error: 'reason must be <= 500 characters' }, { status: 400 });
    }

    const workspaceRecord = await findWorkspaceById(targetWorkspaceId);
    if (!workspaceRecord) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const processorConnection = await getStripeProcessorConnectionByWorkspaceId(targetWorkspaceId);
    if (!processorConnection || processorConnection.status !== 'connected') {
        return NextResponse.json(
            {
                error: 'Cannot override without a connected Stripe processor — customer must complete Stripe Connect first',
                code: 'PROCESSOR_CONNECTION_REQUIRED',
            },
            { status: 409 },
        );
    }

    const monitoredEntity = await getMonitoredEntityByWorkspaceId(targetWorkspaceId);
    if (!monitoredEntity || !monitoredEntity.primary_host) {
        return NextResponse.json(
            {
                error: 'Cannot override without a monitored entity + primary host — customer scan must complete first',
                code: 'MONITORED_ENTITY_REQUIRED',
            },
            { status: 409 },
        );
    }

    const pendingRun = await ensurePendingActivationRun({
        workspaceId: targetWorkspaceId,
        processorConnectionId: processorConnection.id,
        monitoredEntityId: monitoredEntity.id,
        trigger: 'manual_retry',
        triggeredBy: userId,
    });

    if (pendingRun.status !== 'running') {
        await markActivationRunRunning({
            activationRunId: pendingRun.id,
            processorConnectionId: processorConnection.id,
            monitoredEntityId: monitoredEntity.id,
        });
    }

    try {
        const inputs = await fetchStripeActivationInputs(processorConnection.stripe_account_id);
        // Bypass the activity threshold; still enforce account-readiness invariants.
        const computed = deriveBaselineAndProjection(inputs, { bypassActivityThreshold: true });
        const computedAt = new Date().toISOString();

        const baselineSnapshot = await createBaselineSnapshot({
            workspaceId: targetWorkspaceId,
            monitoredEntityId: monitoredEntity.id,
            sourceProcessorConnectionId: processorConnection.id,
            riskTier: computed.riskTier,
            riskBand: computed.riskBand,
            stabilityScore: computed.stabilityScore,
            trend: computed.trend,
            policySurface: computed.policySurface,
            sourceSummary: { ...computed.sourceSummary, override: { reason, by: userId } },
            computedAt,
        });

        const reserveProjection = await createReserveProjection({
            workspaceId: targetWorkspaceId,
            monitoredEntityId: monitoredEntity.id,
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

        await markMonitoredEntityReady({
            workspaceId: targetWorkspaceId,
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
            workspaceId: targetWorkspaceId,
            activationState: 'active',
        });
        await mirrorWorkspaceStateToClerk(workspaceRecord.clerk_org_id, { activationState: 'active' });

        logOnboardingEvent('activation_overridden', {
            userId,
            workspaceId: targetWorkspaceId,
            metadata: {
                activationRunId: pendingRun.id,
                overriddenBy: userId,
                reason,
                previousState: workspaceRecord.activation_state,
                chargeCount30d: inputs.recent.chargeCount30d,
                payoutCount30d: inputs.recent.payoutCount30d,
            },
        });
        logOnboardingEvent('activation_state_changed', {
            userId,
            workspaceId: targetWorkspaceId,
            metadata: { state: 'live_monitored', activationRunId: pendingRun.id, source: 'manual_override' },
        });

        void sendActivationAlert({
            kind: 'activation_overridden',
            workspaceId: targetWorkspaceId,
            workspaceName: workspaceRecord.name ?? undefined,
            userId,
            state: 'live_monitored',
            extra: {
                previousState: workspaceRecord.activation_state ?? 'unknown',
                reason: reason.slice(0, 200),
                overriddenBy: userId,
                chargeCount30d: inputs.recent.chargeCount30d,
                payoutCount30d: inputs.recent.payoutCount30d,
            },
        });

        return NextResponse.json({
            ok: true,
            workspaceId: targetWorkspaceId,
            activationState: 'active',
            runId: pendingRun.id,
            baseline: {
                riskTier: computed.riskTier,
                riskBand: computed.riskBand,
            },
            activity: {
                chargeCount30d: inputs.recent.chargeCount30d,
                payoutCount30d: inputs.recent.payoutCount30d,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'OVERRIDE_FAILED';
        await markActivationRunFailed({
            activationRunId: pendingRun.id,
            failureCode: message === 'PROCESSOR_ACCOUNT_NOT_READY' ? message : 'OVERRIDE_FAILED',
            failureDetail: message,
        });
        return NextResponse.json(
            {
                error: 'Override failed',
                code: message === 'PROCESSOR_ACCOUNT_NOT_READY' ? message : 'OVERRIDE_FAILED',
                detail: message,
            },
            { status: message === 'PROCESSOR_ACCOUNT_NOT_READY' ? 409 : 500 },
        );
    }
}
