import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db/client';
import {
    reconcileSnapshot,
    computeRealizedOutcome,
    type ReconciliationInput,
} from '@/lib/forecast/reconcile-forecasts';
import { generateCalibrationReport } from '@/lib/forecast/generate-calibration-report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ─────────────────────────────────────────────────────────────────────────────
// Reconciliation Cron Handler
//
// Secured by CRON_SECRET. Iterates matured forecast snapshots (>= 30 days old),
// joins with time-aligned Stripe financials, computes realized outcomes,
// and populates realized_reserve_cents.
//
// After reconciliation, optionally generates calibration reports.
// ─────────────────────────────────────────────────────────────────────────────

const BATCH_LIMIT = 100;

export async function POST(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return NextResponse.json({ error: 'CRON_SECRET_NOT_CONFIGURED' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const startTime = Date.now();
    let reconciled = 0;
    let skipped = 0;
    let failed = 0;
    const errors: { snapshotId: string; error: string }[] = [];

    try {
        // 1. Find matured, unreconciled snapshots (created >= 30 days ago)
        const maturedResult = await dbQuery(`
            SELECT
                fs.id,
                fs.workspace_id,
                fs.stripe_account_id,
                fs.forecasted_t30_cents,
                fs.forecasted_t30_cents_min,
                fs.forecasted_t30_cents_max,
                fs.confidence_band,
                fs.data_completeness,
                fs.created_at
            FROM forecast_snapshots fs
            WHERE fs.created_at <= NOW() - INTERVAL '30 days'
              AND fs.reconciled_at IS NULL
            ORDER BY fs.created_at ASC
            LIMIT $1
        `, [BATCH_LIMIT]);

        const snapshots = maturedResult.rows;

        for (const snapshot of snapshots) {
            try {
                // 2. Time-aligned lookup: closest stripe_financials row
                //    observed AT LEAST 30 days after the snapshot was created
                const financialsResult = await dbQuery(`
                    SELECT
                        available_balance,
                        pending_balance,
                        dispute_count_30d,
                        total_volume_30d,
                        fetched_at
                    FROM stripe_financials
                    WHERE workspace_id = $1
                      AND fetched_at >= $2::timestamptz + INTERVAL '30 days'
                    ORDER BY fetched_at ASC
                    LIMIT 1
                `, [snapshot.workspace_id, snapshot.created_at]);

                if (financialsResult.rows.length === 0) {
                    // No T+30 observation yet — skip, will retry next run
                    skipped++;
                    continue;
                }

                const t30Fin = financialsResult.rows[0];

                // 3. Compute decomposed realized outcome
                const avgDisputeAmountCents = Number(t30Fin.dispute_count_30d) > 0
                    ? Math.round(Number(t30Fin.total_volume_30d) * 0.01 / Number(t30Fin.dispute_count_30d))
                    : 0;

                const input: ReconciliationInput = {
                    snapshotId: String(snapshot.id),
                    workspaceId: String(snapshot.workspace_id),
                    forecastedT30Cents: Number(snapshot.forecasted_t30_cents),
                    forecastedT30CentsMin: snapshot.forecasted_t30_cents_min !== null
                        ? Number(snapshot.forecasted_t30_cents_min) : null,
                    forecastedT30CentsMax: snapshot.forecasted_t30_cents_max !== null
                        ? Number(snapshot.forecasted_t30_cents_max) : null,
                    confidenceBand: String(snapshot.confidence_band),
                    dataCompleteness: Number(snapshot.data_completeness),
                    createdAt: new Date(String(snapshot.created_at)),

                    observedPendingBalanceCents: Number(t30Fin.pending_balance),
                    observedDisputeCount30d: Number(t30Fin.dispute_count_30d),
                    observedAvgDisputeAmountCents: avgDisputeAmountCents,
                    observedReserveHoldCents: 0, // Stripe reserved balance not yet available in our schema
                };

                const result = reconcileSnapshot(input);

                // 4. Persist realized outcome (never overwrite previously reconciled)
                await dbQuery(`
                    UPDATE forecast_snapshots
                    SET realized_reserve_cents = $1,
                        reconciled_at = NOW()
                    WHERE id = $2
                      AND reconciled_at IS NULL
                `, [
                    result.realizedOutcome.canonicalReserveExposureCents,
                    snapshot.id,
                ]);

                reconciled++;
            } catch (err) {
                failed++;
                errors.push({
                    snapshotId: String(snapshot.id),
                    error: (err as Error).message,
                });
            }
        }

        // 5. Generate calibration reports if we reconciled anything
        let calibrationResult = null;
        if (reconciled > 0) {
            try {
                calibrationResult = await generateCalibrationReport();
            } catch (err) {
                console.error('[RECONCILIATION] Calibration report generation failed:', err);
            }
        }

        return NextResponse.json({
            status: 'OK',
            reconciled,
            skipped,
            failed,
            calibration: calibrationResult,
            durationMs: Date.now() - startTime,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (err) {
        return NextResponse.json({
            status: 'ERROR',
            error: (err as Error).message,
            durationMs: Date.now() - startTime,
        }, { status: 500 });
    }
}
