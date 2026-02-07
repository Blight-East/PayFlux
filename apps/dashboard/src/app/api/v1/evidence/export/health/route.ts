import { NextResponse, NextRequest } from 'next/server';
import { RiskIntelligence } from '../../../../../../lib/risk-infra';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

async function isAuthorized(request: NextRequest): Promise<boolean> {
    // 1. Check Browser Session (Clerk)
    const { userId } = await auth();
    if (userId) return true;

    // 2. Check Bearer Token (PAYFLUX_API_KEY or EVIDENCE_SECRET)
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        const key1 = process.env.PAYFLUX_API_KEY?.trim();
        const key2 = process.env.EVIDENCE_SECRET?.trim();
        if ((key1 && token === key1) || (key2 && token === key2)) return true;
    }

    return false;
}

export async function GET(request: NextRequest) {
    if (!(await isAuthorized(request))) {
        return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

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
