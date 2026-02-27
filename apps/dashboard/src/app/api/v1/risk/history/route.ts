import { NextResponse } from 'next/server';
import { RiskIntelligence, RiskLogger } from '../../../../../lib/risk-infra';
import { requireAuth } from '@/lib/require-auth';

export const runtime = "nodejs";

/**
 * GET /api/v1/risk/history?url=...
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

    const data = await RiskIntelligence.getHistory(url);

    // 1. Enforce tier retention boundaries (server-side limits)
    const retentionDays = workspace.tier === 'enterprise' ? 90 : workspace.tier === 'pro' ? 30 : 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffIso = cutoffDate.toISOString();

    const filteredScans = data.scans.filter(scan => scan.createdAt >= cutoffIso);
    data.scans = filteredScans;

    RiskLogger.log('risk_history_read', { traceId, url, merchantId: data.merchantId, retained: filteredScans.length, original: data.scans.length });

    return NextResponse.json(data, {
        headers: { 'x-trace-id': traceId }
    });
}
