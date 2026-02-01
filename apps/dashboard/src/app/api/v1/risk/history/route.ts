import { NextResponse } from 'next/server';
import { RiskIntelligence, RiskLogger } from '../../../../../lib/risk-infra';

export const runtime = "nodejs";

/**
 * GET /api/v1/risk/history?url=...
 */
export async function GET(request: Request) {
    const traceId = crypto.randomUUID();
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400, headers: { 'x-trace-id': traceId } });
    }

    const data = await RiskIntelligence.getHistory(url);

    RiskLogger.log('risk_history_read', { traceId, url, merchantId: data.merchantId });

    return NextResponse.json(data, {
        headers: { 'x-trace-id': traceId }
    });
}
