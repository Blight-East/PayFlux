import { NextResponse } from 'next/server';
import { getLatestCompletedActivationRunByWorkspaceId } from '@/lib/db/activation-runs';
import { getBaselineSnapshotById } from '@/lib/db/baseline-snapshots';
import { getMonitoredEntityByWorkspaceId } from '@/lib/db/monitored-entities';
import { getStripeProcessorConnectionByWorkspaceId } from '@/lib/db/processor-connections';
import { getReserveProjectionById } from '@/lib/db/reserve-projections';
import { requireAuth } from '@/lib/require-auth';
import { canAccess } from '@/lib/tier/resolver';
import { dbQuery } from '@/lib/db/client';
import { computeUnifiedForecast } from '@/lib/forecast/unified-risk-score';

export const runtime = "nodejs";

export async function GET(request: Request) {
    const authResult = await requireAuth({ allowAdminBypass: false });
    if (!authResult.ok) return authResult.response;

    const { workspace } = authResult;
    const hasFullProjectionAccess = canAccess(workspace.tier, "reserve_projection");
    const hasBasicAccess = canAccess(workspace.tier, "basic_risk_score");

    // Truly unauthorized tiers (none today) get 402.
    if (!hasBasicAccess) {
        return NextResponse.json(
            { error: 'Payment Required', code: 'SUBSCRIPTION_REQUIRED' },
            { status: 402 }
        );
    }

    if (workspace.activationState !== 'active') {
        return NextResponse.json(
            { error: 'Activation not complete', code: 'ACTIVATION_NOT_READY' },
            { status: 409 }
        );
    }

    const [processorConnection, monitoredEntity, completedActivationRun] = await Promise.all([
        getStripeProcessorConnectionByWorkspaceId(workspace.workspaceRecordId),
        getMonitoredEntityByWorkspaceId(workspace.workspaceRecordId),
        getLatestCompletedActivationRunByWorkspaceId(workspace.workspaceRecordId),
    ]);
    const [baselineSnapshot, reserveProjection] = await Promise.all([
        monitoredEntity?.current_baseline_snapshot_id ? getBaselineSnapshotById(monitoredEntity.current_baseline_snapshot_id) : Promise.resolve(null),
        monitoredEntity?.current_projection_id ? getReserveProjectionById(monitoredEntity.current_projection_id) : Promise.resolve(null),
    ]);

    if (!processorConnection || processorConnection.status !== 'connected') {
        return NextResponse.json(
            { error: 'Processor connection required', code: 'PROCESSOR_CONNECTION_REQUIRED' },
            { status: 409 }
        );
    }

    if (!monitoredEntity?.primary_host) {
        return NextResponse.json(
            { error: 'Monitored entity not ready', code: 'MONITORED_ENTITY_REQUIRED' },
            { status: 409 }
        );
    }

    if (!completedActivationRun) {
        return NextResponse.json(
            { error: 'Activation not complete', code: 'ACTIVATION_NOT_READY' },
            { status: 409 }
        );
    }

    if (
        !completedActivationRun.baseline_ready ||
        !completedActivationRun.first_projection_ready ||
        !baselineSnapshot ||
        !reserveProjection
    ) {
        return NextResponse.json(
            {
                error: 'Scoped forecast not available',
                code: 'SCOPED_FORECAST_NOT_READY',
                monitoredHost: monitoredEntity.primary_host,
            },
            { status: 409 }
        );
    }

    // ─────────────────────────────────────────────────────────────────────
    // Fetch Stripe financials — the authoritative input source
    // ─────────────────────────────────────────────────────────────────────

    const finResult = await dbQuery(`
        SELECT * FROM stripe_financials 
        WHERE workspace_id = $1 
        ORDER BY fetched_at DESC 
        LIMIT 1
    `, [workspace.workspaceRecordId]);

    const financialData = finResult.rows[0];

    if (!financialData) {
        return NextResponse.json(
            { error: 'Forecasting will be available after the first financial sync completes.', code: 'SYNC_PENDING' },
            { status: 409 }
        );
    }

    // ─────────────────────────────────────────────────────────────────────
    // Unified forecast — single deterministic computation
    // No secondary model sources. No recomputation layers.
    // ─────────────────────────────────────────────────────────────────────

    const forecast = computeUnifiedForecast({
        pending_balance: Number(financialData.pending_balance ?? 0),
        total_volume_30d: Number(financialData.total_volume_30d ?? 0),
        dispute_count_30d: Number(financialData.dispute_count_30d ?? 0),
        avg_payout_delay_days: financialData.avg_payout_delay_days !== null
            ? Number(financialData.avg_payout_delay_days)
            : null,
    });
    // Go backend volatilityScore intentionally omitted for v1.
    // When integrated: pass as second arg. Never required for correctness.

    // ─────────────────────────────────────────────────────────────────────
    // Map unified forecast → API response contract
    //
    // reserveProjections: ALL three windows, always.
    // lockedProjections: pure slice of windows[].filter(>30), NO recomputation.
    // hasProjectionAccess: controls frontend gating only.
    // ─────────────────────────────────────────────────────────────────────

    const reserveProjections = forecast.windows.map((w) => ({
        windowDays: w.windowDays,
        baseReserveRate: w.reserveRateBps,
        worstCaseReserveRate: w.reserveRateBps,
        projectedTrappedBps: w.reserveRateBps,
        worstCaseTrappedBps: w.reserveRateBps,
        projectedTrappedUSD: Math.round(w.capitalAtRiskCents / 100),
        worstCaseTrappedUSD: Math.round(w.capitalAtRiskCents / 100),
        riskBand: w.riskBand,
    }));

    // lockedProjections is a PURE PROJECTION of windows[] — no recomputation
    const lockedProjections = !hasFullProjectionAccess
        ? reserveProjections
            .filter((p) => p.windowDays > 30)
            .map((p) => ({
                windowDays: p.windowDays,
                worstCaseTrappedBps: p.worstCaseTrappedBps,
                worstCaseTrappedUSD: p.worstCaseTrappedUSD,
                riskBand: p.riskBand,
            }))
        : [];

    const fetchedAt = new Date(String(financialData.fetched_at));
    const dataAgeHours = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60);

    // Derive interventions from the DB projection (if available)
    const recommendedInterventions = Array.isArray(reserveProjection.recommended_interventions)
        ? reserveProjection.recommended_interventions as Array<{
            action: string;
            rationale: string;
            priority: 'critical' | 'high' | 'moderate' | 'low';
        }>
        : [];

    const simulationDelta = (reserveProjection.simulation_delta ?? null) as {
        velocityReduction: number;
        exposureMultiplier: number;
        rateMultiplier: number;
        label: string;
    } | null;

    const response = {
        merchantId: monitoredEntity.id,
        normalizedHost: monitoredEntity.primary_host ?? 'unknown',
        currentRiskTier: reserveProjection.current_risk_tier,
        trend: reserveProjection.trend,
        tierDelta: reserveProjection.tier_delta,
        instabilitySignal: forecast.riskSignal,
        hasProjectionAccess: hasFullProjectionAccess,
        reserveProjections,
        lockedProjections,
        riskScore: forecast.riskScore,
        riskDrivers: forecast.drivers,
        recommendedInterventions,
        simulationDelta,
        projectionBasis: {
            ...(reserveProjection.projection_basis as Record<string, unknown> ?? {}),
            unifiedModel: forecast.basis,
            dataAgeHours: Number(dataAgeHours.toFixed(2)),
        },
        volumeMode: 'bps_plus_usd' as const,
        projectedAt: reserveProjection.projected_at,
        modelVersion: forecast.modelVersion,
    };

    return NextResponse.json(response, {
        headers: {
            'Cache-Control': 'no-store',
            'X-Model-Version': forecast.modelVersion,
        },
    });
}
