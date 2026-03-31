import { NextResponse } from 'next/server';
import { getBaselineSnapshotById } from '@/lib/db/baseline-snapshots';
import { getMonitoredEntityByWorkspaceId } from '@/lib/db/monitored-entities';
import { getReserveProjectionById, listReserveProjectionHistoryByWorkspaceId } from '@/lib/db/reserve-projections';
import { requireAuth } from '@/lib/require-auth';
import { buildBoardReport, buildProjectionHistoryResponse, buildScopedForecastResponse } from '@/lib/scoped-forecast';
import { canAccess } from '@/lib/tier/resolver';

export const runtime = "nodejs";

export async function GET(request: Request) {
    const authResult = await requireAuth({ allowAdminBypass: false });
    if (!authResult.ok) return authResult.response;

    const { workspace } = authResult;
    if (!canAccess(workspace.tier, "reserve_projection")) {
        return NextResponse.json(
            { error: 'Board report requires Pro tier', code: 'UPGRADE_REQUIRED' },
            { status: 402 }
        );
    }

    if (workspace.activationState !== 'active') {
        return NextResponse.json(
            { error: 'Activation not complete', code: 'ACTIVATION_NOT_READY' },
            { status: 409 }
        );
    }

    const monitoredEntity = await getMonitoredEntityByWorkspaceId(workspace.workspaceRecordId);
    if (!monitoredEntity?.current_projection_id || !monitoredEntity.current_baseline_snapshot_id) {
        return NextResponse.json(
            { error: 'Scoped forecast not available', code: 'SCOPED_FORECAST_NOT_READY' },
            { status: 409 }
        );
    }

    const [baselineSnapshot, reserveProjection, projectionHistory] = await Promise.all([
        getBaselineSnapshotById(monitoredEntity.current_baseline_snapshot_id),
        getReserveProjectionById(monitoredEntity.current_projection_id),
        listReserveProjectionHistoryByWorkspaceId(workspace.workspaceRecordId, 50),
    ]);

    if (!baselineSnapshot || !reserveProjection) {
        return NextResponse.json(
            { error: 'Scoped forecast not available', code: 'SCOPED_FORECAST_NOT_READY' },
            { status: 409 }
        );
    }

    const { searchParams } = new URL(request.url);
    const rawTPV = searchParams.get('monthlyTPV');
    let monthlyTPV: number | undefined;
    if (rawTPV !== null) {
        const parsed = Number(rawTPV);
        if (Number.isFinite(parsed) && parsed > 0 && parsed <= 1e10) {
            monthlyTPV = parsed;
        }
    }

    const forecast = buildScopedForecastResponse({
        monitoredEntity,
        baselineSnapshot,
        reserveProjection,
        monthlyTPV,
    });
    const history = buildProjectionHistoryResponse({
        monitoredEntity,
        projections: projectionHistory,
    });

    return NextResponse.json(buildBoardReport({ forecast, history }), {
        headers: {
            'Cache-Control': 'no-store',
            'X-Report-Type': 'BOARD_RESERVE_REPORT',
        },
    });
}
