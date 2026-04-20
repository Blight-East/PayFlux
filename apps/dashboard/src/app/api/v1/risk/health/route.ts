import { NextResponse } from 'next/server';
import { RiskMetrics } from '../../../../../lib/risk-infra';
import { requirePaidAuth } from '@/lib/require-auth';

export const runtime = "nodejs";

/**
 * GET /api/v1/risk/health
 * Returns operational telemetry for the Risk API.
 */
export async function GET() {
    const authResult = await requirePaidAuth();
    if (!authResult.ok) return authResult.response;

    const { userId, workspace } = authResult;

    return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        metrics: RiskMetrics.snapshot(),
        uptime: process.uptime()
    });
}
