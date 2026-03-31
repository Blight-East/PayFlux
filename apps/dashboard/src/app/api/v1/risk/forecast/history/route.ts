import { NextResponse } from 'next/server';
import { getMonitoredEntityByWorkspaceId } from '@/lib/db/monitored-entities';
import { listReserveProjectionHistoryByWorkspaceId } from '@/lib/db/reserve-projections';
import { requireAuth } from '@/lib/require-auth';
import { buildProjectionHistoryResponse } from '@/lib/scoped-forecast';
import { canAccess } from '@/lib/tier/resolver';

export const runtime = "nodejs";

export async function GET(request: Request) {
    const authResult = await requireAuth({ allowAdminBypass: false });
    if (!authResult.ok) return authResult.response;

    const { workspace } = authResult;
    if (!canAccess(workspace.tier, "reserve_projection")) {
        return NextResponse.json(
            { error: 'Projection history requires Pro tier', code: 'UPGRADE_REQUIRED' },
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
    if (!monitoredEntity?.current_projection_id) {
        return NextResponse.json(
            { error: 'Scoped forecast not available', code: 'SCOPED_FORECAST_NOT_READY' },
            { status: 409 }
        );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50));

    const projections = await listReserveProjectionHistoryByWorkspaceId(workspace.workspaceRecordId, limit);
    const response = buildProjectionHistoryResponse({
        monitoredEntity,
        projections,
    });

    return NextResponse.json(response, {
        headers: {
            'Cache-Control': 'no-store',
        },
    });
}
