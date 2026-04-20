import { NextResponse } from 'next/server';

import { requirePaidAuth } from '@/lib/require-auth';
import { getRiskIncident, upsertRiskIncident, type IncidentStatus } from '@/lib/merchant-ops';

export const runtime = 'nodejs';

function isValidStatus(status: unknown): status is IncidentStatus {
    return status === 'new' || status === 'reviewing' || status === 'resolved';
}

function normalizeHost(host: string | null): string | null {
    if (!host) return null;
    const trimmed = host.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : null;
}

export async function GET(request: Request) {
    const authResult = await requirePaidAuth();
    if (!authResult.ok) return authResult.response;

    const { workspace } = authResult;
    const { searchParams } = new URL(request.url);
    const host = normalizeHost(searchParams.get('host'));

    if (!host) {
        return NextResponse.json(
            { error: 'Missing host parameter', code: 'INVALID_REQUEST' },
            { status: 400 }
        );
    }

    const incident = await getRiskIncident(workspace.workspaceId, host);

    return NextResponse.json(
        { incident },
        {
            headers: {
                'Cache-Control': 'no-store',
            },
        }
    );
}

export async function POST(request: Request) {
    const authResult = await requirePaidAuth();
    if (!authResult.ok) return authResult.response;

    const { workspace } = authResult;

    try {
        const body = await request.json();
        const host = normalizeHost(body?.host ?? null);
        const status = body?.status;
        const owner = typeof body?.owner === 'string' ? body.owner.trim().slice(0, 120) : '';
        const notes = typeof body?.notes === 'string' ? body.notes.trim().slice(0, 2000) : '';

        if (!host || !isValidStatus(status)) {
            return NextResponse.json(
                { error: 'Invalid incident payload', code: 'INVALID_REQUEST' },
                { status: 400 }
            );
        }

        const incident = await upsertRiskIncident({
            workspaceId: workspace.workspaceId,
            host,
            status,
            owner: owner || null,
            notes: notes || null,
        });

        return NextResponse.json({ incident });
    } catch (error) {
        console.error('[RISK_INCIDENT_UPSERT_ERROR]', error);
        return NextResponse.json(
            { error: 'Internal server error', code: 'INTERNAL_ERROR' },
            { status: 500 }
        );
    }
}
