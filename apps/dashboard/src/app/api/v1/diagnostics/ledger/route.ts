import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { RiskIntelligence } from '@/lib/risk-infra';
import { ProjectionLedger, LedgerMetrics } from '@/lib/projection-ledger';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/diagnostics/ledger
 *
 * Ledger write status and health diagnostics.
 * Shows: last projection timestamp, write/skip/failure counts,
 * signature status, per-merchant history depth.
 *
 * Requires Clerk auth (any tier — operational transparency).
 */
export async function GET() {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;

    const snapshots = await RiskIntelligence.getAllSnapshots();

    const merchantStatus: {
        merchantId: string;
        host: string;
        ledgerDepth: number;
        lastProjectedAt: string | null;
        lastWriteReason: string | null;
        lastSignaturePresent: boolean | null;
        lastHashValid: boolean | null;
        lastSignatureValid: boolean | null;
    }[] = [];

    let globalLastProjectedAt: string | null = null;
    let globalLastSignaturePresent: boolean | null = null;
    let totalLedgerEntries = 0;

    for (const snapshot of snapshots) {
        try {
            const history = await ProjectionLedger.getHistory(snapshot.merchantId, 5);
            const latest = history[0] ?? null;

            const lastProjectedAt = latest?.artifact.projectedAt ?? null;
            const lastWriteReason = latest?.artifact.writeReason ?? null;
            const lastSignaturePresent = latest?.integrity.signature !== null && latest?.integrity.signature !== undefined
                ? true
                : latest ? false : null;
            const lastHashValid = latest?.verification.hashValid ?? null;
            const lastSignatureValid = latest?.verification.signatureValid ?? null;

            merchantStatus.push({
                merchantId: snapshot.merchantId,
                host: snapshot.normalizedHost,
                ledgerDepth: history.length,
                lastProjectedAt,
                lastWriteReason,
                lastSignaturePresent,
                lastHashValid,
                lastSignatureValid,
            });

            totalLedgerEntries += history.length;

            // Track global latest
            if (lastProjectedAt && (!globalLastProjectedAt || lastProjectedAt > globalLastProjectedAt)) {
                globalLastProjectedAt = lastProjectedAt;
                globalLastSignaturePresent = lastSignaturePresent;
            }
        } catch {
            merchantStatus.push({
                merchantId: snapshot.merchantId,
                host: snapshot.normalizedHost,
                ledgerDepth: 0,
                lastProjectedAt: null,
                lastWriteReason: null,
                lastSignaturePresent: null,
                lastHashValid: null,
                lastSignatureValid: null,
            });
        }
    }

    // Process-level metrics (resets on cold start, but useful for burst diagnostics)
    const metrics = LedgerMetrics.get();
    const failureRate = LedgerMetrics.failureRate();

    const hasEvidenceSecret = !!process.env.EVIDENCE_SECRET;
    const hasUpstashUrl = !!process.env.UPSTASH_REDIS_REST_URL;
    const hasUpstashToken = !!process.env.UPSTASH_REDIS_REST_TOKEN;
    const storeType = RiskIntelligence.getStoreType();

    return NextResponse.json({
        status: hasUpstashUrl && hasUpstashToken && hasEvidenceSecret ? 'OPERATIONAL' : 'DEGRADED',
        infrastructure: {
            upstashConfigured: hasUpstashUrl && hasUpstashToken,
            evidenceSecretConfigured: hasEvidenceSecret,
            riskStoreType: storeType,
        },
        ledger: {
            totalMerchants: snapshots.length,
            totalLedgerEntries,
            lastProjectedAt: globalLastProjectedAt,
            lastSignaturePresent: globalLastSignaturePresent,
            processMetrics: {
                writes: metrics.writes,
                skips: metrics.skips,
                failures: metrics.failures,
                failureRate: round3(failureRate),
            },
        },
        merchants: merchantStatus,
        generatedAt: new Date().toISOString(),
    }, {
        headers: { 'Cache-Control': 'no-store' },
    });
}

function round3(n: number): number {
    return Math.round(n * 1000) / 1000;
}
