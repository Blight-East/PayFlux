import { NextResponse } from 'next/server';
import { RiskIntelligence, RiskLogger } from '../../../../../lib/risk-infra';
import { requireAuth } from '@/lib/require-auth';

export const runtime = "nodejs";

/**
 * GET /api/v1/risk/trend?url=...
 */
export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;

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

    RiskLogger.log('risk_trend_read', { traceId, url, merchantId: data.merchantId });

    return NextResponse.json(data, {
        headers: { 'x-trace-id': traceId }
    });
}
