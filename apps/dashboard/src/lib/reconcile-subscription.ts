/**
 * Reconciliation Sweep
 *
 * If a workspace has a billing_customer record but no active billing_subscription,
 * query Stripe directly for orphaned active/trialing subscriptions and auto-heal
 * the local database. This catches cases where the checkout.session.completed
 * webhook was missed or the success redirect failed after payment.
 */

import Stripe from 'stripe';
import { dbQuery } from './db/client';
import {
    getBillingCustomerByWorkspaceId,
    mapStripeStatusToSubscriptionStatus,
    mapStripeStatusToWorkspacePaymentStatus,
    upsertSubscriptionFromStripe,
    type StripeBillingSnapshot,
} from './db/billing';
import { updateWorkspaceState } from './db/workspaces';
import type { BillingSubscriptionRow, SubscriptionStatus } from './db/types';

function isActiveStatus(status: SubscriptionStatus): boolean {
    return status === 'active' || status === 'trialing' || status === 'past_due';
}

function toIsoFromEpoch(epochSeconds?: number | null): string | null {
    if (!epochSeconds || !Number.isFinite(epochSeconds)) return null;
    return new Date(epochSeconds * 1000).toISOString();
}

function normalizeStripeId(value: unknown): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null && 'id' in value && typeof (value as any).id === 'string') {
        return (value as any).id;
    }
    return null;
}

/**
 * Check if a workspace has any local subscription with an active-equivalent status.
 */
async function hasLocalActiveSubscription(workspaceId: string): Promise<boolean> {
    const result = await dbQuery(
        `SELECT status FROM billing_subscriptions
         WHERE workspace_id = $1
           AND status IN ('active', 'trialing', 'past_due')
         LIMIT 1`,
        [workspaceId]
    );
    return (result.rowCount ?? 0) > 0;
}

/**
 * Attempt to reconcile an orphaned Stripe subscription for a workspace.
 *
 * Returns the healed subscription row, or null if nothing to reconcile.
 */
export async function reconcileOrphanedSubscription(
    workspaceId: string
): Promise<BillingSubscriptionRow | null> {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return null;

    // Skip if workspace already has an active-equivalent local subscription
    if (await hasLocalActiveSubscription(workspaceId)) {
        return null;
    }

    // Only attempt reconciliation if we have a known Stripe customer
    const billingCustomer = await getBillingCustomerByWorkspaceId(workspaceId);
    if (!billingCustomer?.stripe_customer_id) {
        return null;
    }

    try {
        const stripe = new Stripe(stripeKey);

        // Check for active subscriptions first, then trialing
        let subscriptions = await stripe.subscriptions.list({
            customer: billingCustomer.stripe_customer_id,
            status: 'active',
            limit: 1,
        });

        if (subscriptions.data.length === 0) {
            subscriptions = await stripe.subscriptions.list({
                customer: billingCustomer.stripe_customer_id,
                status: 'trialing',
                limit: 1,
            });
        }

        if (subscriptions.data.length === 0) {
            return null;
        }

        const subscription = subscriptions.data[0];
        const subscriptionStatus = mapStripeStatusToSubscriptionStatus(subscription.status);
        const now = new Date().toISOString();

        const snapshot: StripeBillingSnapshot = {
            workspaceId,
            billingCustomerId: billingCustomer.id,
            stripeSubscriptionId: subscription.id,
            stripeCheckoutSessionId: null,
            stripePriceId: subscription.items.data[0]?.price?.id ?? null,
            status: subscriptionStatus,
            grantsTier: 'pro',
            rawStatus: subscription.status,
            currentPeriodStart: toIsoFromEpoch((subscription as any).current_period_start ?? null),
            currentPeriodEnd: toIsoFromEpoch((subscription as any).current_period_end ?? null),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            canceledAt: toIsoFromEpoch(subscription.canceled_at ?? null),
            trialStart: toIsoFromEpoch(subscription.trial_start ?? null),
            trialEnd: toIsoFromEpoch(subscription.trial_end ?? null),
            latestInvoiceId: normalizeStripeId(subscription.latest_invoice),
            lastWebhookEventAt: null,
            lastReconciledAt: now,
        };

        const record = await upsertSubscriptionFromStripe(snapshot);

        // Update workspace state to reflect active billing
        const paymentStatus = mapStripeStatusToWorkspacePaymentStatus(subscription.status);
        await updateWorkspaceState({
            workspaceId,
            entitlementTier: 'pro',
            paymentStatus,
        });

        console.log(
            '[RECONCILE] Healed orphaned subscription',
            record.stripe_subscription_id,
            record.status,
            `for workspace ${workspaceId}`
        );

        return record;
    } catch (error) {
        console.error(
            '[RECONCILE] Failed to reconcile subscription:',
            (error as Error).message
        );
        return null;
    }
}
