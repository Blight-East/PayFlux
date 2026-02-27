import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { canAccess } from '@/lib/tier/resolver';
import { RiskIntelligence } from '@/lib/risk-infra';
import { ProjectionLedger } from '@/lib/projection-ledger';

export const runtime = "nodejs";

/**
 * GET /api/v1/risk/forecast/history?host=...&limit=50
 *
 * Returns the signed projection ledger for a merchant.
 * Each record includes:
 *   - The immutable projection artifact
 *   - Integrity hash and HMAC signature
 *   - Read-time verification status
 *   - Accuracy comparison against current state
 *
 * Records are never modified. Verification is computed at read-time.
 * Accuracy is derived by comparing historical projections against subsequent observed state.
 *
 * Gated: requires projection access (Pro+ only).
 */
export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;

    const { workspace } = authResult;
    if (!canAccess(workspace.tier, "reserve_projection")) {
        return NextResponse.json(
            { error: 'Projection history requires Pro tier', code: 'UPGRADE_REQUIRED' },
            { status: 402 }
        );
    }

    const { searchParams } = new URL(request.url);
    const host = searchParams.get('host');

    if (!host) {
        return NextResponse.json(
            { error: 'Missing host parameter', code: 'INVALID_REQUEST' },
            { status: 400 }
        );
    }

    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50));

    // Resolve merchant ID from host
    const snapshots = await RiskIntelligence.getAllSnapshots();
    const snapshot = snapshots.find(s => s.normalizedHost === host.toLowerCase());

    if (!snapshot) {
        return NextResponse.json(
            { error: 'No risk data for host', code: 'MERCHANT_NOT_FOUND' },
            { status: 404 }
        );
    }

    // Read and verify ledger
    const history = await ProjectionLedger.getHistory(snapshot.merchantId, limit);

    // Derive accuracy comparison against current live state
    const accuracy = ProjectionLedger.deriveAccuracy(history, {
        riskTier: snapshot.currentRiskTier,
        trend: snapshot.trend,
        tierDelta: snapshot.tierDeltaLast,
    });

    return NextResponse.json({
        merchantId: snapshot.merchantId,
        normalizedHost: snapshot.normalizedHost,
        totalRecords: history.length,
        accuracy,
        records: history,
        retrievedAt: new Date().toISOString(),
    }, {
        headers: {
            'Cache-Control': 'no-store',
        },
    });
}
