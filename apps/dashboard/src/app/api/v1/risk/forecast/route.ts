import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { canAccess } from '@/lib/tier/resolver';
import { RiskIntelligence, type MerchantSnapshot } from '@/lib/risk-infra';

export const runtime = "nodejs";

// ─────────────────────────────────────────────────────────────────────────────
// Reserve Projection Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Rolling reserve windows processors commonly impose (days) */
const RESERVE_WINDOWS = [90, 120, 180] as const;

/**
 * Maps risk tier (1-5) to estimated reserve hold percentage.
 * Based on observed processor behavior for high-risk merchants.
 *
 * Tier 1 (LOW)      → 0%   (no reserve)
 * Tier 2 (MODERATE) → 5%   (light reserve)
 * Tier 3 (ELEVATED) → 10%  (standard reserve)
 * Tier 4 (HIGH)     → 15%  (heavy reserve)
 * Tier 5 (CRITICAL) → 25%  (maximum reserve / potential freeze)
 */
const RESERVE_RATE_BY_TIER: Record<number, number> = {
    1: 0.00,
    2: 0.05,
    3: 0.10,
    4: 0.15,
    5: 0.25,
};

/**
 * Trend multiplier for worst-case projection.
 * Degrading trend increases projected exposure.
 * Improving trend reduces it (but never to zero).
 */
const TREND_MULTIPLIER: Record<string, number> = {
    DEGRADING: 1.5,
    STABLE: 1.0,
    IMPROVING: 0.75,
};

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic Reserve Projection Engine
// ─────────────────────────────────────────────────────────────────────────────

/** Maximum monthlyTPV accepted (sanity guard against overflow) */
const MAX_MONTHLY_TPV = 1e10; // $10B

interface ReserveWindowProjection {
    windowDays: number;
    baseReserveRate: number;
    worstCaseReserveRate: number;
    projectedTrappedBps: number;
    worstCaseTrappedBps: number;
    projectedTrappedUSD?: number;
    worstCaseTrappedUSD?: number;
    riskBand: string;
}

type VolumeMode = "bps_only" | "bps_plus_usd";

interface ForecastResult {
    merchantId: string;
    normalizedHost: string;
    currentRiskTier: number;
    trend: string;
    tierDelta: number;
    reserveProjections: ReserveWindowProjection[];
    instabilitySignal: string;
    volumeMode: VolumeMode;
    projectedAt: string;
    modelVersion: string;
}

/**
 * Maps numeric risk tier to band label.
 * Deterministic, no external state.
 */
function tierToBand(tier: number): string {
    const bands: Record<number, string> = {
        1: "LOW",
        2: "MODERATE",
        3: "ELEVATED",
        4: "HIGH",
        5: "CRITICAL",
    };
    return bands[tier] ?? "UNKNOWN";
}

/**
 * Computes bounded reserve rate for a given tier.
 * Clamped to [0, 0.25]. Pure function.
 */
function reserveRate(tier: number): number {
    const rate = RESERVE_RATE_BY_TIER[tier];
    if (rate === undefined) return 0;
    return Math.min(0.25, Math.max(0, rate));
}

/**
 * Projects reserve exposure across standard windows.
 *
 * All math is:
 * - Deterministic (same input → same output)
 * - Bounded (rates clamped, no unbounded growth)
 * - Explainable (base × window factor × trend multiplier)
 *
 * Output is in basis points (bps) of monthly TPV.
 * 10000 bps = 100% of monthly TPV trapped.
 */
function projectReserveWindows(snapshot: MerchantSnapshot, monthlyTPV?: number): ReserveWindowProjection[] {
    const tier = Math.max(1, Math.min(5, snapshot.currentRiskTier));
    const baseRate = reserveRate(tier);
    const trendMul = TREND_MULTIPLIER[snapshot.trend] ?? 1.0;

    // Project what tier might become if trend continues
    const projectedTier = Math.max(1, Math.min(5, tier + snapshot.tierDeltaLast));
    const projectedRate = reserveRate(projectedTier);

    // Worst case: projected rate amplified by trend
    const worstRate = Math.min(0.25, projectedRate * trendMul);

    return RESERVE_WINDOWS.map((windowDays) => {
        // Window factor: longer reserves trap proportionally more cash
        // 90 days ≈ 3 months of TPV exposure, 180 days ≈ 6 months
        const windowFactor = windowDays / 30;

        const projectedBps = Math.round(baseRate * windowFactor * 10000);
        const worstBps = Math.round(worstRate * windowFactor * 10000);

        const projection: ReserveWindowProjection = {
            windowDays,
            baseReserveRate: round4(baseRate),
            worstCaseReserveRate: round4(worstRate),
            projectedTrappedBps: projectedBps,
            worstCaseTrappedBps: worstBps,
            riskBand: tierToBand(tier),
        };

        // USD fields: only present when monthlyTPV supplied. Never null, never zero-filled.
        if (monthlyTPV !== undefined) {
            projection.projectedTrappedUSD = Math.round(monthlyTPV * (projectedBps / 10000));
            projection.worstCaseTrappedUSD = Math.round(monthlyTPV * (worstBps / 10000));
        }

        return projection;
    });
}

/**
 * Determines instability signal from snapshot data.
 * Deterministic classification, no ML.
 */
function classifyInstability(snapshot: MerchantSnapshot): string {
    const { trend, tierDeltaLast, currentRiskTier, policySurface } = snapshot;

    // Accelerating instability: degrading + tier climbing + weak policy surface
    if (trend === "DEGRADING" && tierDeltaLast > 0 && policySurface.missing > 0) {
        return "ACCELERATING";
    }

    // Elevated instability: degrading OR tier climbing
    if (trend === "DEGRADING" || tierDeltaLast > 0) {
        return "ELEVATED";
    }

    // Latent instability: high tier even if stable
    if (currentRiskTier >= 4 && trend === "STABLE") {
        return "LATENT";
    }

    // Recovering: improving with positive delta history
    if (trend === "IMPROVING" && tierDeltaLast < 0) {
        return "RECOVERING";
    }

    return "NOMINAL";
}

/** Round to 4 decimal places. Pure. */
function round4(n: number): number {
    return Math.round(n * 10000) / 10000;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route Handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/risk/forecast?host=...&monthlyTPV=...
 *
 * Deterministic reserve projection endpoint.
 * Gated behind FeatureReserveProjection (Pro+ only).
 *
 * Inputs: MerchantSnapshot from RiskIntelligence store.
 * Optional: monthlyTPV (number) — merchant-supplied monthly volume.
 *           When provided, USD exposure fields are included.
 *           Never logged. Never persisted. Never forwarded.
 * Outputs: Bounded reserve window projections + instability signal.
 *
 * All outputs are projections, not certainties.
 * No freeze-prevention guarantees.
 */
export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;

    const { workspace } = authResult;

    // Gate: FeatureReserveProjection requires Pro or Enterprise
    if (!canAccess(workspace.tier, "reserve_projection")) {
        return NextResponse.json(
            { error: 'Forbidden', code: 'TIER_INSUFFICIENT', requiredFeature: 'reserve_projection' },
            { status: 403 }
        );
    }

    // Parse parameters
    const { searchParams } = new URL(request.url);
    const host = searchParams.get('host');

    if (!host) {
        return NextResponse.json(
            { error: 'Missing host parameter', code: 'INVALID_REQUEST' },
            { status: 400 }
        );
    }

    // Optional: monthlyTPV — merchant-supplied, never logged, never persisted
    let monthlyTPV: number | undefined;
    const rawTPV = searchParams.get('monthlyTPV');
    if (rawTPV !== null) {
        const parsed = Number(rawTPV);
        if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_MONTHLY_TPV) {
            return NextResponse.json(
                { error: 'Invalid monthlyTPV: must be a number between 0 and 10000000000', code: 'INVALID_REQUEST' },
                { status: 400 }
            );
        }
        monthlyTPV = parsed;
    }

    // Resolve merchant snapshot from RiskIntelligence store
    const snapshots = await RiskIntelligence.getAllSnapshots();
    const snapshot = snapshots.find(
        (s) => s.normalizedHost === host.toLowerCase()
    );

    if (!snapshot) {
        return NextResponse.json(
            { error: 'No risk data for host', code: 'MERCHANT_NOT_FOUND' },
            { status: 404 }
        );
    }

    // Compute deterministic projections
    const reserveProjections = projectReserveWindows(snapshot, monthlyTPV);
    const instabilitySignal = classifyInstability(snapshot);
    const volumeMode: VolumeMode = monthlyTPV !== undefined ? "bps_plus_usd" : "bps_only";

    const result: ForecastResult = {
        merchantId: snapshot.merchantId,
        normalizedHost: snapshot.normalizedHost,
        currentRiskTier: snapshot.currentRiskTier,
        trend: snapshot.trend,
        tierDelta: snapshot.tierDeltaLast,
        reserveProjections,
        instabilitySignal,
        volumeMode,
        projectedAt: new Date().toISOString(),
        modelVersion: "reserve-v1.0.0",
    };

    return NextResponse.json(result, {
        headers: {
            'Cache-Control': 'no-store',
            'X-Model-Version': 'reserve-v1.0.0',
        },
    });
}
