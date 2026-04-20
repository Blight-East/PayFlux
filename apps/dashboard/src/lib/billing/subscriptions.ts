import { clerkClient } from '@clerk/nextjs/server';
import Stripe from 'stripe';

import { type PricingTier } from '@/lib/tier-enforcement';
import { invalidateBillingStatusCache } from './getBillingStatus';

import { getSubscriptionByUserId, type BillingStatus, type SubscriptionRecord, upsertSubscription } from './store';
import { stripe } from './stripeClient';

const ACTIVE_STATUSES = new Set<BillingStatus>(['active', 'trialing']);

function parsePeriodEnd(value: number | null | undefined): string | null {
    if (!value) return null;
    return new Date(value * 1000).toISOString();
}

function resolvePlanFromPriceId(priceId: string | null | undefined): PricingTier {
    if (priceId && process.env.STRIPE_PRICE_ID_ENTERPRISE && priceId === process.env.STRIPE_PRICE_ID_ENTERPRISE) {
        return 'enterprise';
    }
    if (priceId && process.env.STRIPE_PRICE_ID_PRO && priceId === process.env.STRIPE_PRICE_ID_PRO) {
        return 'pro';
    }
    return 'pro';
}

function subscriptionMetadata(subscription: Stripe.Subscription | null | undefined) {
    return subscription?.metadata ?? {};
}

async function syncWorkspaceMetadata(workspaceId: string | null, subscription: SubscriptionRecord) {
    if (!workspaceId) return;

    const client = await clerkClient();
    await client.organizations.updateOrganizationMetadata(workspaceId, {
        publicMetadata: {
            tier: subscription.plan,
            billingStatus: subscription.status,
            billingCurrentPeriodEnd: subscription.currentPeriodEnd,
        },
    });
}

function subscriptionToRecord(
    subscription: Stripe.Subscription,
    workspaceId: string | null,
    checkoutSessionId: string | null,
    eventTimestamp?: number
): Omit<SubscriptionRecord, 'createdAt' | 'updatedAt'> {
    const subscriptionAny = subscription as any;
    const priceId = subscription.items.data[0]?.price?.id ?? null;
    const metadata = subscriptionMetadata(subscription);
    const userId = metadata.userId;

    if (!userId) {
        throw new Error('Stripe subscription missing userId metadata');
    }

    return {
        id: subscription.id,
        userId,
        workspaceId: workspaceId ?? metadata.workspaceId ?? null,
        stripeCustomerId: typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer.id,
        stripeSubscriptionId: subscription.id,
        stripeCheckoutSessionId: checkoutSessionId,
        status: subscription.status as BillingStatus,
        plan: resolvePlanFromPriceId(priceId),
        stripePriceId: priceId,
        currentPeriodEnd: parsePeriodEnd(subscriptionAny.current_period_end),
        cancelAtPeriodEnd: Boolean(subscriptionAny.cancel_at_period_end),
        lastEventTimestamp: eventTimestamp ?? subscription.created,
    };
}

export function hasActiveSubscription(status: BillingStatus | null | undefined) {
    if (!status) return false;
    return ACTIVE_STATUSES.has(status);
}

export async function getUserSubscription(userId: string) {
    return getSubscriptionByUserId(userId);
}

export async function activateSubscriptionFromCheckout(session: Stripe.Checkout.Session, eventCreated?: number) {
    if (!session.subscription) {
        throw new Error('Checkout session missing subscription');
    }

    const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
    const record = await upsertSubscription(
        subscriptionToRecord(
            subscription,
            session.metadata?.workspaceId ?? subscription.metadata?.workspaceId ?? null,
            session.id,
            eventCreated
        )
    );

    await syncWorkspaceMetadata(record.workspaceId, record);
    invalidateBillingStatusCache(record.workspaceId, record.userId);
    console.log('Subscription activated', record.stripeSubscriptionId, record.status);
    return record;
}

export async function syncSubscriptionFromInvoice(invoice: Stripe.Invoice, fallbackStatus?: BillingStatus, eventCreated?: number) {
    const invoiceAny = invoice as any;
    const subscriptionId = typeof invoiceAny.subscription === 'string'
        ? invoiceAny.subscription
        : invoiceAny.subscription?.id;

    if (!subscriptionId) {
        throw new Error('Invoice missing subscription');
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const record = await upsertSubscription(
        subscriptionToRecord(
            {
                ...subscription,
                status: fallbackStatus ?? (subscription.status as BillingStatus),
            },
            subscription.metadata?.workspaceId ?? invoiceAny.parent?.subscription_details?.metadata?.workspaceId ?? null,
            null,
            eventCreated
        )
    );

    await syncWorkspaceMetadata(record.workspaceId, record);
    invalidateBillingStatusCache(record.workspaceId, record.userId);
    return record;
}

/**
 * Reconciliation sweep: if a user has a Stripe customer record but no active
 * local subscription, check Stripe directly for orphaned active subscriptions
 * and auto-heal the local database. This catches cases where the webhook or
 * success redirect failed after payment.
 *
 * Returns the healed subscription record, or null if nothing to reconcile.
 */
export async function reconcileOrphanedSubscription(
    userId: string,
    workspaceId?: string | null
): Promise<SubscriptionRecord | null> {
    // Only attempt reconciliation if we have a known Stripe customer
    const { getBillingCustomerByUserId } = await import('./store');
    const customer = await getBillingCustomerByUserId(userId);
    if (!customer?.stripeCustomerId) {
        return null;
    }

    try {
        const subscriptions = await stripe.subscriptions.list({
            customer: customer.stripeCustomerId,
            status: 'active',
            limit: 1,
            expand: ['data.items.data.price'],
        });

        if (subscriptions.data.length === 0) {
            // Also check for trialing
            const trialingSubs = await stripe.subscriptions.list({
                customer: customer.stripeCustomerId,
                status: 'trialing',
                limit: 1,
                expand: ['data.items.data.price'],
            });
            if (trialingSubs.data.length === 0) {
                return null;
            }
            subscriptions.data = trialingSubs.data;
        }

        const subscription = subscriptions.data[0];
        const record = await upsertSubscription(
            subscriptionToRecord(
                subscription,
                workspaceId ?? subscription.metadata?.workspaceId ?? null,
                null, // no checkout session ID available during reconciliation
                subscription.created
            )
        );

        await syncWorkspaceMetadata(record.workspaceId, record);
        invalidateBillingStatusCache(record.workspaceId, record.userId);
        console.log(
            'reconcile_orphaned_subscription: healed',
            record.stripeSubscriptionId,
            record.status,
            `for user ${userId}`
        );
        return record;
    } catch (error) {
        console.error(
            'reconcile_orphaned_subscription: failed',
            (error as Error).message
        );
        return null;
    }
}

export async function cancelSubscription(subscription: Stripe.Subscription, eventCreated?: number) {
    const record = await upsertSubscription(
        subscriptionToRecord(
            {
                ...subscription,
                status: 'canceled',
            },
            subscription.metadata?.workspaceId ?? null,
            null,
            eventCreated
        )
    );

    await syncWorkspaceMetadata(record.workspaceId, record);
    invalidateBillingStatusCache(record.workspaceId, record.userId);
    return record;
}
