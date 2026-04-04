import Stripe from 'stripe';

export const STRIPE_BASELINE_MODEL_VERSION = 'stripe-baseline-v1.0.0';
const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_WINDOW_DAYS = 30;
const PRIOR_WINDOW_DAYS = 60;
export const MIN_RECENT_CHARGES = 10;
export const MIN_RECENT_PAYOUTS = 2;

type StripeListOptions = { stripeAccount: string };

export interface StripeActivationInputs {
    stripeAccountId: string;
    account: {
        chargesEnabled: boolean;
        payoutsEnabled: boolean;
        detailsSubmitted: boolean;
        currentlyDueCount: number;
        pendingVerificationCount: number;
        pastDueCount: number;
        disabledReason: string | null;
        country: string | null;
        defaultCurrency: string | null;
        businessUrl: string | null;
    };
    balance: {
        availableMinor: number;
        pendingMinor: number;
        pendingRatio: number | null;
    };
    recent: {
        chargeCount30d: number;
        chargeCountPrior30d: number;
        grossVolumeMinor30d: number;
        grossVolumeMinorPrior30d: number;
        refundedCount30d: number;
        refundedCountPrior30d: number;
        refundedVolumeMinor30d: number;
        refundedVolumeMinorPrior30d: number;
        disputeCount30d: number;
        disputeCountPrior30d: number;
        disputeVolumeMinor30d: number;
        disputeVolumeMinorPrior30d: number;
        payoutCount30d: number;
        payoutCountPrior30d: number;
        avgPayoutLagDays30d: number | null;
        avgPayoutLagDaysPrior30d: number | null;
        failedOrCanceledPayoutCount90d: number;
    };
}

export interface BaselineComputation {
    riskTier: number;
    riskBand: 'low' | 'moderate' | 'elevated' | 'high' | 'critical';
    stabilityScore: number;
    trend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
    tierDelta: number;
    instabilitySignal: 'NOMINAL' | 'RECOVERING' | 'LATENT' | 'ELEVATED' | 'ACCELERATING';
    policySurface: { present: number; weak: number; missing: number };
    sourceSummary: Record<string, unknown>;
    recommendedInterventions: Array<{
        action: string;
        rationale: string;
        priority: 'critical' | 'high' | 'moderate' | 'low';
    }>;
    simulationDelta: {
        velocityReduction: number;
        exposureMultiplier: number;
        rateMultiplier: number;
        label: string;
    } | null;
    projectionBasis: {
        inputs: {
            riskTier: number;
            riskBand: string;
            trend: string;
            tierDelta: number;
            policySurface: { present: number; weak: number; missing: number };
            stripeSignals: Record<string, unknown>;
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
    };
    reserveProjections: Array<{
        windowDays: number;
        baseReserveRate: number;
        worstCaseReserveRate: number;
        projectedTrappedBps: number;
        worstCaseTrappedBps: number;
        riskBand: string;
    }>;
}

function getStripeClient(): Stripe {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
        throw new Error('STRIPE_SECRET_KEY is required for activation');
    }

    return new Stripe(key, {
        apiVersion: '2026-01-28.clover',
    });
}

function sumBalanceAmounts(items: Array<{ amount: number }> | null | undefined): number {
    return (items ?? []).reduce((sum, item) => sum + Math.max(0, Number(item.amount ?? 0)), 0);
}

function createdWithinDays(createdSeconds: number, maxDays: number): boolean {
    return (Date.now() - (createdSeconds * 1000)) <= (maxDays * DAY_MS);
}

function splitRecentAndPrior<T extends { created: number }>(items: T[]): { recent: T[]; prior: T[] } {
    return items.reduce(
        (acc, item) => {
            if (createdWithinDays(item.created, RECENT_WINDOW_DAYS)) {
                acc.recent.push(item);
            } else if (createdWithinDays(item.created, PRIOR_WINDOW_DAYS)) {
                acc.prior.push(item);
            }
            return acc;
        },
        { recent: [] as T[], prior: [] as T[] }
    );
}

function average(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ratio(numerator: number, denominator: number): number {
    if (denominator <= 0) return 0;
    return numerator / denominator;
}

function round4(n: number): number {
    return Math.round(n * 10000) / 10000;
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

function deriveRiskBand(riskTier: number): BaselineComputation['riskBand'] {
    if (riskTier <= 1) return 'low';
    if (riskTier === 2) return 'moderate';
    if (riskTier === 3) return 'elevated';
    if (riskTier === 4) return 'high';
    return 'critical';
}

function deriveTrend(inputs: StripeActivationInputs): { trend: BaselineComputation['trend']; tierDelta: number } {
    const disputeRate30 = ratio(inputs.recent.disputeCount30d, inputs.recent.chargeCount30d);
    const disputeRatePrior = ratio(inputs.recent.disputeCountPrior30d, inputs.recent.chargeCountPrior30d);
    const refundRate30 = ratio(inputs.recent.refundedCount30d, inputs.recent.chargeCount30d);
    const refundRatePrior = ratio(inputs.recent.refundedCountPrior30d, inputs.recent.chargeCountPrior30d);
    const payoutLag30 = inputs.recent.avgPayoutLagDays30d ?? 0;
    const payoutLagPrior = inputs.recent.avgPayoutLagDaysPrior30d ?? 0;

    let delta = 0;
    if (disputeRate30 - disputeRatePrior >= 0.005) delta += 1;
    if (refundRate30 - refundRatePrior >= 0.04) delta += 1;
    if (payoutLag30 - payoutLagPrior >= 1) delta += 1;
    if (inputs.account.currentlyDueCount + inputs.account.pendingVerificationCount + inputs.account.pastDueCount > 0) delta += 1;

    if (disputeRatePrior - disputeRate30 >= 0.005) delta -= 1;
    if (refundRatePrior - refundRate30 >= 0.04) delta -= 1;
    if (payoutLagPrior - payoutLag30 >= 1) delta -= 1;

    if (delta > 0) return { trend: 'DEGRADING', tierDelta: 1 };
    if (delta < 0) return { trend: 'IMPROVING', tierDelta: -1 };
    return { trend: 'STABLE', tierDelta: 0 };
}

function reserveRateByTier(riskTier: number): number {
    const rates: Record<number, number> = { 1: 0, 2: 0.05, 3: 0.1, 4: 0.15, 5: 0.25 };
    return rates[riskTier] ?? 0.1;
}

function trendMultiplier(trend: BaselineComputation['trend']): number {
    if (trend === 'DEGRADING') return 1.5;
    if (trend === 'IMPROVING') return 0.75;
    return 1.0;
}

function deriveInterventions(inputs: StripeActivationInputs): BaselineComputation['recommendedInterventions'] {
    const disputeRate30 = ratio(inputs.recent.disputeCount30d, inputs.recent.chargeCount30d);
    const refundRate30 = ratio(inputs.recent.refundedCount30d, inputs.recent.chargeCount30d);
    const lag30 = inputs.recent.avgPayoutLagDays30d ?? 0;
    const interventions: BaselineComputation['recommendedInterventions'] = [];

    if (inputs.account.pastDueCount > 0 || inputs.account.disabledReason) {
        interventions.push({
            action: 'Clear outstanding Stripe requirements',
            rationale: 'The connected account still has past-due or disabling requirements, which can increase payout pressure or block normal processor behavior.',
            priority: 'critical',
        });
    }

    if (disputeRate30 >= 0.01) {
        interventions.push({
            action: 'Reduce dispute pressure in the next payout cycle',
            rationale: 'Recent dispute activity is elevated relative to charge volume, which is a direct processor risk signal.',
            priority: disputeRate30 >= 0.015 ? 'critical' : 'high',
        });
    }

    if (refundRate30 >= 0.08) {
        interventions.push({
            action: 'Reduce refund-driven account volatility',
            rationale: 'Recent refund activity is elevated and can make processor behavior less predictable.',
            priority: refundRate30 >= 0.12 ? 'high' : 'moderate',
        });
    }

    if (lag30 >= 4) {
        interventions.push({
            action: 'Watch payout timing for new delays',
            rationale: 'Recent payouts are arriving more slowly, which is a concrete signal that cash movement may be under more pressure.',
            priority: lag30 >= 7 ? 'high' : 'moderate',
        });
    }

    if (inputs.recent.failedOrCanceledPayoutCount90d > 0) {
        interventions.push({
            action: 'Resolve failed or canceled payouts',
            rationale: 'Recent payout failures or cancellations indicate processor friction that should be addressed before it compounds.',
            priority: inputs.recent.failedOrCanceledPayoutCount90d >= 2 ? 'high' : 'moderate',
        });
    }

    if (interventions.length === 0) {
        interventions.push({
            action: 'Keep monitoring current processor posture',
            rationale: 'Current connected-account signals do not point to one urgent payout-risk driver right now.',
            priority: 'low',
        });
    }

    return interventions;
}

function deriveSimulationDelta(interventions: BaselineComputation['recommendedInterventions']): BaselineComputation['simulationDelta'] {
    const highestPriority = interventions.find((intervention) => intervention.priority === 'critical')
        ? 0.5
        : interventions.find((intervention) => intervention.priority === 'high')
            ? 0.33
            : null;

    if (!highestPriority) return null;

    const exposureMultiplier = round4(Math.pow(1 - highestPriority, 1.5));
    const rateMultiplier = round4(Math.pow(1 - highestPriority, 1.2));

    return {
        velocityReduction: highestPriority,
        exposureMultiplier,
        rateMultiplier,
        label: `Simulate ${Math.round(highestPriority * 100)}% risk-velocity reduction`,
    };
}

export async function fetchStripeActivationInputs(stripeAccountId: string): Promise<StripeActivationInputs> {
    const stripe = getStripeClient();
    const requestOptions: StripeListOptions = { stripeAccount: stripeAccountId };

    // Fetch account first to fail fast if not ready (avoids 4 unnecessary API calls)
    const account = await stripe.accounts.retrieve(stripeAccountId);
    if (!account.charges_enabled || !account.payouts_enabled || !account.details_submitted) {
        throw new Error('PROCESSOR_ACCOUNT_NOT_READY');
    }

    const [balance, charges, disputes, payouts] = await Promise.all([
        stripe.balance.retrieve(requestOptions),
        stripe.charges.list({ limit: 100 }, requestOptions),
        stripe.disputes.list({ limit: 100 }, requestOptions),
        stripe.payouts.list({ limit: 20 }, requestOptions),
    ]);

    const accountBusinessUrl = account.business_profile?.url
        ? (() => {
            try {
                return new URL(account.business_profile.url).hostname.toLowerCase();
            } catch {
                return account.business_profile?.url ?? null;
            }
        })()
        : null;

    const chargeBuckets = splitRecentAndPrior(charges.data);
    const disputeBuckets = splitRecentAndPrior(disputes.data);
    const payoutBuckets = splitRecentAndPrior(payouts.data.filter((payout) => payout.status !== 'in_transit'));

    const chargeLagDays = (payout: Stripe.Payout) => round2((payout.arrival_date - payout.created) / 86400);
    const failedOrCanceledPayoutCount90d = payouts.data.filter(
        (payout) =>
            createdWithinDays(payout.created, 90) &&
            (payout.status === 'failed' || payout.status === 'canceled')
    ).length;

    const availableMinor = sumBalanceAmounts(balance.available);
    const pendingMinor = sumBalanceAmounts(balance.pending);
    const totalMinor = availableMinor + pendingMinor;

    return {
        stripeAccountId,
        account: {
            chargesEnabled: Boolean(account.charges_enabled),
            payoutsEnabled: Boolean(account.payouts_enabled),
            detailsSubmitted: Boolean(account.details_submitted),
            currentlyDueCount: account.requirements?.currently_due?.length ?? 0,
            pendingVerificationCount: account.requirements?.pending_verification?.length ?? 0,
            pastDueCount: account.requirements?.past_due?.length ?? 0,
            disabledReason: account.requirements?.disabled_reason ?? null,
            country: account.country ?? null,
            defaultCurrency: account.default_currency ?? null,
            businessUrl: accountBusinessUrl,
        },
        balance: {
            availableMinor,
            pendingMinor,
            pendingRatio: totalMinor > 0 ? round4(pendingMinor / totalMinor) : null,
        },
        recent: {
            chargeCount30d: chargeBuckets.recent.length,
            chargeCountPrior30d: chargeBuckets.prior.length,
            grossVolumeMinor30d: chargeBuckets.recent.reduce((sum, charge) => sum + Math.max(0, charge.amount), 0),
            grossVolumeMinorPrior30d: chargeBuckets.prior.reduce((sum, charge) => sum + Math.max(0, charge.amount), 0),
            refundedCount30d: chargeBuckets.recent.filter((charge) => (charge.amount_refunded ?? 0) > 0).length,
            refundedCountPrior30d: chargeBuckets.prior.filter((charge) => (charge.amount_refunded ?? 0) > 0).length,
            refundedVolumeMinor30d: chargeBuckets.recent.reduce((sum, charge) => sum + Math.max(0, charge.amount_refunded ?? 0), 0),
            refundedVolumeMinorPrior30d: chargeBuckets.prior.reduce((sum, charge) => sum + Math.max(0, charge.amount_refunded ?? 0), 0),
            disputeCount30d: disputeBuckets.recent.length,
            disputeCountPrior30d: disputeBuckets.prior.length,
            disputeVolumeMinor30d: disputeBuckets.recent.reduce((sum, dispute) => sum + Math.max(0, dispute.amount), 0),
            disputeVolumeMinorPrior30d: disputeBuckets.prior.reduce((sum, dispute) => sum + Math.max(0, dispute.amount), 0),
            payoutCount30d: payoutBuckets.recent.length,
            payoutCountPrior30d: payoutBuckets.prior.length,
            avgPayoutLagDays30d: average(payoutBuckets.recent.map(chargeLagDays)),
            avgPayoutLagDaysPrior30d: average(payoutBuckets.prior.map(chargeLagDays)),
            failedOrCanceledPayoutCount90d,
        },
    };
}

export function deriveBaselineAndProjection(inputs: StripeActivationInputs): BaselineComputation {
    if (!inputs.account.chargesEnabled || !inputs.account.payoutsEnabled || !inputs.account.detailsSubmitted) {
        throw new Error('PROCESSOR_ACCOUNT_NOT_READY');
    }

    if (inputs.recent.chargeCount30d < MIN_RECENT_CHARGES || inputs.recent.payoutCount30d < MIN_RECENT_PAYOUTS) {
        throw new Error('INSUFFICIENT_STRIPE_ACTIVITY');
    }

    const disputeRate30 = ratio(inputs.recent.disputeCount30d, inputs.recent.chargeCount30d);
    const refundRate30 = ratio(inputs.recent.refundedCount30d, inputs.recent.chargeCount30d);
    const payoutLag30 = inputs.recent.avgPayoutLagDays30d ?? 0;
    const pendingRatio = inputs.balance.pendingRatio ?? 0;

    let riskPoints = 0;
    if (inputs.account.pastDueCount > 0 || inputs.account.disabledReason) riskPoints += 3;
    else if ((inputs.account.currentlyDueCount + inputs.account.pendingVerificationCount) > 0) riskPoints += 1;

    if (disputeRate30 >= 0.015) riskPoints += 3;
    else if (disputeRate30 >= 0.01) riskPoints += 2;
    else if (disputeRate30 >= 0.005) riskPoints += 1;

    if (refundRate30 >= 0.12) riskPoints += 2;
    else if (refundRate30 >= 0.08) riskPoints += 1;

    if (payoutLag30 >= 7) riskPoints += 2;
    else if (payoutLag30 >= 4) riskPoints += 1;

    if (inputs.recent.failedOrCanceledPayoutCount90d >= 2) riskPoints += 2;
    else if (inputs.recent.failedOrCanceledPayoutCount90d >= 1) riskPoints += 1;

    if (pendingRatio >= 0.6) riskPoints += 2;
    else if (pendingRatio >= 0.4) riskPoints += 1;

    let riskTier = 1;
    if (riskPoints >= 8) riskTier = 5;
    else if (riskPoints >= 6) riskTier = 4;
    else if (riskPoints >= 4) riskTier = 3;
    else if (riskPoints >= 2) riskTier = 2;

    const { trend, tierDelta } = deriveTrend(inputs);
    const riskBand = deriveRiskBand(riskTier);
    const stabilityScore = Math.max(
        5,
        Math.min(
            95,
            100 - (riskPoints * 10) - Math.round(disputeRate30 * 1000) - Math.round(pendingRatio * 20)
        )
    );

    const baseReserveRate = reserveRateByTier(riskTier);
    const projectedTier = Math.max(1, Math.min(5, riskTier + tierDelta));
    const projectedReserveRate = reserveRateByTier(projectedTier);
    const appliedTrendMultiplier = trendMultiplier(trend);
    const worstCaseReserveRate = Math.min(0.25, projectedReserveRate * appliedTrendMultiplier);

    let instabilitySignal: BaselineComputation['instabilitySignal'] = 'NOMINAL';
    if (trend === 'DEGRADING' && riskTier >= 4) instabilitySignal = 'ACCELERATING';
    else if (trend === 'DEGRADING' || riskTier >= 3) instabilitySignal = 'ELEVATED';
    else if (trend === 'IMPROVING') instabilitySignal = 'RECOVERING';
    else if (riskTier >= 4) instabilitySignal = 'LATENT';

    const recommendedInterventions = deriveInterventions(inputs);
    const simulationDelta = deriveSimulationDelta(recommendedInterventions);
    const reserveProjections = [30, 60, 90].map((windowDays) => ({
        windowDays,
        baseReserveRate: round4(baseReserveRate),
        worstCaseReserveRate: round4(worstCaseReserveRate),
        projectedTrappedBps: Math.round(baseReserveRate * 10000 * (windowDays / 90)),
        worstCaseTrappedBps: Math.round(worstCaseReserveRate * 10000 * (windowDays / 90)),
        riskBand: riskBand.toUpperCase(),
    }));

    const stripeSignals = {
        chargesEnabled: inputs.account.chargesEnabled,
        payoutsEnabled: inputs.account.payoutsEnabled,
        detailsSubmitted: inputs.account.detailsSubmitted,
        currentlyDueCount: inputs.account.currentlyDueCount,
        pendingVerificationCount: inputs.account.pendingVerificationCount,
        pastDueCount: inputs.account.pastDueCount,
        disabledReason: inputs.account.disabledReason,
        pendingBalanceRatio: pendingRatio,
        chargeCount30d: inputs.recent.chargeCount30d,
        chargeCountPrior30d: inputs.recent.chargeCountPrior30d,
        disputeRate30d: round4(disputeRate30),
        refundRate30d: round4(refundRate30),
        avgPayoutLagDays30d: inputs.recent.avgPayoutLagDays30d,
        avgPayoutLagDaysPrior30d: inputs.recent.avgPayoutLagDaysPrior30d,
        failedOrCanceledPayoutCount90d: inputs.recent.failedOrCanceledPayoutCount90d,
    };

    return {
        riskTier,
        riskBand,
        stabilityScore,
        trend,
        tierDelta,
        instabilitySignal,
        policySurface: { present: 0, weak: 0, missing: 0 },
        sourceSummary: {
            stripeAccountId: inputs.stripeAccountId,
            businessUrl: inputs.account.businessUrl,
            country: inputs.account.country,
            defaultCurrency: inputs.account.defaultCurrency,
            balance: inputs.balance,
            recent: inputs.recent,
        },
        recommendedInterventions,
        simulationDelta,
        projectionBasis: {
            inputs: {
                riskTier,
                riskBand: riskBand.toUpperCase(),
                trend,
                tierDelta,
                policySurface: { present: 0, weak: 0, missing: 0 },
                stripeSignals,
            },
            constants: {
                baseReserveRate: round4(baseReserveRate),
                trendMultiplier: round4(appliedTrendMultiplier),
                projectedTier,
                projectedReserveRate: round4(projectedReserveRate),
                worstCaseReserveRate: round4(worstCaseReserveRate),
                reserveRateCeiling: 0.25,
            },
            interventionBasis: {
                velocityReductionApplied: simulationDelta?.velocityReduction ?? null,
                exposureMultiplier: simulationDelta?.exposureMultiplier ?? null,
                rateMultiplier: simulationDelta?.rateMultiplier ?? null,
                derivationFormula: 'exposureMultiplier = (1 - velocityReduction) ^ 1.5; rateMultiplier = (1 - velocityReduction) ^ 1.2',
            },
        },
        reserveProjections,
    };
}
