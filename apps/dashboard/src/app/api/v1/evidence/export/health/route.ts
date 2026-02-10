import { NextResponse, NextRequest } from 'next/server';
import { RiskIntelligence } from '../../../../../../lib/risk-infra';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

import { requireAuth } from '@/lib/require-auth';

export async function GET(request: NextRequest) {
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;

    const reports = await RiskIntelligence.getAllReports();
    const snapshots = await RiskIntelligence.getAllSnapshots();
    const isProduction = process.env.NODE_ENV === 'production';
    const hasRedis = !!(process.env.RISK_REDIS_URL && process.env.RISK_REDIS_TOKEN);

    return NextResponse.json({
        reportsCount: reports.length,
        snapshotsCount: snapshots.length,
        isProduction,
        hasRedis,
        storeType: RiskIntelligence.getStoreType(),
        sourceMode: (reports.length === 0 && snapshots.length === 0 && !isProduction) ? 'development_mock' : 'persistent_store',
        timestamp: new Date().toISOString()
    });
}
