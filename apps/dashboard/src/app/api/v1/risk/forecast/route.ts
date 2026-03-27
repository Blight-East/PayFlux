import { NextResponse } from 'next/server';
import { getLatestCompletedActivationRunByWorkspaceId } from '@/lib/db/activation-runs';
import { getBaselineSnapshotById } from '@/lib/db/baseline-snapshots';
import { getMonitoredEntityByWorkspaceId } from '@/lib/db/monitored-entities';
import { getStripeProcessorConnectionByWorkspaceId } from '@/lib/db/processor-connections';
import { getReserveProjectionById } from '@/lib/db/reserve-projections';
import { requireAuth } from '@/lib/require-auth';
import { buildScopedForecastResponse } from '@/lib/scoped-forecast';
import { canAccess } from '@/lib/tier/resolver';

export const runtime = "nodejs";

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;

    const { workspace } = authResult;
    const hasProjectionAccess = canAccess(workspace.tier, "reserve_projection");

    if (!hasProjectionAccess) {
        return NextResponse.json(
            { error: 'Payment Required', code: 'SUBSCRIPTION_REQUIRED' },
            { status: 402 }
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

    const { searchParams } = new URL(request.url);
    const rawTPV = searchParams.get('monthlyTPV');
    let monthlyTPV: number | undefined;
    if (rawTPV !== null) {
        const parsed = Number(rawTPV);
        if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1e10) {
            return NextResponse.json(
                { error: 'Invalid monthlyTPV: must be a number between 0 and 10000000000', code: 'INVALID_REQUEST' },
                { status: 400 }
            );
        }
        monthlyTPV = parsed;
    }

    const result = buildScopedForecastResponse({
        monitoredEntity,
        baselineSnapshot,
        reserveProjection,
        monthlyTPV,
    });

    return NextResponse.json(result, {
        headers: {
            'Cache-Control': 'no-store',
            'X-Model-Version': reserveProjection.model_version,
        },
    });
}
