import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { RiskIntelligence } from '@/lib/risk-infra';
import { ProjectionLedger } from '@/lib/projection-ledger';

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────────────────
// Statistical significance thresholds
// ─────────────────────────────────────────────────────────────────────────────

const MIN_MERCHANTS = 5;
const MIN_EVALUATIONS = 20;

/**
 * GET /api/v1/risk/forecast/aggregate
 *
 * Cross-Merchant Aggregated Model Accuracy.
 *
 * Computes evaluation-weighted (not merchant-averaged) accuracy metrics
 * across all merchants with projection history.
 *
 * Only aggregates model performance metrics.
 * Never exposes: merchant names, TPV, dollar amounts, or any PII.
 *
 * Requires authentication (any tier — network transparency).
 * Returns null metrics if below statistical significance threshold.
 */
export async function GET() {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;

    const snapshots = await RiskIntelligence.getAllSnapshots();

    // Per-merchant accuracy derivation
    let totalTierCorrect = 0;
    let totalTrendCorrect = 0;
    let totalEvaluations = 0;
    let merchantsWithData = 0;

    const allVariancesBps: number[] = [];
    const modelVersions = new Set<string>();

    for (const snapshot of snapshots) {
        let history;
        try {
            history = await ProjectionLedger.getHistory(snapshot.merchantId, 50);
        } catch {
            continue; // Skip merchants with inaccessible history
        }

        if (history.length < 2) continue; // Need at least 2 records for accuracy

        const accuracy = ProjectionLedger.deriveAccuracy(history, {
            riskTier: snapshot.currentRiskTier,
            trend: snapshot.trend,
            tierDelta: snapshot.tierDeltaLast,
        });

        if (accuracy.records.length === 0) continue;

        // Accumulate evaluation-weighted counts (not averages)
        for (const r of accuracy.records) {
            totalEvaluations++;
            if (r.tierAccurate) totalTierCorrect++;
            if (r.trendAccurate) totalTrendCorrect++;
            allVariancesBps.push(r.reserveRateVarianceBps);
        }

        // Track model versions from this merchant's history
        for (const h of history) {
            modelVersions.add(h.artifact.modelVersion);
        }

        merchantsWithData++;
    }

    // Check statistical significance
    const meetsThreshold = merchantsWithData >= MIN_MERCHANTS && totalEvaluations >= MIN_EVALUATIONS;

    // Compute variance statistics (only if threshold met)
    let meanVarianceBps: number | null = null;
    let medianVarianceBps: number | null = null;
    let stdDevVarianceBps: number | null = null;

    if (meetsThreshold && allVariancesBps.length > 0) {
        // Mean (of absolute values)
        const absVariances = allVariancesBps.map(v => Math.abs(v));
        meanVarianceBps = Math.round(
            absVariances.reduce((sum, v) => sum + v, 0) / absVariances.length
        );

        // Median (of absolute values)
        const sorted = [...absVariances].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        medianVarianceBps = sorted.length % 2 === 0
            ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
            : sorted[mid];

        // Standard deviation (of absolute values)
        const mean = absVariances.reduce((s, v) => s + v, 0) / absVariances.length;
        const variance = absVariances.reduce((s, v) => s + (v - mean) ** 2, 0) / absVariances.length;
        stdDevVarianceBps = Math.round(Math.sqrt(variance));
    }

    const versionArray = [...modelVersions];
    const isVersionStable = versionArray.length <= 1;

    const aggregate = {
        modelVersion: versionArray[0] || 'unknown',
        activeVersions: versionArray,
        window: '8w',
        evaluatedMerchants: merchantsWithData,
        totalEvaluations,
        meetsSignificanceThreshold: meetsThreshold,
        thresholds: {
            minMerchants: MIN_MERCHANTS,
            minEvaluations: MIN_EVALUATIONS,
        },

        // Null if below threshold — never display noise as signal
        tierAccuracy: meetsThreshold
            ? Math.round((totalTierCorrect / totalEvaluations) * 1000) / 10
            : null,
        trendAccuracy: meetsThreshold
            ? Math.round((totalTrendCorrect / totalEvaluations) * 1000) / 10
            : null,
        meanVarianceBps,
        medianVarianceBps,
        stdDevVarianceBps,

        versionStability: isVersionStable,
        generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(aggregate, {
        headers: { 'Cache-Control': 'no-store' },
    });
}
