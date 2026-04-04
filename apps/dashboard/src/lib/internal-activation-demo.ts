export const INTERNAL_ACTIVATION_MODEL_VERSION = 'stripe-internal-demo-v1.0.0';

export interface InternalActivationDemo {
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
    };
    projectionBasis: Record<string, unknown>;
    reserveProjections: Array<{
        windowDays: number;
        baseReserveRate: number;
        worstCaseReserveRate: number;
        projectedTrappedBps: number;
        worstCaseTrappedBps: number;
        riskBand: string;
    }>;
}

export function buildInternalActivationDemo(args: {
    workspaceName: string;
    stripeAccountId: string;
    primaryHost: string;
}): InternalActivationDemo {
    const riskTier = 3;
    const riskBand = 'elevated';
    const trend = 'STABLE';
    const baseReserveRate = 0.1;
    const worstCaseReserveRate = 0.14;

    return {
        riskTier,
        riskBand,
        stabilityScore: 62,
        trend,
        tierDelta: 0,
        instabilitySignal: 'LATENT',
        policySurface: { present: 3, weak: 1, missing: 0 },
        sourceSummary: {
            mode: 'internal_demo',
            workspaceName: args.workspaceName,
            stripeAccountId: args.stripeAccountId,
            businessUrl: args.primaryHost,
            note: 'Internal verification artifact generated without requiring live Stripe charge or payout volume.',
        },
        recommendedInterventions: [
            {
                action: 'Improve refund and cancellation policy visibility on your site.',
                rationale: 'Clear, easy-to-find refund and cancellation policies reduce dispute pressure and make processors more comfortable with your account.',
                priority: 'high',
            },
            {
                action: 'Review your customer support contact paths.',
                rationale: 'Visible support channels give processors confidence that customer issues are being handled before they escalate to chargebacks.',
                priority: 'moderate',
            },
        ],
        simulationDelta: {
            velocityReduction: 0.25,
            exposureMultiplier: 0.65,
            rateMultiplier: 0.74,
            label: 'Internal verification simulation',
        },
        projectionBasis: {
            inputs: {
                riskTier,
                riskBand,
                trend,
                tierDelta: 0,
                policySurface: { present: 3, weak: 1, missing: 0 },
                stripeSignals: {
                    internalDemo: true,
                    chargesEnabled: true,
                    payoutsEnabled: true,
                    detailsSubmitted: true,
                },
            },
            constants: {
                baseReserveRate,
                trendMultiplier: 1,
                projectedTier: riskTier,
                projectedReserveRate: baseReserveRate,
                worstCaseReserveRate,
                reserveRateCeiling: 0.25,
            },
            interventionBasis: {
                velocityReductionApplied: 0.25,
                exposureMultiplier: 0.65,
                rateMultiplier: 0.74,
                derivationFormula: 'internal-demo-fixed-surface',
            },
        },
        reserveProjections: [
            {
                windowDays: 30,
                baseReserveRate,
                worstCaseReserveRate,
                projectedTrappedBps: 333,
                worstCaseTrappedBps: 467,
                riskBand: riskBand.toUpperCase(),
            },
            {
                windowDays: 60,
                baseReserveRate,
                worstCaseReserveRate,
                projectedTrappedBps: 667,
                worstCaseTrappedBps: 933,
                riskBand: riskBand.toUpperCase(),
            },
            {
                windowDays: 90,
                baseReserveRate,
                worstCaseReserveRate,
                projectedTrappedBps: 1000,
                worstCaseTrappedBps: 1400,
                riskBand: riskBand.toUpperCase(),
            },
        ],
    };
}
