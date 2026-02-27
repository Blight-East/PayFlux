import { NextResponse } from 'next/server';
import { RiskIntelligence, RiskLogger } from '../../../../../lib/risk-infra';
import { requireAuth } from '@/lib/require-auth';

export const runtime = "nodejs";

/**
 * GET /api/v1/risk/trend?url=...
 */
export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;

    const { userId, workspace } = authResult;

    const traceId = crypto.randomUUID();
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400, headers: { 'x-trace-id': traceId } });
    }

    const data = await RiskIntelligence.getTrend(url);

    if (!data) {
        return NextResponse.json({ error: 'No data found for this URL' }, { status: 404, headers: { 'x-trace-id': traceId } });
    }

    // 1. Enforce tier retention boundaries
    const retentionDays = workspace.tier === 'enterprise' ? 90 : workspace.tier === 'pro' ? 30 : 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffIso = cutoffDate.toISOString();

    if (data.lastScanAt < cutoffIso) {
        return NextResponse.json(
            { error: 'Data exceeds tier retention limit', code: 'RETAINED_AGE_EXCEEDED' },
            { status: 403, headers: { 'x-trace-id': traceId } }
        );
    }

    RiskLogger.log('risk_trend_read', { traceId, url, merchantId: data.merchantId });

    return NextResponse.json(data, {
        headers: { 'x-trace-id': traceId }
    });
}
