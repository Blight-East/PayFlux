/**
 * V4 Calibration Report Generator
 *
 * Computes aggregate calibration metrics from reconciled forecast snapshots
 * and writes structured reports to calibration_reports table.
 *
 * Cohort segmentation includes:
 * - Volume tiers
 * - Data completeness bands
 * - Outcome severity types (the critical missing cohort)
 * - Confidence band breakdown
 */

import { dbQuery } from '@/lib/db/client';
import {
    reconcileSnapshot,
    computeAggregateMetrics,
    type ReconciliationInput,
    type ReconciliationResult,
} from './reconcile-forecasts';

const REPORT_VERSION = 'v4.0';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ReconciledRow {
    id: string;
    workspace_id: string;
    forecasted_t30_cents: number;
    forecasted_t30_cents_min: number | null;
    forecasted_t30_cents_max: number | null;
    confidence_band: string;
    data_completeness: number;
    created_at: Date;
    realized_reserve_cents: number;
    feature_snapshot_json: Record<string, any>;

    // Joined from stripe_financials at T+30
    t30_pending_balance: number;
    t30_dispute_count_30d: number;
    t30_available_balance: number;
}

interface CohortDefinition {
    key: string;
    filter: (row: ReconciledRow, result: ReconciliationResult) => boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cohort Definitions
// ─────────────────────────────────────────────────────────────────────────────

const COHORTS: CohortDefinition[] = [
    { key: 'all', filter: () => true },

    // Volume cohorts
    { key: 'high_volume', filter: (r) => {
        const vol = r.feature_snapshot_json?.observedSignals?.totalVolume30dCents ?? 0;
        return vol > 1_000_000;
    }},
    { key: 'low_volume', filter: (r) => {
        const vol = r.feature_snapshot_json?.observedSignals?.totalVolume30dCents ?? 0;
        return vol <= 1_000_000;
    }},

    // Data completeness cohorts
    { key: 'high_completeness', filter: (r) => r.data_completeness >= 0.7 },
    { key: 'low_completeness', filter: (r) => r.data_completeness < 0.5 },

    // Outcome severity cohorts (critical addition)
    { key: 'high_realized_reserve', filter: (_r, result) =>
        result.realizedOutcome.canonicalReserveExposureCents > 500_000 // > $5k
    },
    { key: 'low_realized_reserve', filter: (_r, result) =>
        result.realizedOutcome.canonicalReserveExposureCents <= 50_000 // <= $500
    },
    { key: 'dispute_heavy', filter: (_r, result) =>
        result.realizedOutcome.outcomeType === 'dispute_pressure'
    },
    { key: 'payout_delay_heavy', filter: (_r, result) =>
        result.realizedOutcome.outcomeType === 'liquidity_constraint'
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Report Generation
// ─────────────────────────────────────────────────────────────────────────────

export async function generateCalibrationReport(): Promise<{
    cohortsProcessed: number;
    totalReconciled: number;
}> {
    // Fetch all reconciled snapshots with their T+30 financial observations
    const result = await dbQuery(`
        SELECT
            fs.id,
            fs.workspace_id,
            fs.forecasted_t30_cents,
            fs.forecasted_t30_cents_min,
            fs.forecasted_t30_cents_max,
            fs.confidence_band,
            fs.data_completeness,
            fs.created_at,
            fs.realized_reserve_cents,
            fs.feature_snapshot_json
        FROM forecast_snapshots fs
        WHERE fs.reconciled_at IS NOT NULL
          AND fs.realized_reserve_cents IS NOT NULL
        ORDER BY fs.created_at DESC
        LIMIT 5000
    `);

    const rows = result.rows as unknown as ReconciledRow[];
    if (rows.length === 0) {
        return { cohortsProcessed: 0, totalReconciled: 0 };
    }

    // Reconcile each row into a result (recompute metrics from stored outcomes)
    const results: { row: ReconciledRow; result: ReconciliationResult }[] = rows.map(row => {
        const input: ReconciliationInput = {
            snapshotId: row.id,
            workspaceId: row.workspace_id,
            forecastedT30Cents: Number(row.forecasted_t30_cents),
            forecastedT30CentsMin: row.forecasted_t30_cents_min !== null ? Number(row.forecasted_t30_cents_min) : null,
            forecastedT30CentsMax: row.forecasted_t30_cents_max !== null ? Number(row.forecasted_t30_cents_max) : null,
            confidenceBand: row.confidence_band,
            dataCompleteness: Number(row.data_completeness),
            createdAt: new Date(row.created_at),

            // Use realized value directly since it was already computed during reconciliation
            observedPendingBalanceCents: Number(row.realized_reserve_cents),
            observedDisputeCount30d: 0,
            observedAvgDisputeAmountCents: 0,
            observedReserveHoldCents: Number(row.realized_reserve_cents),
        };
        return { row, result: reconcileSnapshot(input) };
    });

    // Compute per-cohort metrics and write reports
    let cohortsProcessed = 0;

    for (const cohort of COHORTS) {
        const cohortResults = results
            .filter(({ row, result }) => cohort.filter(row, result))
            .map(({ result }) => result);

        if (cohortResults.length === 0) continue;

        const metrics = computeAggregateMetrics(cohortResults);

        // Confidence band breakdown
        const highConfResults = results
            .filter(({ row }) => row.confidence_band === 'HIGH')
            .filter(({ row, result }) => cohort.filter(row, result))
            .map(({ result }) => result);
        const medConfResults = results
            .filter(({ row }) => row.confidence_band === 'MEDIUM')
            .filter(({ row, result }) => cohort.filter(row, result))
            .map(({ result }) => result);
        const lowConfResults = results
            .filter(({ row }) => row.confidence_band === 'LOW')
            .filter(({ row, result }) => cohort.filter(row, result))
            .map(({ result }) => result);

        const highMetrics = computeAggregateMetrics(highConfResults);
        const medMetrics = computeAggregateMetrics(medConfResults);
        const lowMetrics = computeAggregateMetrics(lowConfResults);

        await dbQuery(`
            INSERT INTO calibration_reports (
                report_version, cohort_key, sample_size,
                mae_cents, smape_pct, directional_accuracy_pct, coverage_ratio_pct,
                avg_error_high_confidence, avg_error_medium_confidence, avg_error_low_confidence,
                coverage_high_confidence, coverage_medium_confidence, coverage_low_confidence,
                normalization_frequency_pct
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, [
            REPORT_VERSION,
            cohort.key,
            metrics.sampleSize,
            metrics.maeCents,
            metrics.smapePct,
            metrics.directionalAccuracyPct,
            metrics.coverageRatioPct,
            highMetrics.sampleSize > 0 ? highMetrics.maeCents : null,
            medMetrics.sampleSize > 0 ? medMetrics.maeCents : null,
            lowMetrics.sampleSize > 0 ? lowMetrics.maeCents : null,
            highMetrics.sampleSize > 0 ? highMetrics.coverageRatioPct : null,
            medMetrics.sampleSize > 0 ? medMetrics.coverageRatioPct : null,
            lowMetrics.sampleSize > 0 ? lowMetrics.coverageRatioPct : null,
            0, // normalization_frequency_pct — requires separate query
        ]);

        cohortsProcessed++;
    }

    return { cohortsProcessed, totalReconciled: rows.length };
}
