import { dbQuery } from './client';
import { mapBillingCustomerRow, mapBillingSubscriptionRow } from './rows';
import type {
    BillingCustomerRow,
    BillingSubscriptionRow,
    SubscriptionStatus,
    WorkspacePaymentStatus,
    WorkspaceTier,
} from './types';

export interface StripeBillingSnapshot {
    workspaceId: string;
    billingCustomerId: string;
    stripeSubscriptionId: string;
    stripeCheckoutSessionId?: string | null;
    stripePriceId?: string | null;
    status: SubscriptionStatus;
    grantsTier: WorkspaceTier;
    rawStatus: string;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
    canceledAt?: string | null;
    trialStart?: string | null;
    trialEnd?: string | null;
    latestInvoiceId?: string | null;
    lastWebhookEventAt?: string | null;
    lastReconciledAt?: string | null;
}

export function mapStripeStatusToWorkspacePaymentStatus(status: string): WorkspacePaymentStatus {
    switch (status) {
        case 'active':
            return 'current';
        case 'trialing':
            return 'trialing';
        case 'past_due':
            return 'past_due';
        case 'unpaid':
            return 'unpaid';
        case 'canceled':
            return 'canceled';
        case 'incomplete':
            return 'incomplete';
        case 'incomplete_expired':
            return 'incomplete_expired';
        default:
            return 'none';
    }
}

export function mapStripeStatusToSubscriptionStatus(status: string): SubscriptionStatus {
    switch (status) {
        case 'trialing':
            return 'trialing';
        case 'active':
            return 'active';
        case 'past_due':
            return 'past_due';
        case 'unpaid':
            return 'unpaid';
        case 'canceled':
            return 'canceled';
        case 'incomplete':
            return 'incomplete';
        case 'incomplete_expired':
            return 'incomplete_expired';
        default:
            return 'checkout_pending';
    }
}

export function deriveEffectiveWorkspaceTier(status: SubscriptionStatus, grantsTier: WorkspaceTier): WorkspaceTier {
    if (status === 'active' || status === 'trialing' || status === 'past_due') {
        return grantsTier;
    }
    return 'free';
}

export async function getBillingCustomerByWorkspaceId(workspaceId: string): Promise<BillingCustomerRow | null> {
    const result = await dbQuery(
        'SELECT * FROM billing_customers WHERE workspace_id = $1 AND provider = $2 LIMIT 1',
        [workspaceId, 'stripe']
    );
    return result.rows[0] ? mapBillingCustomerRow(result.rows[0]) : null;
}

export async function upsertBillingCustomer(args: {
    workspaceId: string;
    stripeCustomerId: string;
    email?: string | null;
}): Promise<BillingCustomerRow> {
    const result = await dbQuery(
        `
        INSERT INTO billing_customers (workspace_id, provider, stripe_customer_id, email)
        VALUES ($1, 'stripe', $2, $3)
        ON CONFLICT (workspace_id, provider) DO UPDATE
        SET
            stripe_customer_id = EXCLUDED.stripe_customer_id,
            email = COALESCE(EXCLUDED.email, billing_customers.email),
            updated_at = now()
        RETURNING *
        `,
        [args.workspaceId, args.stripeCustomerId, args.email ?? null]
    );
    return mapBillingCustomerRow(result.rows[0]);
}

export async function findSubscriptionByStripeSubscriptionId(
    stripeSubscriptionId: string
): Promise<BillingSubscriptionRow | null> {
    const result = await dbQuery(
        'SELECT * FROM billing_subscriptions WHERE stripe_subscription_id = $1 LIMIT 1',
        [stripeSubscriptionId]
    );
    return result.rows[0] ? mapBillingSubscriptionRow(result.rows[0]) : null;
}

export async function findSubscriptionByCheckoutSessionId(
    checkoutSessionId: string
): Promise<BillingSubscriptionRow | null> {
    const result = await dbQuery(
        'SELECT * FROM billing_subscriptions WHERE stripe_checkout_session_id = $1 LIMIT 1',
        [checkoutSessionId]
    );
    return result.rows[0] ? mapBillingSubscriptionRow(result.rows[0]) : null;
}

export async function createOrUpdateCheckoutPendingSubscription(args: {
    workspaceId: string;
    billingCustomerId: string;
    checkoutSessionId: string;
    stripePriceId: string;
    grantsTier?: WorkspaceTier;
}): Promise<BillingSubscriptionRow> {
    const result = await dbQuery(
        `
        INSERT INTO billing_subscriptions (
            workspace_id,
            billing_customer_id,
            provider,
            stripe_checkout_session_id,
            stripe_price_id,
            status,
            grants_tier,
            raw_status
        )
        VALUES ($1, $2, 'stripe', $3, $4, 'checkout_pending', $5, 'checkout_pending')
        ON CONFLICT (stripe_checkout_session_id) DO UPDATE
        SET
            billing_customer_id = EXCLUDED.billing_customer_id,
            stripe_price_id = EXCLUDED.stripe_price_id,
            updated_at = now()
        RETURNING *
        `,
        [args.workspaceId, args.billingCustomerId, args.checkoutSessionId, args.stripePriceId, args.grantsTier ?? 'pro']
    );
    return mapBillingSubscriptionRow(result.rows[0]);
}

export async function upsertSubscriptionFromStripe(args: StripeBillingSnapshot): Promise<BillingSubscriptionRow> {
    if (args.stripeCheckoutSessionId) {
        const updatedByCheckout = await dbQuery(
            `
            UPDATE billing_subscriptions
            SET
                workspace_id = $2,
                billing_customer_id = $3,
                provider = 'stripe',
                stripe_subscription_id = $4,
                stripe_price_id = COALESCE($5, stripe_price_id),
                status = $6,
                grants_tier = $7,
                raw_status = $8,
                current_period_start = $9,
                current_period_end = $10,
                cancel_at_period_end = COALESCE($11, false),
                canceled_at = $12,
                trial_start = $13,
                trial_end = $14,
                latest_invoice_id = $15,
                last_webhook_event_at = COALESCE($16, last_webhook_event_at),
                last_reconciled_at = COALESCE($17, last_reconciled_at),
                updated_at = now()
            WHERE stripe_checkout_session_id = $1
            RETURNING *
            `,
            [
                args.stripeCheckoutSessionId,
                args.workspaceId,
                args.billingCustomerId,
                args.stripeSubscriptionId,
                args.stripePriceId ?? null,
                args.status,
                args.grantsTier,
                args.rawStatus,
                args.currentPeriodStart ?? null,
                args.currentPeriodEnd ?? null,
                args.cancelAtPeriodEnd ?? false,
                args.canceledAt ?? null,
                args.trialStart ?? null,
                args.trialEnd ?? null,
                args.latestInvoiceId ?? null,
                args.lastWebhookEventAt ?? null,
                args.lastReconciledAt ?? null,
            ]
        );

        if (updatedByCheckout.rows[0]) {
            return mapBillingSubscriptionRow(updatedByCheckout.rows[0]);
        }
    }

    const result = await dbQuery(
        `
        INSERT INTO billing_subscriptions (
            workspace_id,
            billing_customer_id,
            provider,
            stripe_subscription_id,
            stripe_checkout_session_id,
            stripe_price_id,
            status,
            grants_tier,
            current_period_start,
            current_period_end,
            cancel_at_period_end,
            canceled_at,
            trial_start,
            trial_end,
            latest_invoice_id,
            raw_status,
            last_webhook_event_at,
            last_reconciled_at
        )
        VALUES (
            $1, $2, 'stripe', $3, $4, $5, $6, $7, $8, $9, COALESCE($10, false), $11, $12, $13, $14, $15, $16, $17
        )
        ON CONFLICT (stripe_subscription_id) DO UPDATE
        SET
            workspace_id = EXCLUDED.workspace_id,
            billing_customer_id = EXCLUDED.billing_customer_id,
            stripe_checkout_session_id = COALESCE(EXCLUDED.stripe_checkout_session_id, billing_subscriptions.stripe_checkout_session_id),
            stripe_price_id = COALESCE(EXCLUDED.stripe_price_id, billing_subscriptions.stripe_price_id),
            status = EXCLUDED.status,
            grants_tier = EXCLUDED.grants_tier,
            current_period_start = EXCLUDED.current_period_start,
            current_period_end = EXCLUDED.current_period_end,
            cancel_at_period_end = EXCLUDED.cancel_at_period_end,
            canceled_at = EXCLUDED.canceled_at,
            trial_start = EXCLUDED.trial_start,
            trial_end = EXCLUDED.trial_end,
            latest_invoice_id = EXCLUDED.latest_invoice_id,
            raw_status = EXCLUDED.raw_status,
            last_webhook_event_at = COALESCE(EXCLUDED.last_webhook_event_at, billing_subscriptions.last_webhook_event_at),
            last_reconciled_at = COALESCE(EXCLUDED.last_reconciled_at, billing_subscriptions.last_reconciled_at),
            updated_at = now()
        RETURNING *
        `,
        [
            args.workspaceId,
            args.billingCustomerId,
            args.stripeSubscriptionId,
            args.stripeCheckoutSessionId ?? null,
            args.stripePriceId ?? null,
            args.status,
            args.grantsTier,
            args.currentPeriodStart ?? null,
            args.currentPeriodEnd ?? null,
            args.cancelAtPeriodEnd ?? false,
            args.canceledAt ?? null,
            args.trialStart ?? null,
            args.trialEnd ?? null,
            args.latestInvoiceId ?? null,
            args.rawStatus,
            args.lastWebhookEventAt ?? null,
            args.lastReconciledAt ?? null,
        ]
    );

    return mapBillingSubscriptionRow(result.rows[0]);
}

