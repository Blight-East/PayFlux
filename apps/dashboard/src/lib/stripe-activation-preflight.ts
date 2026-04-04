import Stripe from 'stripe';
import {
    fetchStripeActivationInputs,
    MIN_RECENT_CHARGES,
    MIN_RECENT_PAYOUTS,
} from './stripe-activation-contract';

export type ActivationPreflightStatus =
    | 'ready'
    | 'connect_required'
    | 'account_setup_required'
    | 'host_required'
    | 'activity_low'
    | 'review';

export interface ActivationPreflightBlocker {
    code: 'CONNECT_STRIPE' | 'STRIPE_ACCOUNT_SETUP' | 'BUSINESS_HOST_REQUIRED' | 'LOW_STRIPE_ACTIVITY';
    title: string;
    detail: string;
    hardBlockCheckout: boolean;
}

export interface ActivationPreflightResult {
    status: ActivationPreflightStatus;
    summary: string;
    recommendedNextStep: string;
    hardBlockCheckout: boolean;
    checks: {
        processorConnected: boolean;
        accountReady: boolean | null;
        hostReady: boolean;
        activityReady: boolean | null;
    };
    blockers: ActivationPreflightBlocker[];
    account: {
        businessUrl: string | null;
        chargesEnabled: boolean | null;
        payoutsEnabled: boolean | null;
        detailsSubmitted: boolean | null;
        currentlyDueCount: number | null;
        pendingVerificationCount: number | null;
        pastDueCount: number | null;
        disabledReason: string | null;
    };
    activity: {
        recentChargeCount30d: number | null;
        recentPayoutCount30d: number | null;
        minimumChargeCount30d: number;
        minimumPayoutCount30d: number;
    };
}

function getStripeClient(): Stripe {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
        throw new Error('STRIPE_SECRET_KEY is required for Stripe activation preflight');
    }

    return new Stripe(key, {
        apiVersion: '2026-01-28.clover',
    });
}

function normalizeBusinessUrl(value: string | null | undefined): string | null {
    if (!value) return null;
    try {
        const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
        return new URL(candidate).hostname.toLowerCase();
    } catch {
        return value.trim().toLowerCase() || null;
    }
}

export async function resolveStripeActivationPreflight(args: {
    stripeAccountId?: string | null;
    knownPrimaryHost?: string | null;
}): Promise<ActivationPreflightResult> {
    if (!args.stripeAccountId) {
        return {
            status: 'connect_required',
            summary: 'Connect Stripe before PayFlux can verify whether this workspace will activate cleanly.',
            recommendedNextStep: 'Connect Stripe first, then run the activation readiness check before paying.',
            hardBlockCheckout: false,
            checks: {
                processorConnected: false,
                accountReady: null,
                hostReady: Boolean(args.knownPrimaryHost),
                activityReady: null,
            },
            blockers: [
                {
                    code: 'CONNECT_STRIPE',
                    title: 'Connect Stripe first',
                    detail: 'PayFlux cannot verify account readiness or recent payment activity until Stripe is connected.',
                    hardBlockCheckout: false,
                },
            ],
            account: {
                businessUrl: null,
                chargesEnabled: null,
                payoutsEnabled: null,
                detailsSubmitted: null,
                currentlyDueCount: null,
                pendingVerificationCount: null,
                pastDueCount: null,
                disabledReason: null,
            },
            activity: {
                recentChargeCount30d: null,
                recentPayoutCount30d: null,
                minimumChargeCount30d: MIN_RECENT_CHARGES,
                minimumPayoutCount30d: MIN_RECENT_PAYOUTS,
            },
        };
    }

    const stripe = getStripeClient();
    const account = await stripe.accounts.retrieve(args.stripeAccountId);
    const businessUrl = normalizeBusinessUrl(account.business_profile?.url ?? null);
    const hostReady = Boolean(args.knownPrimaryHost || businessUrl);
    const accountReady = Boolean(account.charges_enabled && account.payouts_enabled && account.details_submitted);

    const blockers: ActivationPreflightBlocker[] = [];

    if (!accountReady) {
        blockers.push({
            code: 'STRIPE_ACCOUNT_SETUP',
            title: 'Finish Stripe account setup',
            detail: 'Stripe still shows this connected account as not fully ready for charges, payouts, or required details.',
            hardBlockCheckout: true,
        });
    }

    if (!hostReady) {
        blockers.push({
            code: 'BUSINESS_HOST_REQUIRED',
            title: 'Add a usable business website',
            detail: 'PayFlux needs a real business host from Stripe or the workspace scan to scope monitoring correctly.',
            hardBlockCheckout: true,
        });
    }

    let recentChargeCount30d: number | null = null;
    let recentPayoutCount30d: number | null = null;
    let activityReady: boolean | null = null;

    if (accountReady) {
        const inputs = await fetchStripeActivationInputs(args.stripeAccountId);
        recentChargeCount30d = inputs.recent.chargeCount30d;
        recentPayoutCount30d = inputs.recent.payoutCount30d;
        activityReady = recentChargeCount30d >= MIN_RECENT_CHARGES && recentPayoutCount30d >= MIN_RECENT_PAYOUTS;

        if (!activityReady) {
            blockers.push({
                code: 'LOW_STRIPE_ACTIVITY',
                title: 'Recent Stripe activity is still too light',
                detail: `PayFlux needs at least ${MIN_RECENT_CHARGES} recent charges and ${MIN_RECENT_PAYOUTS} recent payouts to build a live baseline automatically.`,
                hardBlockCheckout: false,
            });
        }
    }

    if (blockers.length === 0) {
        return {
            status: 'ready',
            summary: 'This workspace looks ready for Pro activation.',
            recommendedNextStep: 'Start Pro. Stripe should be able to activate directly into live monitoring.',
            hardBlockCheckout: false,
            checks: {
                processorConnected: true,
                accountReady,
                hostReady,
                activityReady,
            },
            blockers,
            account: {
                businessUrl,
                chargesEnabled: Boolean(account.charges_enabled),
                payoutsEnabled: Boolean(account.payouts_enabled),
                detailsSubmitted: Boolean(account.details_submitted),
                currentlyDueCount: account.requirements?.currently_due?.length ?? 0,
                pendingVerificationCount: account.requirements?.pending_verification?.length ?? 0,
                pastDueCount: account.requirements?.past_due?.length ?? 0,
                disabledReason: account.requirements?.disabled_reason ?? null,
            },
            activity: {
                recentChargeCount30d,
                recentPayoutCount30d,
                minimumChargeCount30d: MIN_RECENT_CHARGES,
                minimumPayoutCount30d: MIN_RECENT_PAYOUTS,
            },
        };
    }

    const hasHardBlock = blockers.some((blocker) => blocker.hardBlockCheckout);
    const status: ActivationPreflightStatus = hasHardBlock
        ? (!accountReady ? 'account_setup_required' : 'host_required')
        : 'activity_low';

    return {
        status,
        summary: hasHardBlock
            ? 'This workspace is likely to get stuck after purchase unless you fix the items below first.'
            : 'This workspace can subscribe now, but live monitoring will wait until Stripe has enough recent activity.',
        recommendedNextStep: hasHardBlock
            ? 'Fix the Stripe setup blockers before starting Pro.'
            : 'You can start Pro now, but expect PayFlux to stay in a waiting state until live Stripe activity catches up.',
        hardBlockCheckout: hasHardBlock,
        checks: {
            processorConnected: true,
            accountReady,
            hostReady,
            activityReady,
        },
        blockers,
        account: {
            businessUrl,
            chargesEnabled: Boolean(account.charges_enabled),
            payoutsEnabled: Boolean(account.payouts_enabled),
            detailsSubmitted: Boolean(account.details_submitted),
            currentlyDueCount: account.requirements?.currently_due?.length ?? 0,
            pendingVerificationCount: account.requirements?.pending_verification?.length ?? 0,
            pastDueCount: account.requirements?.past_due?.length ?? 0,
            disabledReason: account.requirements?.disabled_reason ?? null,
        },
        activity: {
            recentChargeCount30d,
            recentPayoutCount30d,
            minimumChargeCount30d: MIN_RECENT_CHARGES,
            minimumPayoutCount30d: MIN_RECENT_PAYOUTS,
        },
    };
}
