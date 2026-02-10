import { NextResponse } from 'next/server';
import { RiskMetrics } from '../../../../../lib/risk-infra';
import { requireAuth } from '@/lib/require-auth';

export const runtime = "nodejs";

/**
 * GET /api/v1/risk/health
 * Returns operational telemetry for the Risk API.
 */
export async function GET() {
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;

    return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        metrics: RiskMetrics.snapshot(),
        uptime: process.uptime()
    });
}
