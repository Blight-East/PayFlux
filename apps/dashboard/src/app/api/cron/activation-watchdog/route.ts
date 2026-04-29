/**
 * Activation Watchdog Cron
 *
 * Surfaces silent activation stalls by scanning for workspaces stuck in
 * `activation_in_progress` or `activation_failed` past a threshold and
 * firing a single Telegram alert per stuck workspace per scan.
 *
 * The /api/activation/run route already fires an alert when activation
 * fails synchronously. This cron catches the harder-to-see cases:
 *   • request-time activation that errored before reaching the alert path
 *   • `activation_in_progress` rows that never advanced (lost worker,
 *     timed-out Stripe call, network blip)
 *   • `activation_failed` rows that no operator reviewed
 *
 * Auth: CRON_SECRET header (matches projection-cadence pattern).
 *
 * Cadence: caller's responsibility — Netlify scheduled function or
 * Vercel cron, recommended every 5 minutes.
 *
 * Output: { scanned, stalled, alerted } — alerts also write
 * `activation_stalled` events so override rate stays observable.
 */

import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db/client';
import { logOnboardingEvent } from '@/lib/onboarding-events-server';
import { sendActivationAlert } from '@/lib/activation-alerts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Alert threshold: how long an activation_in_progress / activation_failed
// row must be untouched before we alert. Tuned for "operator-noticeable"
// rather than "Stripe-API-timeout-noticeable."
const STALLED_THRESHOLD_MINUTES = 5;

// Per-scan cap to bound the DB read + alert burst.
const STALLED_QUERY_LIMIT = 50;

type StalledRow = {
    id: string;
    name: string;
    activation_state: string;
    updated_at: string;
    failure_code: string | null;
    failure_detail: string | null;
} & Record<string, unknown>;

export async function GET(request: Request) {
    const expected = process.env.CRON_SECRET;
    if (!expected) {
        return NextResponse.json({ error: 'CRON_SECRET unset' }, { status: 500 });
    }
    const provided = request.headers.get('authorization') ?? request.headers.get('x-cron-secret') ?? '';
    const providedToken = provided.startsWith('Bearer ') ? provided.slice('Bearer '.length) : provided;
    if (providedToken !== expected) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Latest activation run per workspace, joined to workspace state.
    // Stalled = activation_in_progress OR activation_failed AND last touched
    // > STALLED_THRESHOLD_MINUTES ago. We use updated_at on workspaces as
    // the proxy for "last state transition" since markActivationRunRunning
    // and updateWorkspaceState are called in lockstep.
    const result = await dbQuery<StalledRow>(
        `
        WITH latest AS (
            SELECT DISTINCT ON (workspace_id)
                workspace_id, failure_code, failure_detail, updated_at AS run_updated_at
            FROM activation_runs
            ORDER BY workspace_id, updated_at DESC
        )
        SELECT
            w.id,
            w.name,
            w.activation_state,
            w.updated_at,
            l.failure_code,
            l.failure_detail
        FROM workspaces w
        LEFT JOIN latest l ON l.workspace_id = w.id
        WHERE w.deleted_at IS NULL
          AND w.activation_state IN ('activation_in_progress', 'activation_failed')
          AND w.updated_at < NOW() - ($1::int * interval '1 minute')
        ORDER BY w.updated_at ASC
        LIMIT $2
        `,
        [STALLED_THRESHOLD_MINUTES, STALLED_QUERY_LIMIT],
    );

    const stalled = result.rows;
    let alertedCount = 0;

    for (const row of stalled) {
        const stuckMinutes = Math.round((Date.now() - new Date(row.updated_at).getTime()) / 60000);

        logOnboardingEvent('activation_stalled', {
            workspaceId: row.id,
            metadata: {
                state: row.activation_state,
                stuckMinutes,
                failureCode: row.failure_code,
                failureDetail: row.failure_detail,
                source: 'watchdog',
            },
        });

        const sent = await sendActivationAlert({
            kind: 'activation_stalled',
            workspaceId: row.id,
            workspaceName: row.name,
            state: row.activation_state,
            failureCode: row.failure_code ?? undefined,
            failureDetail: row.failure_detail?.slice(0, 200),
            stuckMinutes,
        });
        if (sent) alertedCount += 1;
    }

    return NextResponse.json({
        scanned: stalled.length,
        stalled: stalled.length,
        alerted: alertedCount,
        thresholdMinutes: STALLED_THRESHOLD_MINUTES,
    });
}
