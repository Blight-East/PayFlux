import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { clerkClient } from '@clerk/nextjs/server';
import { logOnboardingEvent, logStageTransition } from '@/lib/onboarding-events-server';
import fs from 'fs/promises';
import path from 'path';

const STATUS_PATH = path.join(process.cwd(), 'data', 'status.json');

// ─────────────────────────────────────────────────────────────────────────────
// Canonical Billing State Table
// ─────────────────────────────────────────────────────────────────────────────
//
// Stripe subscription status → Clerk org metadata mapping.
// This is the SINGLE SOURCE OF TRUTH for billing state transitions.
//
// | Stripe status        | tier   | paymentStatus      | User access       |
// |----------------------|--------|--------------------|-------------------|
// | active               | pro    | current            | Full pro          |
// | trialing             | pro    | trialing           | Full pro          |
// | past_due             | pro    | past_due           | Full pro (grace)  |
// | unpaid               | free   | unpaid             | Downgraded        |
// | canceled             | free   | canceled           | Downgraded        |
// | incomplete           | free   | incomplete         | No pro access     |
// | incomplete_expired   | free   | incomplete_expired | No pro access     |
//
// Key rule: past_due keeps tier pro. Only unpaid, canceled, incomplete,
// incomplete_expired downgrade to free. subscription.updated and
// subscription.deleted are the downgrade authority — never invoice events.
// ─────────────────────────────────────────────────────────────────────────────

type BillingState = { tier: 'pro' | 'free'; paymentStatus: string };

const SUBSCRIPTION_STATUS_MAP: Record<string, BillingState> = {
    active:               { tier: 'pro',  paymentStatus: 'current' },
    trialing:             { tier: 'pro',  paymentStatus: 'trialing' },
    past_due:             { tier: 'pro',  paymentStatus: 'past_due' },
    unpaid:               { tier: 'free', paymentStatus: 'unpaid' },
    canceled:             { tier: 'free', paymentStatus: 'canceled' },
    incomplete:           { tier: 'free', paymentStatus: 'incomplete' },
    incomplete_expired:   { tier: 'free', paymentStatus: 'incomplete_expired' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Stripe Client (lazy)
// ─────────────────────────────────────────────────────────────────────────────

let _stripeClient: Stripe | null = null;

function getStripeClient(): Stripe | null {
    if (_stripeClient) return _stripeClient;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    _stripeClient = new Stripe(key);
    return _stripeClient;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Bypass is only allowed in development AND with explicit env flag
function isTestBypassAllowed(): boolean {
    const isDev = process.env.NODE_ENV === 'development';
    const bypassEnabled = process.env.DASHBOARD_WEBHOOK_TEST_BYPASS === 'true';
    return isDev && bypassEnabled;
}

// Validate that the secret looks like a real Stripe secret
function isValidStripeSecret(secret: string | undefined): secret is string {
    return !!secret && secret.startsWith('whsec_') && secret.length > 10;
}

async function updateStatus() {
    await fs.mkdir(path.dirname(STATUS_PATH), { recursive: true });
    await fs.writeFile(STATUS_PATH, JSON.stringify({ lastEventAt: new Date().toISOString() }));
}

// Helper: Construct and verify Stripe event
function constructEvent(payload: string, sig: string | null, secret: string | undefined): Stripe.Event {
    if (!sig) {
        throw new Error('Missing Stripe-Signature header');
    }

    if (!isTestBypassAllowed() && !isValidStripeSecret(secret)) {
        console.warn('webhook_config_error: STRIPE_WEBHOOK_SECRET must start with whsec_');
        throw new Error('Webhook not configured');
    }

    // Test bypass: only in dev mode with explicit flag
    if (isTestBypassAllowed() && sig === 'test_bypass') {
        return JSON.parse(payload) as Stripe.Event;
    }

    if (isValidStripeSecret(secret)) {
        const stripe = new Stripe('sk_test_dummy');
        return stripe.webhooks.constructEvent(payload, sig, secret);
    }

    console.warn('webhook_bypass_blocked: test bypass attempted outside development');
    throw new Error('Not available in this environment');
}

/**
 * Resolve workspaceId from a Stripe subscription object.
 * Checks subscription.metadata first, then falls back to retrieving
 * the subscription via Stripe API if we only have an ID.
 *
 * Returns { workspaceId, checkoutOrigin } or nulls if not resolvable.
 */
async function resolveWorkspaceFromSubscription(
    subscriptionOrId: any
): Promise<{ workspaceId: string | null; checkoutOrigin: string | null }> {
    // If we already have the full subscription object with metadata
    if (typeof subscriptionOrId === 'object' && subscriptionOrId?.metadata) {
        return {
            workspaceId: subscriptionOrId.metadata.workspaceId || null,
            checkoutOrigin: subscriptionOrId.metadata.checkoutOrigin || null,
        };
    }

    // We have a subscription ID string — retrieve from Stripe
    const subscriptionId = typeof subscriptionOrId === 'string'
        ? subscriptionOrId
        : subscriptionOrId?.id;

    if (!subscriptionId) return { workspaceId: null, checkoutOrigin: null };

    const stripe = getStripeClient();
    if (!stripe) {
        console.warn('[WEBHOOK] Cannot retrieve subscription — STRIPE_SECRET_KEY not configured');
        return { workspaceId: null, checkoutOrigin: null };
    }

    try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        return {
            workspaceId: sub.metadata?.workspaceId || null,
            checkoutOrigin: sub.metadata?.checkoutOrigin || null,
        };
    } catch (err) {
        console.warn(`[WEBHOOK] Failed to retrieve subscription ${subscriptionId}:`, err);
        return { workspaceId: null, checkoutOrigin: null };
    }
}

/**
 * Structured log for every billing webhook handler.
 * Consistent shape makes billing-state debugging straightforward.
 */
function logBillingEvent(
    handler: string,
    details: {
        eventType: string;
        stripeObjectId: string;
        customer?: string;
        workspaceId?: string | null;
        checkoutOrigin?: string | null;
        resultingTier?: string;
        resultingPaymentStatus?: string;
        error?: string;
    }
) {
    console.log(`[BILLING] ${JSON.stringify({ handler, ...details, ts: new Date().toISOString() })}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Billing Lifecycle Handlers
// ─────────────────────────────────────────────────────────────────────────────

// IMPORTANT — Idempotent Merge Rule:
// Every Clerk metadata write MUST use updateOrganizationMetadata() which
// shallow-merges into publicMetadata. NEVER use updateOrganization() which
// replaces the entire publicMetadata object, wiping stripeAccountId,
// stripeConnectedAt, onboardingScanCompleted, activation fields, etc.

/**
 * checkout.session.completed — Upgrade Clerk org tier to "pro"
 */
async function handleCheckoutCompleted(session: any, eventType: string) {
    const workspaceId = session.metadata?.workspaceId;
    const checkoutOrigin = session.metadata?.checkoutOrigin || null;

    logBillingEvent('handleCheckoutCompleted', {
        eventType,
        stripeObjectId: session.id,
        customer: session.customer,
        workspaceId,
        checkoutOrigin,
        resultingTier: 'pro',
        resultingPaymentStatus: 'current',
    });

    if (!workspaceId) {
        // Outbound agent_flux sessions won't have workspaceId — expected, not an error
        if (checkoutOrigin === 'agent_flux_outreach') {
            console.log(`[CHECKOUT_COMPLETED] Outbound sale (origin: agent_flux_outreach), no workspaceId — skipping Clerk update`);
        } else {
            console.error('[CHECKOUT_COMPLETED] No workspaceId in session metadata');
        }
        return;
    }

    try {
        const clerk = await clerkClient();
        // MERGE — preserves stripeAccountId, activation fields, onboarding flags
        await clerk.organizations.updateOrganizationMetadata(workspaceId, {
            publicMetadata: { tier: 'pro', paymentStatus: 'current', activationState: 'paid_unconnected' },
        });
        console.log(`[CHECKOUT_COMPLETED] Upgraded workspace ${workspaceId} to pro`);

        logOnboardingEvent('checkout_completed', {
            workspaceId,
            metadata: { sessionId: session.id },
        });

        logStageTransition('connected_free', 'upgraded', { workspaceId });
    } catch (err) {
        console.error('[CHECKOUT_COMPLETED] Failed to update Clerk org tier:', err);
    }
}

/**
 * invoice.payment_failed — Mark payment as past_due, keep tier pro.
 * This is a health signal, NOT a downgrade authority.
 */
async function handleInvoicePaymentFailed(invoice: any, eventType: string) {
    const { workspaceId, checkoutOrigin } = await resolveWorkspaceFromSubscription(invoice.subscription);

    logBillingEvent('handleInvoicePaymentFailed', {
        eventType,
        stripeObjectId: invoice.id,
        customer: invoice.customer,
        workspaceId,
        checkoutOrigin,
        resultingTier: 'pro',
        resultingPaymentStatus: 'past_due',
    });

    if (!workspaceId) {
        // Authentic event but non-actionable — return cleanly, don't trigger Stripe retries
        console.warn(`[INVOICE_PAYMENT_FAILED] No workspaceId resolvable for invoice ${invoice.id} (customer: ${invoice.customer})`);
        return;
    }

    try {
        const clerk = await clerkClient();
        // MERGE — set paymentStatus only, do NOT touch tier (grace period)
        await clerk.organizations.updateOrganizationMetadata(workspaceId, {
            publicMetadata: { paymentStatus: 'past_due' },
        });
        console.log(`[INVOICE_PAYMENT_FAILED] Workspace ${workspaceId} marked past_due (tier unchanged)`);

        logOnboardingEvent('invoice_payment_failed', {
            workspaceId,
            metadata: { invoiceId: invoice.id, customer: invoice.customer },
        });
    } catch (err) {
        console.error(`[INVOICE_PAYMENT_FAILED] Failed to update workspace ${workspaceId}:`, err);
    }
}

/**
 * invoice.payment_succeeded — Confirm renewal, clear past_due flag.
 */
async function handleInvoicePaymentSucceeded(invoice: any, eventType: string) {
    const { workspaceId, checkoutOrigin } = await resolveWorkspaceFromSubscription(invoice.subscription);

    logBillingEvent('handleInvoicePaymentSucceeded', {
        eventType,
        stripeObjectId: invoice.id,
        customer: invoice.customer,
        workspaceId,
        checkoutOrigin,
        resultingTier: 'pro',
        resultingPaymentStatus: 'current',
    });

    if (!workspaceId) {
        console.warn(`[INVOICE_PAYMENT_SUCCEEDED] No workspaceId resolvable for invoice ${invoice.id} (customer: ${invoice.customer})`);
        return;
    }

    try {
        const clerk = await clerkClient();
        // MERGE — confirm payment health, preserve all other fields
        await clerk.organizations.updateOrganizationMetadata(workspaceId, {
            publicMetadata: { paymentStatus: 'current' },
        });
        console.log(`[INVOICE_PAYMENT_SUCCEEDED] Workspace ${workspaceId} payment confirmed current`);

        logOnboardingEvent('invoice_payment_succeeded', {
            workspaceId,
            metadata: { invoiceId: invoice.id, customer: invoice.customer },
        });
    } catch (err) {
        console.error(`[INVOICE_PAYMENT_SUCCEEDED] Failed to update workspace ${workspaceId}:`, err);
    }
}

/**
 * customer.subscription.updated — Sync tier and paymentStatus from canonical state table.
 * This is a DOWNGRADE AUTHORITY — subscription.status drives tier changes.
 */
async function handleSubscriptionUpdated(subscription: any, eventType: string) {
    const workspaceId = subscription.metadata?.workspaceId || null;
    const checkoutOrigin = subscription.metadata?.checkoutOrigin || null;
    const status = subscription.status as string;
    const billingState = SUBSCRIPTION_STATUS_MAP[status];

    logBillingEvent('handleSubscriptionUpdated', {
        eventType,
        stripeObjectId: subscription.id,
        customer: subscription.customer,
        workspaceId,
        checkoutOrigin,
        resultingTier: billingState?.tier || 'unknown',
        resultingPaymentStatus: billingState?.paymentStatus || status,
    });

    if (!workspaceId) {
        console.warn(`[SUBSCRIPTION_UPDATED] No workspaceId in subscription ${subscription.id} metadata (customer: ${subscription.customer})`);
        return;
    }

    if (!billingState) {
        console.warn(`[SUBSCRIPTION_UPDATED] Unknown subscription status "${status}" for workspace ${workspaceId} — skipping`);
        return;
    }

    try {
        const clerk = await clerkClient();
        // MERGE — apply tier + paymentStatus from canonical table, preserve everything else
        await clerk.organizations.updateOrganizationMetadata(workspaceId, {
            publicMetadata: { tier: billingState.tier, paymentStatus: billingState.paymentStatus },
        });
        console.log(`[SUBSCRIPTION_UPDATED] Workspace ${workspaceId} → tier=${billingState.tier}, paymentStatus=${billingState.paymentStatus} (stripe status: ${status})`);

        logOnboardingEvent('subscription_status_changed', {
            workspaceId,
            metadata: {
                subscriptionId: subscription.id,
                stripeStatus: status,
                tier: billingState.tier,
                paymentStatus: billingState.paymentStatus,
            },
        });
    } catch (err) {
        console.error(`[SUBSCRIPTION_UPDATED] Failed to update workspace ${workspaceId}:`, err);
    }
}

/**
 * customer.subscription.deleted — Hard downgrade to free.
 */
async function handleSubscriptionDeleted(subscription: any, eventType: string) {
    const workspaceId = subscription.metadata?.workspaceId || null;
    const checkoutOrigin = subscription.metadata?.checkoutOrigin || null;

    logBillingEvent('handleSubscriptionDeleted', {
        eventType,
        stripeObjectId: subscription.id,
        customer: subscription.customer,
        workspaceId,
        checkoutOrigin,
        resultingTier: 'free',
        resultingPaymentStatus: 'canceled',
    });

    if (!workspaceId) {
        console.warn(`[SUBSCRIPTION_DELETED] No workspaceId in subscription ${subscription.id} metadata (customer: ${subscription.customer})`);
        return;
    }

    try {
        const clerk = await clerkClient();
        // MERGE — downgrade tier, preserve stripeAccountId and other fields
        await clerk.organizations.updateOrganizationMetadata(workspaceId, {
            publicMetadata: { tier: 'free', paymentStatus: 'canceled' },
        });
        console.log(`[SUBSCRIPTION_DELETED] Downgraded workspace ${workspaceId} to free`);

        logOnboardingEvent('subscription_deleted', {
            workspaceId,
            metadata: { subscriptionId: subscription.id, customer: subscription.customer },
        });
    } catch (err) {
        console.error('[SUBSCRIPTION_DELETED] Failed to update Clerk org tier:', err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PayFlux Ingest Forwarding
// ─────────────────────────────────────────────────────────────────────────────

function normalizeStripeEvent(event: Stripe.Event): any | null {
    if (event.type === 'payment_intent.payment_failed') {
        const pi = event.data.object as any;
        return {
            event_type: 'payment_failed',
            event_timestamp: new Date(event.created * 1000).toISOString(),
            event_id: event.id,
            merchant_id_hash: pi.metadata?.merchant_id || 'unknown',
            payment_intent_id_hash: pi.id,
            processor: 'stripe',
            failure_category: pi.last_payment_error?.code || 'declined',
            retry_count: pi.metadata?.retry_count ? parseInt(pi.metadata.retry_count) : 0,
            geo_bucket: 'US',
        };
    } else if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object as any;
        return {
            event_type: 'payment_succeeded',
            event_timestamp: new Date(event.created * 1000).toISOString(),
            event_id: event.id,
            merchant_id_hash: pi.metadata?.merchant_id || 'unknown',
            payment_intent_id_hash: pi.id,
            processor: 'stripe',
            retry_count: 0,
            geo_bucket: 'US',
        };
    }
    return null;
}

async function forwardToPayFlux(payfluxEvent: any) {
    try {
        const ingestUrl = process.env.PAYFLUX_INGEST_URL;
        const apiKey = process.env.PAYFLUX_API_KEY;

        if (ingestUrl && apiKey) {
            await fetch(ingestUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payfluxEvent),
            });
            await updateStatus();
        }
    } catch (err) {
        console.error('payflux_forward_failed');
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
    const payload = await request.text();
    const sig = request.headers.get('stripe-signature');
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
        const event = constructEvent(payload, sig, secret);

        // Handle billing lifecycle events
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object, event.type);
                break;
            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object, event.type);
                break;
            case 'invoice.payment_succeeded':
                await handleInvoicePaymentSucceeded(event.data.object, event.type);
                break;
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object, event.type);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object, event.type);
                break;
        }

        // Forward payment events to PayFlux ingest
        const payfluxEvent = normalizeStripeEvent(event);
        if (payfluxEvent) {
            await forwardToPayFlux(payfluxEvent);
        }

        return NextResponse.json({ received: true });

    } catch (err: any) {
        if (err.message === 'Missing Stripe-Signature header' || err.message.includes('No signatures found')) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }
        if (err.message === 'Webhook not configured') {
            return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
        }
        if (err.message === 'Not available in this environment') {
            return NextResponse.json({ error: 'Not available in this environment' }, { status: 403 });
        }

        console.error('webhook_signature_verification_failed:', err.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
}
