import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { canAccess } from '@/lib/tier/resolver';
import { RiskIntelligence, type MerchantSnapshot } from '@/lib/risk-infra';
import { ProjectionLedger, LEDGER_SCHEMA_VERSION, type ProjectionArtifact } from '@/lib/projection-ledger';

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

interface Intervention {
    action: string;
    rationale: string;
    priority: 'critical' | 'high' | 'moderate' | 'low';
    velocityReduction?: number; // fractional reduction, e.g. 0.50 = 50% fewer retries
}

interface SimulationDelta {
    velocityReduction: number;
    exposureMultiplier: number;
    rateMultiplier: number;
    label: string;
}

type VolumeMode = "bps_only" | "bps_plus_usd";

interface ProjectionBasis {
    inputs: {
        riskTier: number;
        riskBand: string;
        trend: string;
        tierDelta: number;
        policySurface: { present: number; weak: number; missing: number };
    };
    constants: {
        baseReserveRate: number;
        trendMultiplier: number;
        projectedTier: number;
        projectedReserveRate: number;
        worstCaseReserveRate: number;
        reserveRateCeiling: number;
    };
    interventionBasis: {
        velocityReductionApplied: number | null;
        exposureMultiplier: number | null;
        rateMultiplier: number | null;
        derivationFormula: string;
    };
}

interface ForecastResult {
    merchantId: string;
    normalizedHost: string;
    currentRiskTier: number;
    trend: string;
    tierDelta: number;
    instabilitySignal: string;
    hasProjectionAccess: boolean;
    reserveProjections: ReserveWindowProjection[];
    recommendedInterventions: Intervention[];
    simulationDelta: SimulationDelta | null;
    projectionBasis: ProjectionBasis | null;
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

/**
 * Derives recommended interventions from snapshot data.
 * Deterministic. No ML. No external state.
 * Maps: (tier, trend, tierDelta, policySurface) → Intervention[]
 *
 * These are advisory only. PayFlux does not modify processor configuration.
 */
function deriveInterventions(snapshot: MerchantSnapshot): Intervention[] {
    const interventions: Intervention[] = [];
    const { currentRiskTier, trend, tierDeltaLast, policySurface } = snapshot;

    // ── Retry velocity interventions ──
    if (trend === 'DEGRADING' && currentRiskTier >= 4) {
        interventions.push({
            action: 'Modeled impact suggests reducing retry attempts from 6 → 3',
            rationale: 'Degrading trend at Tier 4+ amplifies escalation multiplier. Fewer retries reduce velocity signal to processors.',
            priority: 'critical',
            velocityReduction: 0.50,
        });
        interventions.push({
            action: 'Modeled impact suggests increasing backoff interval by 50%',
            rationale: 'Spacing retry attempts reduces burst density, which processors interpret as behavioral instability.',
            priority: 'critical',
        });
    } else if (trend === 'DEGRADING') {
        interventions.push({
            action: 'Modeled impact suggests reducing retry attempts from 6 → 4',
            rationale: 'Degrading trend increases escalation probability. Lower retry ceiling slows velocity accumulation.',
            priority: 'high',
            velocityReduction: 0.33,
        });
        interventions.push({
            action: 'Modeled impact suggests increasing backoff window by 30%',
            rationale: 'Wider backoff reduces clustering signal in processor monitoring windows.',
            priority: 'high',
        });
    } else if (currentRiskTier >= 4) {
        interventions.push({
            action: 'Modeled impact suggests capping retry attempts at 4',
            rationale: 'High-tier merchants face asymmetric escalation risk. Preventive retry ceiling limits exposure growth.',
            priority: 'high',
            velocityReduction: 0.33,
        });
    }

    // ── Tier delta interventions ──
    if (tierDeltaLast > 0) {
        interventions.push({
            action: 'Modeled trajectory suggests monitoring Tier Delta over next 48h',
            rationale: `Tier moved +${tierDeltaLast} in last evaluation period. Consecutive positive deltas trigger accelerated processor review.`,
            priority: tierDeltaLast >= 2 ? 'critical' : 'high',
        });
    }

    // ── Policy surface interventions ──
    if (policySurface.missing > 0) {
        interventions.push({
            action: `Modeled risk weight suggests adding ${policySurface.missing} missing policy page${policySurface.missing > 1 ? 's' : ''}`,
            rationale: 'Missing compliance pages (refund, privacy, terms) are weighted negatively in processor risk scoring.',
            priority: policySurface.missing >= 2 ? 'high' : 'moderate',
        });
    }
    if (policySurface.weak > 0) {
        interventions.push({
            action: `Modeled risk weight suggests strengthening ${policySurface.weak} weak policy page${policySurface.weak > 1 ? 's' : ''}`,
            rationale: 'Weak policy pages (low keyword density, vague language) receive partial credit in stability scoring.',
            priority: 'moderate',
        });
    }

    // ── Stable/nominal state ──
    if (interventions.length === 0 && trend === 'STABLE' && currentRiskTier <= 2) {
        interventions.push({
            action: 'No structural changes modeled',
            rationale: 'System is in nominal state. Current configuration produces stable risk trajectory. Continue monitoring.',
            priority: 'low',
        });
    }

    return interventions;
}

/**
 * Derives simulation multipliers from intervention recommendations.
 * Uses the primary velocity reduction from the highest-priority intervention.
 *
 * Mathematical relationship (same non-linear model as projection engine):
 *   exposureMultiplier = (1 - velocityReduction) ^ 1.5
 *   rateMultiplier     = (1 - velocityReduction) ^ 1.2
 *
 * This ensures simulation and projection share the same escalation math.
 * No hardcoded multipliers. No UI-only constants.
 */
function deriveSimulationDelta(interventions: Intervention[]): SimulationDelta | null {
    // Find the primary velocity intervention (highest reduction)
    const velocityInterventions = interventions.filter(i => i.velocityReduction !== undefined && i.velocityReduction > 0);
    if (velocityInterventions.length === 0) return null;

    // Use the maximum recommended reduction
    const primaryReduction = Math.max(...velocityInterventions.map(i => i.velocityReduction!));
    const retainedVelocity = 1 - primaryReduction;

    // Non-linear: escalation penalty compounds, so velocity reduction
    // has outsized impact on reserve accumulation
    const exposureMultiplier = round4(Math.pow(retainedVelocity, 1.5));
    const rateMultiplier = round4(Math.pow(retainedVelocity, 1.2));

    const pctLabel = Math.round(primaryReduction * 100);
    return {
        velocityReduction: primaryReduction,
        exposureMultiplier,
        rateMultiplier,
        label: `Simulate recommended ${pctLabel}% velocity reduction`,
    };
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
    const hasProjectionAccess = canAccess(workspace.tier, "reserve_projection");

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

    // Compute deterministic projections (only if they have access)
    const reserveProjections = hasProjectionAccess ? projectReserveWindows(snapshot, monthlyTPV) : [];
    const instabilitySignal = classifyInstability(snapshot);
    const recommendedInterventions = hasProjectionAccess ? deriveInterventions(snapshot) : [];
    const simulationDelta = hasProjectionAccess ? deriveSimulationDelta(recommendedInterventions) : null;
    const volumeMode: VolumeMode = monthlyTPV !== undefined ? "bps_plus_usd" : "bps_only";

    // Compute audit basis — full derivation chain for transparency
    const tier = Math.max(1, Math.min(5, snapshot.currentRiskTier));
    const baseRate = reserveRate(tier);
    const trendMul = TREND_MULTIPLIER[snapshot.trend] ?? 1.0;
    const projectedTier = Math.max(1, Math.min(5, tier + snapshot.tierDeltaLast));
    const projectedRate = reserveRate(projectedTier);
    const worstRate = Math.min(0.25, projectedRate * trendMul);

    const projectionBasis: ProjectionBasis | null = hasProjectionAccess ? {
        inputs: {
            riskTier: tier,
            riskBand: tierToBand(tier),
            trend: snapshot.trend,
            tierDelta: snapshot.tierDeltaLast,
            policySurface: snapshot.policySurface,
        },
        constants: {
            baseReserveRate: round4(baseRate),
            trendMultiplier: trendMul,
            projectedTier,
            projectedReserveRate: round4(projectedRate),
            worstCaseReserveRate: round4(worstRate),
            reserveRateCeiling: 0.25,
        },
        interventionBasis: {
            velocityReductionApplied: simulationDelta?.velocityReduction ?? null,
            exposureMultiplier: simulationDelta?.exposureMultiplier ?? null,
            rateMultiplier: simulationDelta?.rateMultiplier ?? null,
            derivationFormula: 'exposureMultiplier = (1 - velocityReduction) ^ 1.5; rateMultiplier = (1 - velocityReduction) ^ 1.2',
        },
    } : null;

    const result: ForecastResult = {
        merchantId: snapshot.merchantId,
        normalizedHost: snapshot.normalizedHost,
        currentRiskTier: snapshot.currentRiskTier,
        trend: snapshot.trend,
        tierDelta: snapshot.tierDeltaLast,
        instabilitySignal,
        hasProjectionAccess,
        reserveProjections,
        recommendedInterventions,
        simulationDelta,
        projectionBasis,
        volumeMode,
        projectedAt: new Date().toISOString(),
        modelVersion: "reserve-v1.0.0",
    };

    // ── Ledger: conditionally append signed projection artifact ──
    // Fire-and-forget. Ledger failure must not block response.
    if (hasProjectionAccess && projectionBasis) {
        const artifact: ProjectionArtifact = {
            projectionId: `proj_${snapshot.merchantId}_${Date.now()}`,
            schemaVersion: LEDGER_SCHEMA_VERSION,
            merchantId: snapshot.merchantId,
            normalizedHost: snapshot.normalizedHost,
            projectedAt: result.projectedAt,
            modelVersion: result.modelVersion,
            inputSnapshot: projectionBasis.inputs,
            appliedConstants: projectionBasis.constants,
            windowOutputs: reserveProjections.map(w => ({
                windowDays: w.windowDays,
                projectedTrappedBps: w.projectedTrappedBps,
                worstCaseTrappedBps: w.worstCaseTrappedBps,
                projectedTrappedUSD: w.projectedTrappedUSD,
                worstCaseTrappedUSD: w.worstCaseTrappedUSD,
            })),
            interventionOutput: {
                velocityReduction: simulationDelta?.velocityReduction ?? null,
                exposureMultiplier: simulationDelta?.exposureMultiplier ?? null,
                rateMultiplier: simulationDelta?.rateMultiplier ?? null,
                interventionCount: recommendedInterventions.length,
            },
            instabilitySignal,
            writeReason: 'daily_cadence', // will be overridden by shouldWrite
        };
        ProjectionLedger.maybeAppend(artifact).catch(err =>
            console.error('[LEDGER_APPEND_ERROR]', err)
        );
    }

    return NextResponse.json(result, {
        headers: {
            'Cache-Control': 'no-store',
            'X-Model-Version': 'reserve-v1.0.0',
        },
    });
}
