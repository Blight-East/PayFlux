import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { logOnboardingEvent, logStageTransition } from '@/lib/onboarding-events-server';
import { ensurePendingActivationRun } from '@/lib/db/activation-runs';
import {
    deriveEffectiveWorkspaceTier,
    findSubscriptionByStripeSubscriptionId,
    mapStripeStatusToSubscriptionStatus,
    mapStripeStatusToWorkspacePaymentStatus,
    upsertBillingCustomer,
    upsertSubscriptionFromStripe,
} from '@/lib/db/billing';
import { upsertMonitoredEntityForStripeConnection, getMonitoredEntityByWorkspaceId } from '@/lib/db/monitored-entities';
import { getStripeProcessorConnectionByWorkspaceId, getStripeProcessorConnectionByStripeAccountId } from '@/lib/db/processor-connections';
import { findWorkspaceByClerkOrgId, findWorkspaceById, updateWorkspaceState } from '@/lib/db/workspaces';
import { mirrorWorkspaceStateToClerk } from '@/lib/clerk-mirror';
import { resolveMerchantContextFromEvent } from '@/lib/stripe/resolveMerchantContextFromEvent';
import { dbQuery } from '@/lib/db/client';

const STATUS_PATH = path.join(process.cwd(), 'data', 'status.json');

type BillingState = {
    effectiveTier: 'free' | 'pro' | 'enterprise';
    paymentStatus: 'none' | 'current' | 'trialing' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired';
    subscriptionStatus: 'checkout_pending' | 'trialing' | 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired';
};

let _stripeClient: Stripe | null = null;

function getStripeClient(): Stripe | null {
    if (_stripeClient) return _stripeClient;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    _stripeClient = new Stripe(key);
    return _stripeClient;
}

function isTestBypassAllowed(): boolean {
    const isDev = process.env.NODE_ENV === 'development';
    const bypassEnabled = process.env.DASHBOARD_WEBHOOK_TEST_BYPASS === 'true';
    return isDev && bypassEnabled;
}

function isValidStripeSecret(secret: string | undefined): secret is string {
    return !!secret && secret.startsWith('whsec_') && secret.length > 10;
}

async function updateStatus() {
    await fs.mkdir(path.dirname(STATUS_PATH), { recursive: true });
    await fs.writeFile(STATUS_PATH, JSON.stringify({ lastEventAt: new Date().toISOString() }));
}

function constructEvent(payload: string, sig: string | null, secret: string | undefined): Stripe.Event {
    if (!sig) {
        throw new Error('Missing Stripe-Signature header');
    }

    if (!isTestBypassAllowed() && !isValidStripeSecret(secret)) {
        console.warn('webhook_config_error: STRIPE_WEBHOOK_SECRET must start with whsec_');
        throw new Error('Webhook not configured');
    }

    if (isTestBypassAllowed() && sig === 'test_bypass') {
        return JSON.parse(payload) as Stripe.Event;
    }

    if (isValidStripeSecret(secret)) {
        const stripe = getStripeClient()!;
        return stripe.webhooks.constructEvent(payload, sig, secret);
    }

    console.warn('webhook_bypass_blocked: test bypass attempted outside development');
    throw new Error('Not available in this environment');
}

function normalizeStripeId(value: unknown): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null && 'id' in value && typeof (value as any).id === 'string') {
        return (value as any).id;
    }
    return null;
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
    return normalizeStripeId((invoice as Stripe.Invoice & { subscription?: unknown }).subscription);
}

function toIsoFromEpoch(epochSeconds?: number | null): string | null {
    if (!epochSeconds || !Number.isFinite(epochSeconds)) return null;
    return new Date(epochSeconds * 1000).toISOString();
}

function deriveBillingState(rawStatus: string): BillingState {
    const subscriptionStatus = mapStripeStatusToSubscriptionStatus(rawStatus);
    const effectiveTier = deriveEffectiveWorkspaceTier(subscriptionStatus, 'pro');
    const paymentStatus = mapStripeStatusToWorkspacePaymentStatus(rawStatus);
    return { effectiveTier, paymentStatus, subscriptionStatus };
}

async function resolveWorkspaceRecordIdFromMetadataValue(workspaceIdOrClerkOrgId: string | null | undefined): Promise<string | null> {
    if (!workspaceIdOrClerkOrgId) return null;

    const byId = await findWorkspaceById(workspaceIdOrClerkOrgId);
    if (byId) return byId.id;

    const byClerkOrgId = await findWorkspaceByClerkOrgId(workspaceIdOrClerkOrgId);
    if (byClerkOrgId) return byClerkOrgId.id;

    return null;
}

async function resolveWorkspaceRecordIdFromSubscription(
    subscriptionOrId: Stripe.Subscription | string | null | undefined
): Promise<string | null> {
    const directId = normalizeStripeId(subscriptionOrId);
    if (typeof subscriptionOrId === 'object' && subscriptionOrId?.metadata?.workspaceId) {
        const resolved = await resolveWorkspaceRecordIdFromMetadataValue(subscriptionOrId.metadata.workspaceId);
        if (resolved) return resolved;
    }

    if (!directId) return null;

    const existing = await findSubscriptionByStripeSubscriptionId(directId);
    if (existing) return existing.workspace_id;

    const stripe = getStripeClient();
    if (!stripe) return null;

    try {
        const subscription = await stripe.subscriptions.retrieve(directId);
        const metadataWorkspaceId = subscription.metadata?.workspaceId || null;
        return resolveWorkspaceRecordIdFromMetadataValue(metadataWorkspaceId);
    } catch (error) {
        console.warn('[WEBHOOK] Failed to resolve workspace from subscription', { subscriptionId: directId, error });
        return null;
    }
}

async function retrieveSubscription(subscriptionOrId: Stripe.Subscription | string | null | undefined): Promise<Stripe.Subscription | null> {
    if (!subscriptionOrId) return null;
    if (typeof subscriptionOrId === 'object') {
        return subscriptionOrId as Stripe.Subscription;
    }

    const stripe = getStripeClient();
    if (!stripe) return null;

    try {
        return await stripe.subscriptions.retrieve(subscriptionOrId);
    } catch (error) {
        console.warn('[WEBHOOK] Failed to retrieve subscription', { subscriptionId: subscriptionOrId, error });
        return null;
    }
}

async function syncWorkspaceBillingState(args: {
    workspaceRecordId: string;
    stripeCustomerId: string | null;
    stripeSubscription: Stripe.Subscription | null;
    checkoutSessionId?: string | null;
    trigger: 'checkout_completed' | 'invoice_payment_failed' | 'invoice_payment_succeeded' | 'subscription_updated' | 'subscription_deleted';
    eventTimestamp: string;
}): Promise<void> {
    const workspace = await findWorkspaceById(args.workspaceRecordId);
    if (!workspace) {
        console.error('[WEBHOOK] Workspace not found', { workspaceRecordId: args.workspaceRecordId });
        return;
    }

    if (!args.stripeCustomerId) {
        console.error('[WEBHOOK] Missing stripe customer id', { workspaceRecordId: args.workspaceRecordId });
        return;
    }

    const billingCustomer = await upsertBillingCustomer({
        workspaceId: workspace.id,
        stripeCustomerId: args.stripeCustomerId,
    });

    const rawStatus = args.stripeSubscription?.status ?? (args.trigger === 'checkout_completed' ? 'active' : 'checkout_pending');
    const billingState = deriveBillingState(rawStatus);

    if (args.stripeSubscription) {
        await upsertSubscriptionFromStripe({
            workspaceId: workspace.id,
            billingCustomerId: billingCustomer.id,
            stripeSubscriptionId: args.stripeSubscription.id,
            stripeCheckoutSessionId: args.checkoutSessionId ?? null,
            stripePriceId: args.stripeSubscription.items.data[0]?.price?.id ?? null,
            status: billingState.subscriptionStatus,
            grantsTier: 'pro',
            rawStatus,
            currentPeriodStart: toIsoFromEpoch((args.stripeSubscription as any).current_period_start ?? null),
            currentPeriodEnd: toIsoFromEpoch((args.stripeSubscription as any).current_period_end ?? null),
            cancelAtPeriodEnd: args.stripeSubscription.cancel_at_period_end,
            canceledAt: toIsoFromEpoch(args.stripeSubscription.canceled_at ?? null),
            trialStart: toIsoFromEpoch(args.stripeSubscription.trial_start ?? null),
            trialEnd: toIsoFromEpoch(args.stripeSubscription.trial_end ?? null),
            latestInvoiceId: normalizeStripeId(args.stripeSubscription.latest_invoice),
            lastWebhookEventAt: args.eventTimestamp,
            lastReconciledAt: args.eventTimestamp,
        });
    }

    const processorConnection = await getStripeProcessorConnectionByWorkspaceId(workspace.id);
    let monitoredEntity = await getMonitoredEntityByWorkspaceId(workspace.id);
    if (processorConnection && !monitoredEntity) {
        monitoredEntity = await upsertMonitoredEntityForStripeConnection({
            workspaceId: workspace.id,
            processorConnectionId: processorConnection.id,
            primaryHost: workspace.primary_host_candidate,
            primaryHostSource: workspace.primary_host_candidate ? 'scan' : 'unknown',
            status: 'pending',
        });
    }

    let activationState = workspace.activation_state;
    if (billingState.effectiveTier === 'free') {
        activationState = 'not_started';
    } else if (args.trigger === 'checkout_completed') {
        activationState = processorConnection && monitoredEntity ? 'ready_for_activation' : processorConnection ? 'connection_pending_verification' : 'paid_unconnected';
    } else if (workspace.activation_state === 'not_started') {
        activationState = processorConnection && monitoredEntity ? 'ready_for_activation' : processorConnection ? 'connection_pending_verification' : 'paid_unconnected';
    }

    const updatedWorkspace = await updateWorkspaceState({
        workspaceId: workspace.id,
        entitlementTier: billingState.effectiveTier,
        paymentStatus: billingState.paymentStatus,
        activationState,
    });

    if (billingState.effectiveTier !== 'free' && processorConnection) {
        await ensurePendingActivationRun({
            workspaceId: workspace.id,
            processorConnectionId: processorConnection.id,
            monitoredEntityId: monitoredEntity?.id ?? null,
            trigger: args.trigger === 'checkout_completed' ? 'post_payment' : 'system_reconcile',
            triggeredBy: 'webhook',
        });
    }

    await mirrorWorkspaceStateToClerk(updatedWorkspace.clerk_org_id, {
        tier: updatedWorkspace.entitlement_tier,
        paymentStatus: updatedWorkspace.payment_status,
        activationState: updatedWorkspace.activation_state,
    });
}

function logBillingEvent(
    handler: string,
    details: {
        eventType: string;
        stripeObjectId: string;
        customer?: string | null;
        workspaceId?: string | null;
        resultingTier?: string;
        resultingPaymentStatus?: string;
        error?: string;
    }
) {
    console.log(`[BILLING] ${JSON.stringify({ handler, ...details, ts: new Date().toISOString() })}`);
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, eventType: string, eventTimestamp: string) {
    const workspaceRecordId = await resolveWorkspaceRecordIdFromMetadataValue(session.metadata?.workspaceId);
    const stripeCustomerId = normalizeStripeId(session.customer);
    const subscription = await retrieveSubscription(normalizeStripeId(session.subscription));

    logBillingEvent('handleCheckoutCompleted', {
        eventType,
        stripeObjectId: session.id,
        customer: stripeCustomerId,
        workspaceId: workspaceRecordId,
        resultingTier: 'pro',
        resultingPaymentStatus: subscription?.status ?? 'current',
    });

    if (!workspaceRecordId) {
        console.error('[CHECKOUT_COMPLETED] No workspaceRecordId resolved from session metadata');
        return;
    }

    await syncWorkspaceBillingState({
        workspaceRecordId,
        stripeCustomerId,
        stripeSubscription: subscription,
        checkoutSessionId: session.id,
        trigger: 'checkout_completed',
        eventTimestamp,
    });

    logOnboardingEvent('checkout_completed', {
        workspaceId: workspaceRecordId,
        metadata: { sessionId: session.id, clerkOrgId: session.metadata?.clerkOrgId ?? null },
    });

    // Fine-grained "money landed" signal so operator alerts (PR #42) can
    // fire on user_paid without depending on the broader subscription_status
    // bus. Carries the Stripe customer + subscription ids so a follow-up
    // alert can link directly to the Stripe dashboard.
    logOnboardingEvent('user_paid', {
        workspaceId: workspaceRecordId,
        metadata: {
            sessionId: session.id,
            stripeCustomerId,
            stripeSubscriptionId: subscription?.id ?? null,
            subscriptionStatus: subscription?.status ?? 'active',
            workspaceName: session.metadata?.workspaceName ?? null,
        },
    });

    logStageTransition('connected_free', 'upgraded', { workspaceId: workspaceRecordId });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, eventType: string, eventTimestamp: string) {
    const invoiceSubscriptionId = getInvoiceSubscriptionId(invoice);
    const subscription = await retrieveSubscription(invoiceSubscriptionId);
    const workspaceRecordId = await resolveWorkspaceRecordIdFromSubscription(subscription ?? invoiceSubscriptionId);
    const stripeCustomerId = normalizeStripeId(invoice.customer);

    logBillingEvent('handleInvoicePaymentFailed', {
        eventType,
        stripeObjectId: invoice.id,
        customer: stripeCustomerId,
        workspaceId: workspaceRecordId,
        resultingTier: 'pro',
        resultingPaymentStatus: 'past_due',
    });

    if (!workspaceRecordId) {
        console.warn('[INVOICE_PAYMENT_FAILED] No workspace resolved', { invoiceId: invoice.id });
        return;
    }

    await syncWorkspaceBillingState({
        workspaceRecordId,
        stripeCustomerId,
        stripeSubscription: subscription,
        trigger: 'invoice_payment_failed',
        eventTimestamp,
    });

    logOnboardingEvent('invoice_payment_failed', {
        workspaceId: workspaceRecordId,
        metadata: { invoiceId: invoice.id, customer: stripeCustomerId },
    });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, eventType: string, eventTimestamp: string) {
    const invoiceSubscriptionId = getInvoiceSubscriptionId(invoice);
    const subscription = await retrieveSubscription(invoiceSubscriptionId);
    const workspaceRecordId = await resolveWorkspaceRecordIdFromSubscription(subscription ?? invoiceSubscriptionId);
    const stripeCustomerId = normalizeStripeId(invoice.customer);

    logBillingEvent('handleInvoicePaymentSucceeded', {
        eventType,
        stripeObjectId: invoice.id,
        customer: stripeCustomerId,
        workspaceId: workspaceRecordId,
        resultingTier: 'pro',
        resultingPaymentStatus: subscription?.status ?? 'current',
    });

    if (!workspaceRecordId) {
        console.warn('[INVOICE_PAYMENT_SUCCEEDED] No workspace resolved', { invoiceId: invoice.id });
        return;
    }

    await syncWorkspaceBillingState({
        workspaceRecordId,
        stripeCustomerId,
        stripeSubscription: subscription,
        trigger: 'invoice_payment_succeeded',
        eventTimestamp,
    });

    logOnboardingEvent('invoice_payment_succeeded', {
        workspaceId: workspaceRecordId,
        metadata: { invoiceId: invoice.id, customer: stripeCustomerId },
    });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription, eventType: string, eventTimestamp: string) {
    const workspaceRecordId = await resolveWorkspaceRecordIdFromSubscription(subscription);
    const stripeCustomerId = normalizeStripeId(subscription.customer);
    const billingState = deriveBillingState(subscription.status);

    logBillingEvent('handleSubscriptionUpdated', {
        eventType,
        stripeObjectId: subscription.id,
        customer: stripeCustomerId,
        workspaceId: workspaceRecordId,
        resultingTier: billingState.effectiveTier,
        resultingPaymentStatus: billingState.paymentStatus,
    });

    if (!workspaceRecordId) {
        console.warn('[SUBSCRIPTION_UPDATED] No workspace resolved', { subscriptionId: subscription.id });
        return;
    }

    await syncWorkspaceBillingState({
        workspaceRecordId,
        stripeCustomerId,
        stripeSubscription: subscription,
        trigger: 'subscription_updated',
        eventTimestamp,
    });

    logOnboardingEvent('subscription_status_changed', {
        workspaceId: workspaceRecordId,
        metadata: {
            subscriptionId: subscription.id,
            stripeStatus: subscription.status,
            effectiveTier: billingState.effectiveTier,
            paymentStatus: billingState.paymentStatus,
        },
    });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, eventType: string, eventTimestamp: string) {
    const workspaceRecordId = await resolveWorkspaceRecordIdFromSubscription(subscription);
    const stripeCustomerId = normalizeStripeId(subscription.customer);

    logBillingEvent('handleSubscriptionDeleted', {
        eventType,
        stripeObjectId: subscription.id,
        customer: stripeCustomerId,
        workspaceId: workspaceRecordId,
        resultingTier: 'free',
        resultingPaymentStatus: 'canceled',
    });

    if (!workspaceRecordId) {
        console.warn('[SUBSCRIPTION_DELETED] No workspace resolved', { subscriptionId: subscription.id });
        return;
    }

    await syncWorkspaceBillingState({
        workspaceRecordId,
        stripeCustomerId,
        stripeSubscription: subscription,
        trigger: 'subscription_deleted',
        eventTimestamp,
    });

    logOnboardingEvent('subscription_deleted', {
        workspaceId: workspaceRecordId,
        metadata: { subscriptionId: subscription.id, customer: stripeCustomerId },
    });
}

// PayFlux ingest event shape — kept loose until the Go side advertises a
// versioned schema. `merchant_id_hash` is the workspace UUID, not a hash, but
// we keep the legacy field name so the Go decoder doesn't have to change.
type PayFluxEvent =
    | {
          event_type: 'payment_failed';
          event_timestamp: string;
          event_id: string;
          merchant_id_hash: string;
          payment_intent_id_hash: string;
          processor: 'stripe';
          failure_category: string;
          retry_count: number;
          geo_bucket: string | null;
      }
    | {
          event_type: 'payment_succeeded';
          event_timestamp: string;
          event_id: string;
          merchant_id_hash: string;
          payment_intent_id_hash: string;
          processor: 'stripe';
          retry_count: number;
          geo_bucket: string | null;
      };

// Go's /v1/events/payment_exhaust validates `event_id` as a UUID and dedups
// on it. Stripe ids are `evt_…` not UUIDs, so we map them to a deterministic
// UUIDv5 (DNS namespace) — same evt_id always produces the same UUID, which
// preserves Go-side idempotency across webhook retries.
const EVENT_NS_BYTES = Buffer.from('6ba7b8109dad11d180b400c04fd430c8', 'hex');

function stripeEventIdToUuid(stripeEventId: string): string {
    const hash = createHash('sha1');
    hash.update(EVENT_NS_BYTES);
    hash.update(stripeEventId);
    const bytes = hash.digest().subarray(0, 16);
    bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

async function normalizeStripeEvent(event: Stripe.Event): Promise<PayFluxEvent | null> {
    if (event.type !== 'payment_intent.payment_failed' && event.type !== 'payment_intent.succeeded') {
        return null;
    }

    // Connect events carry the connected acct_… in event.account. Without it we
    // can't attribute the event to a workspace, and we'd rather drop than send
    // anonymous junk to Go.
    const merchant = await resolveMerchantContextFromEvent(event);
    if (!merchant) {
        return null;
    }

    const pi = event.data.object as Stripe.PaymentIntent;
    const eventTimestamp = new Date(event.created * 1000).toISOString();

    const eventUuid = stripeEventIdToUuid(event.id);

    if (event.type === 'payment_intent.payment_failed') {
        const lastError = (pi as Stripe.PaymentIntent & { last_payment_error?: { code?: string | null } }).last_payment_error;
        const retryRaw = pi.metadata?.retry_count;
        return {
            event_type: 'payment_failed',
            event_timestamp: eventTimestamp,
            event_id: eventUuid,
            merchant_id_hash: merchant.workspaceId,
            payment_intent_id_hash: pi.id,
            processor: 'stripe',
            failure_category: lastError?.code || 'declined',
            retry_count: retryRaw ? parseInt(retryRaw, 10) || 0 : 0,
            geo_bucket: merchant.geoBucket,
        };
    }

    return {
        event_type: 'payment_succeeded',
        event_timestamp: eventTimestamp,
        event_id: eventUuid,
        merchant_id_hash: merchant.workspaceId,
        payment_intent_id_hash: pi.id,
        processor: 'stripe',
        retry_count: 0,
        geo_bucket: merchant.geoBucket,
    };
}

class PayFluxForwardError extends Error {
    constructor(message: string, readonly status?: number) {
        super(message);
        this.name = 'PayFluxForwardError';
    }
}

async function forwardToPayFlux(payfluxEvent: PayFluxEvent) {
    const ingestUrl = process.env.PAYFLUX_INGEST_URL;
    const apiKey = process.env.PAYFLUX_API_KEY;

    if (!ingestUrl || !apiKey) {
        // Forwarding is opt-in. Until both vars are set, normalize-and-drop is
        // the intended behaviour — see .env.example for the cutover note.
        return;
    }

    let res: Response;
    try {
        res = await fetch(ingestUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payfluxEvent),
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('payflux_forward_failed', {
            event_type: payfluxEvent.event_type,
            event_id: payfluxEvent.event_id,
            message,
        });
        throw new PayFluxForwardError(`payflux_forward_failed: ${message}`);
    }

    if (!res.ok) {
        console.error('payflux_forward_non_2xx', {
            status: res.status,
            event_type: payfluxEvent.event_type,
            event_id: payfluxEvent.event_id,
        });
        throw new PayFluxForwardError(`payflux_forward_non_2xx: ${res.status}`, res.status);
    }

    await updateStatus();
}

// Window during which a 'received' row is treated as another instance still
// processing — return 200 in_flight without re-running side effects. Past this
// threshold the row is assumed to be from a crashed handler and we re-attempt.
// Stripe's retry intervals (5min, 1h, ...) make 5 minutes a safe choice: the
// soonest retry is exactly at the boundary, so a stuck handler is detected on
// the first retry rather than waiting an hour.
const STALE_RECEIVED_MS = 5 * 60 * 1000;

type DedupRow = {
    status: 'received' | 'completed';
    created_at: string;
    attempts: number;
};

type DedupOutcome =
    | { kind: 'process' }              // claim acquired or stale row reclaimed; run side effects
    | { kind: 'completed' }            // already finished; return 200 deduplicated
    | { kind: 'in_flight' };           // another instance is processing right now

async function claimWebhookEvent(stripeEventId: string): Promise<DedupOutcome> {
    let claim;
    try {
        claim = await dbQuery<{ id: string }>(`
            INSERT INTO processed_webhooks (stripe_event_id, status)
            VALUES ($1, 'received')
            ON CONFLICT (stripe_event_id) DO NOTHING
            RETURNING id
        `, [stripeEventId]);
    } catch (err) {
        // Fail open: if Postgres is struggling, run the work and rely on
        // downstream idempotency (Go-side Redis SETNX dedup) to absorb the
        // duplicate. Better than silently dropping a real event.
        console.error('[WEBHOOK] dedup insert failed; failing open:', err);
        return { kind: 'process' };
    }

    if ((claim.rowCount ?? 0) > 0) {
        return { kind: 'process' };
    }

    const existing = await dbQuery<DedupRow>(`
        SELECT status, created_at, attempts
        FROM processed_webhooks
        WHERE stripe_event_id = $1
    `, [stripeEventId]);

    const row = existing.rows[0];
    if (!row) {
        // Race: row was deleted between INSERT conflict and SELECT. Treat as new.
        return { kind: 'process' };
    }

    if (row.status === 'completed') {
        return { kind: 'completed' };
    }

    const ageMs = Date.now() - new Date(row.created_at).getTime();
    if (ageMs < STALE_RECEIVED_MS) {
        return { kind: 'in_flight' };
    }

    // Stale 'received' row — original handler crashed. Reclaim and re-process.
    // The downstream signal_failure_velocity counter may double-count in this
    // path; that's preferred over silent loss. Tighten only when the counter
    // gains a read site that cares about exact-once accuracy.
    await dbQuery(`
        UPDATE processed_webhooks
        SET attempts = attempts + 1,
            updated_at = now(),
            last_error = NULL
        WHERE stripe_event_id = $1
    `, [stripeEventId]);
    console.warn(`[WEBHOOK] Reclaiming stale 'received' event ${stripeEventId} (age ${ageMs}ms, prior attempts ${row.attempts})`);
    return { kind: 'process' };
}

async function markWebhookCompleted(stripeEventId: string) {
    await dbQuery(`
        UPDATE processed_webhooks
        SET status = 'completed',
            completed_at = now(),
            updated_at = now(),
            last_error = NULL
        WHERE stripe_event_id = $1
    `, [stripeEventId]);
}

async function recordWebhookError(stripeEventId: string, err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    try {
        await dbQuery(`
            UPDATE processed_webhooks
            SET last_error = $2, updated_at = now()
            WHERE stripe_event_id = $1
        `, [stripeEventId, message.slice(0, 1000)]);
    } catch (writeErr) {
        // Best-effort; the original error is what matters.
        console.error('[WEBHOOK] Failed to persist last_error:', writeErr);
    }
}

export async function POST(request: Request) {
    const payload = await request.text();
    const sig = request.headers.get('stripe-signature');
    let secret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
        const parsedBody = JSON.parse(payload);
        const accountId = parsedBody.account;
        if (accountId && typeof accountId === 'string') {
            const conn = await getStripeProcessorConnectionByStripeAccountId(accountId);
            if (conn?.connection_metadata?.webhook_secret) {
                secret = String(conn.connection_metadata.webhook_secret);
            }
        }
    } catch (e) {
        // Ignored, let constructEvent handle invalid JSON
    }

    let event: Stripe.Event;
    try {
        event = constructEvent(payload, sig, secret);
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

    const eventTimestamp = new Date(event.created * 1000).toISOString();

    const outcome = await claimWebhookEvent(event.id);
    if (outcome.kind === 'completed') {
        console.log(`[WEBHOOK] Deflected replay for event ${event.id}`);
        return NextResponse.json({ received: true, deduplicated: true });
    }
    if (outcome.kind === 'in_flight') {
        console.log(`[WEBHOOK] Event ${event.id} is in flight on another instance`);
        return NextResponse.json({ received: true, in_flight: true });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, event.type, eventTimestamp);
                break;
            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, event.type, eventTimestamp);
                break;
            case 'invoice.payment_succeeded':
                await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, event.type, eventTimestamp);
                break;
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, event.type, eventTimestamp);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, event.type, eventTimestamp);
                break;
        }

        const payfluxEvent = await normalizeStripeEvent(event);
        if (payfluxEvent) {
            if (payfluxEvent.event_type === 'payment_failed') {
                await dbQuery(`
                    INSERT INTO signal_failure_velocity (workspace_id, hour_bucket, failure_count)
                    VALUES ($1, date_trunc('hour', now()), 1)
                    ON CONFLICT (workspace_id, hour_bucket) DO UPDATE
                    SET failure_count = signal_failure_velocity.failure_count + 1;
                `, [payfluxEvent.merchant_id_hash]);
            }
            await forwardToPayFlux(payfluxEvent);
        }

        await markWebhookCompleted(event.id);
        return NextResponse.json({ received: true });
    } catch (err: any) {
        // Persist for diagnostics; leave status='received' so a Stripe retry
        // re-attempts (after STALE_RECEIVED_MS) and the Go-side dedup absorbs
        // any duplicate forward. Return 5xx so Stripe retries on its own
        // schedule rather than us swallowing the failure with a 200.
        await recordWebhookError(event.id, err);
        console.error('webhook_processing_failed:', {
            event_id: event.id,
            event_type: event.type,
            message: err instanceof Error ? err.message : String(err),
        });
        return NextResponse.json({ error: 'Processing failed; will retry' }, { status: 500 });
    }
}
