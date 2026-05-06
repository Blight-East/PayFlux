import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getLatestCompletedActivationRunByWorkspaceId } from '@/lib/db/activation-runs';
import { getBaselineSnapshotById } from '@/lib/db/baseline-snapshots';
import { getMonitoredEntityByWorkspaceId } from '@/lib/db/monitored-entities';
import { getStripeProcessorConnectionByWorkspaceId } from '@/lib/db/processor-connections';
import { getReserveProjectionById } from '@/lib/db/reserve-projections';
import { requireAuth } from '@/lib/require-auth';
import { canAccess } from '@/lib/tier/resolver';
import { dbQuery } from '@/lib/db/client';
import { computeUnifiedForecast } from '@/lib/forecast/unified-risk-score';
import { logOnboardingEvent } from '@/lib/onboarding-events-server';

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

    const projectionBasisRecord = reserveProjection.projection_basis as Record<string, any> || {};
    const goVolatility = Number(projectionBasisRecord?.inputs?.instability_index ?? 0);

    const forecast = computeUnifiedForecast({
        pending_balance: Number(financialData.pending_balance ?? 0),
        total_volume_30d: Number(financialData.total_volume_30d ?? 0),
        dispute_count_30d: Number(financialData.dispute_count_30d ?? 0),
        avg_payout_delay_days: financialData.avg_payout_delay_days !== null
            ? Number(financialData.avg_payout_delay_days)
            : null,
        fetched_at: financialData.fetched_at ? String(financialData.fetched_at) : undefined,
    }, goVolatility);

    // ─────────────────────────────────────────────────────────────────────
    // Behavioral Calibration Layer & True Snapshot Persistence
    // ─────────────────────────────────────────────────────────────────────

    const rBase = forecast.derivedSignals.rBase;
    const rFinal = forecast.derivedSignals.riskScore;
    const disagreementThreshold = Math.max(0.1, rFinal * 0.15);
    
    if (Math.abs(rFinal - rBase) > disagreementThreshold) {
        logOnboardingEvent('forecast_model_disagreement', {
            workspaceId: workspace.workspaceRecordId,
            metadata: {
                rBase,
                rFinal,
                volatilityScore: goVolatility,
                disputeRatio: forecast.derivedSignals.disputeRatio,
                balancePressure: forecast.derivedSignals.balancePressure
            }
        });
    }

    const featureSnapshot = {
        schemaVersion: forecast.schemaVersion,
        observedSignals: forecast.observedSignals,
        derivedSignals: forecast.derivedSignals,
        financialDataId: financialData.id,
    };
    const featureSnapshotJson = JSON.stringify(featureSnapshot);
    const featureHash = crypto.createHash('sha256').update(featureSnapshotJson).digest('hex').substring(0, 16);

    // Save reproducible snapshot to DB
    await dbQuery(`
        INSERT INTO forecast_snapshots (
            workspace_id, stripe_account_id, stripe_financials_id, model_version,
            forecasted_t30_cents, confidence_band, data_completeness,
            feature_hash, feature_snapshot_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
        workspace.workspaceRecordId,
        processorConnection.stripe_account_id,
        financialData.id,
        forecast.modeledProjections.modelVersion,
        forecast.modeledProjections.windows[0].capitalAtRiskCents,
        forecast.derivedSignals.confidenceBand,
        forecast.derivedSignals.dataCompletenessScore,
        featureHash,
        featureSnapshotJson
    ]).catch(err => {
        console.error('[FORECAST] Failed to save DB snapshot:', err);
    });

    logOnboardingEvent('forecast_snapshot_generated', {
        workspaceId: workspace.workspaceRecordId,
        metadata: {
            merchantId: monitoredEntity.id,
            forecasted_t30_cents: forecast.modeledProjections.windows[0].capitalAtRiskCents,
            riskScore: forecast.derivedSignals.riskScore,
            confidenceBand: forecast.derivedSignals.confidenceBand,
            input_hash: featureHash,
            timestamp: new Date().toISOString()
        }
    });

    // ─────────────────────────────────────────────────────────────────────
    // Map unified forecast → API response contract
    //
    // reserveProjections: ALL three windows, always.
    // lockedProjections: pure slice of windows[].filter(>30), NO recomputation.
    // hasProjectionAccess: controls frontend gating only.
    // ─────────────────────────────────────────────────────────────────────

    const reserveProjections = forecast.modeledProjections.windows.map((w) => ({
        windowDays: w.windowDays,
        baseReserveRate: w.reserveRateBps,
        worstCaseReserveRate: w.reserveRateBps,
        projectedTrappedBps: w.reserveRateBps,
        worstCaseTrappedBps: w.reserveRateBps,
        projectedTrappedUSD: Math.round(w.capitalAtRiskCents / 100),
        worstCaseTrappedUSD: Math.round(w.capitalAtRiskCents / 100),
        capitalAtRiskCentsMin: w.capitalAtRiskCentsMin,
        capitalAtRiskCentsMax: w.capitalAtRiskCentsMax,
        displayMode: w.displayMode,
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
                capitalAtRiskCentsMin: p.capitalAtRiskCentsMin,
                capitalAtRiskCentsMax: p.capitalAtRiskCentsMax,
                displayMode: p.displayMode,
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
        instabilitySignal: forecast.derivedSignals.riskSignal,
        hasProjectionAccess: hasFullProjectionAccess,
        reserveProjections,
        lockedProjections,
        riskScore: forecast.derivedSignals.riskScore,
        riskDrivers: forecast.derivedSignals.drivers,
        recommendedInterventions,
        simulationDelta,
        observedSignals: forecast.observedSignals,
        derivedSignals: forecast.derivedSignals,
        projectionBasis: {
            ...(reserveProjection.projection_basis as Record<string, unknown> ?? {}),
            dataAgeHours: Number(dataAgeHours.toFixed(2)),
        },
        volumeMode: 'bps_plus_usd' as const,
        projectedAt: reserveProjection.projected_at,
        modelVersion: forecast.modeledProjections.modelVersion,
    };

    return NextResponse.json(response, {
        headers: {
            'Cache-Control': 'no-store',
            'X-Model-Version': forecast.modeledProjections.modelVersion,
        },
    });
}
