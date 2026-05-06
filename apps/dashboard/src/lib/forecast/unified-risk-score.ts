/**
 * Unified Risk Score — v1
 *
 * Single deterministic pipeline that produces all projection windows.
 * No secondary model sources. No recomputation layers.
 *
 * Rule: every UI element (T30 / T60 / T90 / locked panels) originates
 * from ONE call to computeUnifiedForecast().
 */

// ─────────────────────────────────────────────────────────────────────────────
// Version-locked weight vector
// DO NOT change these without incrementing MODEL_VERSION.
// When refund data becomes available, add refund weight and adjust others
// under a new MODEL_VERSION string.
// ─────────────────────────────────────────────────────────────────────────────

const MODEL_VERSION = 'unified-v1.0';

const WEIGHTS = {
    dispute: 0.5,
    refund: 0.0,       // No refund column in stripe_financials yet
    payoutDelay: 0.25,
    balancePressure: 0.25,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type RiskSignal = 'NOMINAL' | 'LATENT' | 'ELEVATED' | 'ACCELERATING';

export interface RiskDriver {
    label: string;
    impact: 'high' | 'medium' | 'low';
    value: number;
}

export interface ProjectionWindow {
    windowDays: number;
    capitalAtRiskCents: number;
    capitalAtRiskCentsMin: number;
    capitalAtRiskCentsMax: number;
    displayMode: 'range' | 'point';
    reserveRateBps: number;
    riskBand: string;
}

export interface UnifiedForecast {
    schemaVersion: 'v3';
    observedSignals: {
        pendingBalanceCents: number;
        totalVolume30dCents: number;
        disputeCount30d: number;
        avgPayoutDelayDays: number | null;
    };
    derivedSignals: {
        riskScore: number;
        riskSignal: RiskSignal;
        confidenceBand: 'LOW' | 'MEDIUM' | 'HIGH';
        dataCompletenessScore: number;
        rBase: number;
        disputeRatio: number;
        refundRatio: number;
        payoutDelayFactor: number;
        balancePressure: number;
        volatilityScore: number;
        multiplier: number;
        growthFactor: number;
        transactionCount30d: number;
        drivers: RiskDriver[];
    };
    modeledProjections: {
        modelVersion: string;
        windows: [ProjectionWindow, ProjectionWindow, ProjectionWindow];
    };
}

export interface StripeFinancialsInput {
    pending_balance: number;       // cents
    total_volume_30d: number;      // cents
    dispute_count_30d: number;
    avg_payout_delay_days: number | null;
    fetched_at?: string;           // Used for freshness completeness
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
    if (val < min) return min;
    if (val > max) return max;
    return val;
}

function safeNum(val: unknown): number {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature extraction
// ─────────────────────────────────────────────────────────────────────────────

function computeDisputeRatio(disputeCount: number, totalVolumeCents: number): number {
    // Derive approximate transaction count from volume.
    // Fallback average ticket: $50 (5000 cents).
    const avgTicketCents = 5000;
    const txCount = totalVolumeCents > 0 ? Math.max(1, totalVolumeCents / avgTicketCents) : 1;
    if (disputeCount <= 0) return 0;
    return clamp(disputeCount / txCount, 0, 1);
}

function computePayoutDelayFactor(avgDelayDays: number | null): number {
    const d = safeNum(avgDelayDays);
    if (d < 2) return 0;
    if (d <= 5) return 0.5;
    return 1;
}

function computeBalancePressure(pendingCents: number, volumeCents: number): number {
    if (volumeCents <= 0) return pendingCents > 0 ? 1 : 0;
    return clamp(pendingCents / volumeCents, 0, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Signal mapping
// ─────────────────────────────────────────────────────────────────────────────

function mapRiskSignal(r: number): RiskSignal {
    if (r < 0.15) return 'NOMINAL';
    if (r < 0.35) return 'LATENT';
    if (r < 0.60) return 'ELEVATED';
    return 'ACCELERATING';
}

function mapRiskBand(r: number): string {
    if (r < 0.15) return 'Low';
    if (r < 0.35) return 'Moderate';
    if (r < 0.60) return 'High';
    return 'Critical';
}

// ─────────────────────────────────────────────────────────────────────────────
// Driver extraction
// ─────────────────────────────────────────────────────────────────────────────

function extractDrivers(
    disputeRatio: number,
    payoutDelayFactor: number,
    balancePressure: number,
): RiskDriver[] {
    const drivers: RiskDriver[] = [];

    if (disputeRatio > 0.01) {
        drivers.push({
            label: disputeRatio > 0.05 ? 'Elevated dispute rate' : 'Dispute activity detected',
            impact: disputeRatio > 0.05 ? 'high' : disputeRatio > 0.02 ? 'medium' : 'low',
            value: disputeRatio,
        });
    }

    if (payoutDelayFactor > 0) {
        drivers.push({
            label: payoutDelayFactor >= 1 ? 'Significant payout delays' : 'Payout delays increasing',
            impact: payoutDelayFactor >= 1 ? 'high' : 'medium',
            value: payoutDelayFactor,
        });
    }

    if (balancePressure > 0.1) {
        drivers.push({
            label: balancePressure > 0.5 ? 'High pending balance relative to volume' : 'Elevated pending balance',
            impact: balancePressure > 0.5 ? 'high' : 'medium',
            value: balancePressure,
        });
    }

    if (drivers.length === 0) {
        drivers.push({
            label: 'No significant risk indicators',
            impact: 'low',
            value: 0,
        });
    }

    return drivers;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core computation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * computeUnifiedForecast produces all projection windows from a single
 * deterministic computation. No secondary model sources. No recomputation.
 *
 * @param financials - Raw Stripe financials (cents-denominated)
 * @param volatilityScore - Optional enrichment from Go backend (0–1). Default 0.
 *                          Never required for correctness. Never blocks.
 */
export function computeUnifiedForecast(
    financials: StripeFinancialsInput,
    volatilityScore: number = 0,
): UnifiedForecast {
    // Safe extraction — never throw on bad input
    const pendingBalance = Math.max(0, safeNum(financials.pending_balance));
    const totalVolume = Math.max(0, safeNum(financials.total_volume_30d));
    const disputeCount = Math.max(0, safeNum(financials.dispute_count_30d));
    const avgDelay = financials.avg_payout_delay_days;

    // Feature computation
    const disputeRatio = computeDisputeRatio(disputeCount, totalVolume);
    const refundRatio = 0; // No refund data yet
    const payoutDelayFactor = computePayoutDelayFactor(avgDelay);
    const balancePressure = computeBalancePressure(pendingBalance, totalVolume);

    // Weighted risk score
    const rBase =
        WEIGHTS.dispute * disputeRatio +
        WEIGHTS.refund * refundRatio +
        WEIGHTS.payoutDelay * payoutDelayFactor +
        WEIGHTS.balancePressure * balancePressure;

    // Volatility modulation — optional enrichment only
    const safeVolatility = clamp(safeNum(volatilityScore), 0, 1);
    const r = clamp(rBase * (1 + safeVolatility), 0, 1);

    // Projection curve — single source of truth
    const multiplier = 0.02 + (r * 0.18);
    const baseCents = Math.round(pendingBalance * multiplier);
    const growthFactor = 1 + (r * 0.5);

    const t30 = baseCents;
    const t60Raw = Math.round(baseCents * growthFactor);
    const t90Raw = Math.round(baseCents * growthFactor * growthFactor);

    // HARD RULE: T90 >= T60 >= T30 — clamp correction, never different formula
    const t60 = Math.max(t60Raw, t30);
    const t90 = Math.max(t90Raw, t60);

    // Derive transaction count for basis reporting
    const avgTicketCents = 5000;
    const txCount = totalVolume > 0 ? Math.max(1, Math.round(totalVolume / avgTicketCents)) : 0;

    const riskBand = mapRiskBand(r);
    const reserveRateBps = Math.round(multiplier * 10000);

    // Data Completeness Layer
    let dataCompletenessScore = 0.0;
    
    // 1. Dispute data present (High signal)
    const hasDisputesData = financials.dispute_count_30d !== null && financials.dispute_count_30d !== undefined;
    if (hasDisputesData) dataCompletenessScore += 0.35;
    
    // 2. Real transaction count
    const isTxCountReal = false; // Always fallback currently
    if (isTxCountReal) dataCompletenessScore += 0.25;

    // 3. Freshness < 24h
    let ageHours = 24;
    if (financials.fetched_at) {
        ageHours = (Date.now() - new Date(financials.fetched_at).getTime()) / (1000 * 60 * 60);
    }
    if (ageHours < 24) dataCompletenessScore += 0.25;

    // 4. Volume > $10k (1,000,000 cents)
    if (totalVolume > 1000000) dataCompletenessScore += 0.15;

    // Hard gate: Cap completeness if high-signal dispute data is entirely missing
    if (!hasDisputesData) {
        dataCompletenessScore = Math.min(dataCompletenessScore, 0.60);
    }

    let confidenceBand: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (dataCompletenessScore >= 0.8) confidenceBand = 'HIGH';
    else if (dataCompletenessScore >= 0.5) confidenceBand = 'MEDIUM';

    // Uncertainty Shaping
    const baseUncertainty = 0.5;
    const rawUncertainty = baseUncertainty * (1 - dataCompletenessScore);
    const uncertainty = clamp(rawUncertainty, 0.05, 0.40); // Hard clamp between 5% and 40%
    const displayMode = confidenceBand === 'HIGH' ? 'point' : 'range';

    const buildWindow = (days: number, baseAmt: number): ProjectionWindow => ({
        windowDays: days,
        capitalAtRiskCents: baseAmt,
        capitalAtRiskCentsMin: Math.round(baseAmt * (1 - uncertainty)),
        capitalAtRiskCentsMax: Math.round(baseAmt * (1 + uncertainty)),
        displayMode,
        reserveRateBps: Math.round((baseAmt / (pendingBalance || 1)) * 10000),
        riskBand,
    });

    return {
        schemaVersion: 'v3',
        observedSignals: {
            pendingBalanceCents: pendingBalance,
            totalVolume30dCents: totalVolume,
            disputeCount30d: disputeCount,
            avgPayoutDelayDays: avgDelay,
        },
        derivedSignals: {
            riskScore: Math.round(r * 1000) / 1000,
            riskSignal: mapRiskSignal(r),
            confidenceBand,
            dataCompletenessScore: Math.round(dataCompletenessScore * 100) / 100,
            rBase: Math.round(rBase * 1000) / 1000,
            disputeRatio: Math.round(disputeRatio * 10000) / 10000,
            refundRatio: 0,
            payoutDelayFactor,
            balancePressure: Math.round(balancePressure * 10000) / 10000,
            volatilityScore: safeVolatility,
            multiplier: Math.round(multiplier * 10000) / 10000,
            growthFactor: Math.round(growthFactor * 1000) / 1000,
            transactionCount30d: txCount,
            drivers: extractDrivers(disputeRatio, payoutDelayFactor, balancePressure),
        },
        modeledProjections: {
            modelVersion: MODEL_VERSION,
            windows: [
                {
                    windowDays: 30,
                    capitalAtRiskCents: t30,
                    capitalAtRiskCentsMin: Math.round(t30 * (1 - uncertainty)),
                    capitalAtRiskCentsMax: Math.round(t30 * (1 + uncertainty)),
                    displayMode,
                    reserveRateBps,
                    riskBand,
                },
                buildWindow(60, t60),
                buildWindow(90, t90),
            ],
        },
    };
}
