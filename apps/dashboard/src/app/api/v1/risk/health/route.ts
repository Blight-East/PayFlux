import { NextResponse } from 'next/server';
import { RiskMetrics } from '../../../../../lib/risk-infra';

export const runtime = "nodejs";

/**
 * GET /api/v1/risk/health
 * Returns operational telemetry for the Risk API.
 */
export async function GET() {
    return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        metrics: RiskMetrics.snapshot(),
        uptime: process.uptime()
    });
}
