import { NextResponse } from 'next/server';
import { RiskIntelligence, type MerchantSnapshot } from '@/lib/risk-infra';
import { ProjectionLedger, LEDGER_SCHEMA_VERSION, type ProjectionArtifact } from '@/lib/projection-ledger';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// Projection Cadence Cron Handler
//
// Secured by CRON_SECRET (not Clerk). Called by Netlify scheduled function.
// Iterates all active merchants, computes projections, writes to ledger.
//
// Same deterministic math as /api/v1/risk/forecast — extracted inline
// to avoid circular dependency on auth layer.
// ─────────────────────────────────────────────────────────────────────────────

const RESERVE_WINDOWS = [90, 120, 180] as const;

const RESERVE_RATE_BY_TIER: Record<number, number> = {
    1: 0.00, 2: 0.05, 3: 0.10, 4: 0.15, 5: 0.25,
};

const TREND_MULTIPLIER: Record<string, number> = {
    DEGRADING: 1.5, STABLE: 1.0, IMPROVING: 0.75,
};

function reserveRate(tier: number): number {
    const rate = RESERVE_RATE_BY_TIER[tier];
    if (rate === undefined) return 0;
    return Math.min(0.25, Math.max(0, rate));
}

function round4(n: number): number {
    return Math.round(n * 10000) / 10000;
}

function tierToBand(tier: number): string {
    const bands: Record<number, string> = {
        1: "LOW", 2: "MODERATE", 3: "ELEVATED", 4: "HIGH", 5: "CRITICAL",
    };
    return bands[tier] ?? "UNKNOWN";
}

function classifyInstability(snapshot: MerchantSnapshot): string {
    const { trend, tierDeltaLast, currentRiskTier, policySurface } = snapshot;
    if (trend === "DEGRADING" && tierDeltaLast > 0 && policySurface.missing > 0) return "ACCELERATING";
    if (trend === "DEGRADING" || tierDeltaLast > 0) return "ELEVATED";
    if (currentRiskTier >= 4 && trend === "STABLE") return "LATENT";
    if (trend === "IMPROVING" && tierDeltaLast < 0) return "RECOVERING";
    return "NOMINAL";
}

function projectForSnapshot(snapshot: MerchantSnapshot): ProjectionArtifact {
    const tier = Math.max(1, Math.min(5, snapshot.currentRiskTier));
    const baseRate = reserveRate(tier);
    const trendMul = TREND_MULTIPLIER[snapshot.trend] ?? 1.0;
    const projectedTier = Math.max(1, Math.min(5, tier + snapshot.tierDeltaLast));
    const projectedRate = reserveRate(projectedTier);
    const worstRate = Math.min(0.25, projectedRate * trendMul);

    const windowOutputs = RESERVE_WINDOWS.map((windowDays) => {
        const windowFactor = windowDays / 30;
        return {
            windowDays,
            projectedTrappedBps: Math.round(baseRate * windowFactor * 10000),
            worstCaseTrappedBps: Math.round(worstRate * windowFactor * 10000),
        };
    });

    // Derive velocity reduction from snapshot
    let velocityReduction: number | null = null;
    let interventionCount = 0;

    if (snapshot.trend === 'DEGRADING' && snapshot.currentRiskTier >= 4) {
        velocityReduction = 0.50;
        interventionCount = 5;
    } else if (snapshot.trend === 'DEGRADING') {
        velocityReduction = 0.33;
        interventionCount = 4;
    } else if (snapshot.currentRiskTier >= 4) {
        velocityReduction = 0.33;
        interventionCount = 2;
    }

    const exposureMultiplier = velocityReduction !== null
        ? round4(Math.pow(1 - velocityReduction, 1.5))
        : null;
    const rateMultiplier = velocityReduction !== null
        ? round4(Math.pow(1 - velocityReduction, 1.2))
        : null;

    const instabilitySignal = classifyInstability(snapshot);

    return {
        projectionId: `proj_${snapshot.merchantId}_${Date.now()}`,
        schemaVersion: LEDGER_SCHEMA_VERSION,
        merchantId: snapshot.merchantId,
        normalizedHost: snapshot.normalizedHost,
        projectedAt: new Date().toISOString(),
        modelVersion: "reserve-v1.0.0",
        inputSnapshot: {
            riskTier: tier,
            riskBand: tierToBand(tier),
            trend: snapshot.trend,
            tierDelta: snapshot.tierDeltaLast,
            policySurface: snapshot.policySurface,
        },
        appliedConstants: {
            baseReserveRate: round4(baseRate),
            trendMultiplier: trendMul,
            projectedTier,
            projectedReserveRate: round4(projectedRate),
            worstCaseReserveRate: round4(worstRate),
            reserveRateCeiling: 0.25,
        },
        windowOutputs,
        interventionOutput: {
            velocityReduction,
            exposureMultiplier,
            rateMultiplier,
            interventionCount,
        },
        instabilitySignal,
        writeReason: 'daily_cadence',
    };
}

export async function POST(request: Request) {
    // Auth: CRON_SECRET only — not Clerk
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return NextResponse.json({ error: 'CRON_SECRET_NOT_CONFIGURED' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const startTime = Date.now();
    const results: { merchantId: string; host: string; written: boolean; skipped: boolean; error: string | null }[] = [];

    try {
        const snapshots = await RiskIntelligence.getAllSnapshots();

        for (const snapshot of snapshots) {
            try {
                const artifact = projectForSnapshot(snapshot);
                const record = await ProjectionLedger.maybeAppend(artifact);

                results.push({
                    merchantId: snapshot.merchantId,
                    host: snapshot.normalizedHost,
                    written: record !== null,
                    skipped: record === null,
                    error: null,
                });
            } catch (err) {
                results.push({
                    merchantId: snapshot.merchantId,
                    host: snapshot.normalizedHost,
                    written: false,
                    skipped: false,
                    error: (err as Error).message,
                });
            }
        }
    } catch (err) {
        return NextResponse.json({
            status: 'ERROR',
            error: (err as Error).message,
            durationMs: Date.now() - startTime,
        }, { status: 500 });
    }

    const written = results.filter(r => r.written).length;
    const skipped = results.filter(r => r.skipped).length;
    const failed = results.filter(r => r.error !== null).length;

    return NextResponse.json({
        status: 'OK',
        merchants: results.length,
        written,
        skipped,
        failed,
        durationMs: Date.now() - startTime,
        results,
    });
}
