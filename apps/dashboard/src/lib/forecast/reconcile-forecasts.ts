/**
 * V4 Forecast Reconciliation Engine
 *
 * Pure function library. No side effects. No DB access.
 * Accepts matured forecast snapshots + their time-aligned Stripe financials
 * at T+30, and returns reconciliation results with decomposed outcome attribution.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RealizedOutcome {
    canonicalReserveExposureCents: number;

    components: {
        reserveHoldCents: number;
        payoutDelayExposureCents: number;
        disputeExposureCents: number;
    };

    outcomeType:
        | 'explicit_reserve'
        | 'liquidity_constraint'
        | 'dispute_pressure'
        | 'mixed';
}

export interface ReconciliationInput {
    snapshotId: string;
    workspaceId: string;
    forecastedT30Cents: number;
    forecastedT30CentsMin: number | null;
    forecastedT30CentsMax: number | null;
    confidenceBand: string;
    dataCompleteness: number;
    createdAt: Date;

    // T+30 Stripe observation (time-aligned)
    observedPendingBalanceCents: number;
    observedDisputeCount30d: number;
    observedAvgDisputeAmountCents: number; // derived from disputes if available
    observedReserveHoldCents: number;      // Stripe reserved balance if available
}

export interface ReconciliationResult {
    snapshotId: string;
    workspaceId: string;
    realizedOutcome: RealizedOutcome;
    error: {
        absoluteErrorCents: number;
        smapePct: number;
        directionCorrect: boolean;
        withinBounds: boolean | null; // null if bounds were not persisted
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Outcome Computation
// ─────────────────────────────────────────────────────────────────────────────

export function computeRealizedOutcome(input: ReconciliationInput): RealizedOutcome {
    const reserveHoldCents = input.observedReserveHoldCents;
    const payoutDelayExposureCents = input.observedPendingBalanceCents;
    const disputeExposureCents = input.observedDisputeCount30d * input.observedAvgDisputeAmountCents;

    const canonical = Math.max(reserveHoldCents, payoutDelayExposureCents, disputeExposureCents);

    // Determine which component dominated
    let outcomeType: RealizedOutcome['outcomeType'] = 'mixed';
    const dominantThreshold = canonical * 0.6; // component must be >60% of canonical to "own" it

    const dominators = [
        reserveHoldCents >= dominantThreshold,
        payoutDelayExposureCents >= dominantThreshold,
        disputeExposureCents >= dominantThreshold,
    ];
    const dominatorCount = dominators.filter(Boolean).length;

    if (dominatorCount === 1) {
        if (dominators[0]) outcomeType = 'explicit_reserve';
        else if (dominators[1]) outcomeType = 'liquidity_constraint';
        else outcomeType = 'dispute_pressure';
    }

    return {
        canonicalReserveExposureCents: canonical,
        components: {
            reserveHoldCents,
            payoutDelayExposureCents,
            disputeExposureCents,
        },
        outcomeType,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// SMAPE (Symmetric Mean Absolute Percentage Error)
// Stable for sparse/small merchants unlike traditional MAPE
// ─────────────────────────────────────────────────────────────────────────────

export function computeSMAPE(predicted: number, actual: number): number {
    const denom = (Math.abs(predicted) + Math.abs(actual)) / 2;
    if (denom === 0) return 0; // both zero = perfect prediction
    return (Math.abs(predicted - actual) / denom) * 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Single Snapshot Reconciliation
// ─────────────────────────────────────────────────────────────────────────────

const RISK_THRESHOLD_CENTS = 50000; // $500 threshold for directional accuracy

export function reconcileSnapshot(input: ReconciliationInput): ReconciliationResult {
    const realizedOutcome = computeRealizedOutcome(input);
    const actual = realizedOutcome.canonicalReserveExposureCents;
    const predicted = input.forecastedT30Cents;

    const absoluteErrorCents = Math.abs(predicted - actual);
    const smapePct = Math.round(computeSMAPE(predicted, actual) * 100) / 100;

    // Directional: did we correctly classify above/below the risk threshold?
    const directionCorrect = (predicted >= RISK_THRESHOLD_CENTS) === (actual >= RISK_THRESHOLD_CENTS);

    // Coverage: did reality land within our uncertainty envelope?
    let withinBounds: boolean | null = null;
    if (input.forecastedT30CentsMin !== null && input.forecastedT30CentsMax !== null) {
        withinBounds = actual >= input.forecastedT30CentsMin && actual <= input.forecastedT30CentsMax;
    }

    return {
        snapshotId: input.snapshotId,
        workspaceId: input.workspaceId,
        realizedOutcome,
        error: {
            absoluteErrorCents,
            smapePct,
            directionCorrect,
            withinBounds,
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch Reconciliation (aggregate metrics)
// ─────────────────────────────────────────────────────────────────────────────

export interface AggregateMetrics {
    sampleSize: number;
    maeCents: number;
    smapePct: number;
    directionalAccuracyPct: number;
    coverageRatioPct: number;
}

export function computeAggregateMetrics(results: ReconciliationResult[]): AggregateMetrics {
    if (results.length === 0) {
        return { sampleSize: 0, maeCents: 0, smapePct: 0, directionalAccuracyPct: 0, coverageRatioPct: 0 };
    }

    const n = results.length;
    const totalAbsError = results.reduce((s, r) => s + r.error.absoluteErrorCents, 0);
    const totalSmape = results.reduce((s, r) => s + r.error.smapePct, 0);
    const directionalCorrect = results.filter(r => r.error.directionCorrect).length;

    const withBounds = results.filter(r => r.error.withinBounds !== null);
    const withinBounds = withBounds.filter(r => r.error.withinBounds === true).length;
    const coverageRatio = withBounds.length > 0
        ? (withinBounds / withBounds.length) * 100
        : 0;

    return {
        sampleSize: n,
        maeCents: Math.round(totalAbsError / n),
        smapePct: Math.round((totalSmape / n) * 100) / 100,
        directionalAccuracyPct: Math.round((directionalCorrect / n) * 10000) / 100,
        coverageRatioPct: Math.round(coverageRatio * 100) / 100,
    };
}
