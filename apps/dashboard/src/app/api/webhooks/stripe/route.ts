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

function isValidStripeSecret(secret: string | undefined | null): secret is string {
    return !!secret && secret.startsWith('whsec_') && secret.length > 10;
}

async function updateStatus() {
    await fs.mkdir(path.dirname(STATUS_PATH), { recursive: true });
    await fs.writeFile(STATUS_PATH, JSON.stringify({ lastEventAt: new Date().toISOString() }));
}

type VerifyOutcome = 'primary' | 'fallback' | 'connect' | 'per_account' | 'fail' | 'no_signature' | 'malformed';

type ConstructEventResult =
    | { event: Stripe.Event; outcome: 'primary' | 'fallback' | 'connect' | 'per_account' }
    | { event: null; outcome: 'no_signature' | 'malformed' | 'fail'; reason: string };

// Try a sequence of (label, secret) pairs. Returns on first success. The
// label is used for telemetry so we can observe rotation completing — a
// gradual rise in 'fallback' followed by a return to 'primary' means a
// rotation is being absorbed correctly. The 'connect' label specifically
// tags deliveries from the Connect endpoint, which has its own signing
// secret distinct from the platform endpoint.
function constructEventDual(
    payload: string,
    sig: string | null,
    candidates: Array<{ label: 'primary' | 'fallback' | 'connect' | 'per_account'; secret: string }>,
): ConstructEventResult {
    if (!sig) {
        return { event: null, outcome: 'no_signature', reason: 'Missing Stripe-Signature header' };
    }

    if (isTestBypassAllowed() && sig === 'test_bypass') {
        try {
            return { event: JSON.parse(payload) as Stripe.Event, outcome: 'primary' };
        } catch (e) {
            return { event: null, outcome: 'malformed', reason: 'test bypass payload not JSON' };
        }
    }

    const stripe = getStripeClient();
    if (!stripe) {
        return { event: null, outcome: 'fail', reason: 'Stripe client not configured' };
    }

    let lastError = 'no candidate secrets';
    for (const { label, secret } of candidates) {
        if (!isValidStripeSecret(secret)) continue;
        try {
            const event = stripe.webhooks.constructEvent(payload, sig, secret);
            return { event, outcome: label };
        } catch (err) {
            lastError = err instanceof Error ? err.message : String(err);
            // Try next candidate.
        }
    }
    return { event: null, outcome: 'fail', reason: lastError };
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

// Identifies the deployed code that wrote this ledger row. Captured per-row
// so that historical replay can reason about ingestion-side behavior changes
// (signature verify logic, fail-open semantics, normalization rules). Falls
// back to "unknown" so the column's NOT NULL constraint never blocks an
// insert just because the env var is missing on a misconfigured deploy.
const INGESTION_VERSION =
    process.env.PAYFLUX_GIT_SHA ||
    process.env.COMMIT_REF ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    'unknown';

// Append-only audit record. Captured BEFORE signature verification so that
// signature failures, malformed bodies, and unsigned probes are all visible
// to forensics. Failure to write the ledger row never blocks request
// processing — losing audit history is bad, but losing a real Stripe event
// because the audit table is unavailable is worse.
async function recordIncomingDelivery(args: {
    stripeEventId: string | null;
    payload: string;
    signatureHeader: string | null;
    verifyOutcome: VerifyOutcome;
    payloadSchemaVersion: string | null;
}) {
    try {
        await dbQuery(`
            INSERT INTO stripe_event_ledger (
                stripe_event_id, payload, payload_size_bytes, signature_header,
                verify_outcome, payload_schema_version, ingestion_version
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            args.stripeEventId,
            args.payload,
            Buffer.byteLength(args.payload, 'utf8'),
            args.signatureHeader,
            args.verifyOutcome,
            args.payloadSchemaVersion,
            INGESTION_VERSION,
        ]);
    } catch (err) {
        console.error('[WEBHOOK] Ledger insert failed:', err);
    }
}

function emitWebhookTelemetry(payload: {
    event_id: string | null;
    event_type: string | null;
    verify_outcome: VerifyOutcome;
    state_machine_outcome: 'process' | 'completed' | 'in_flight' | 'success' | 'error' | 'rejected';
    processing_ms: number;
    http_status: number;
    error_message?: string;
}) {
    // Single-line JSON so log shippers can parse cheaply. Sentry picks up
    // emissions automatically once SENTRY_DSN is set on Netlify.
    console.log(JSON.stringify({
        event: 'webhook_received',
        timestamp: new Date().toISOString(),
        ...payload,
    }));
}

export async function POST(request: Request) {
    const t0 = Date.now();
    const payload = await request.text();
    const sig = request.headers.get('stripe-signature');

    // Build the candidate secrets list in priority order:
    //   per-account (Connect merchant secret stored at OAuth time, when present)
    //   primary    (STRIPE_WEBHOOK_SECRET — the active platform secret)
    //   fallback   (STRIPE_WEBHOOK_SECRET_FALLBACK — previous secret, optional)
    // The fallback slot makes secret rotation atomic: set fallback to the old
    // secret, set primary to the new secret, deploy. In-flight events signed
    // with either verify successfully. Once Stripe has caught up to the new
    // secret (no more 'fallback' outcomes in telemetry), drop the fallback.
    let perAccountSecret: string | null = null;
    let parsedEventId: string | null = null;
    let parsedSchemaVersion: string | null = null;
    try {
        const parsedBody = JSON.parse(payload);
        if (parsedBody && typeof parsedBody.id === 'string') {
            parsedEventId = parsedBody.id;
        }
        // Captured pre-verification so it's available for ledger rows recording
        // signature failures (those still get a schema version; the bytes were
        // valid JSON, just signed with the wrong key).
        if (parsedBody && typeof parsedBody.api_version === 'string') {
            parsedSchemaVersion = parsedBody.api_version;
        }
        if (parsedBody && typeof parsedBody.account === 'string') {
            const accountId: string = parsedBody.account;
            const conn = await getStripeProcessorConnectionByStripeAccountId(accountId);
            const candidate = conn?.connection_metadata?.webhook_secret;
            if (typeof candidate === 'string' && candidate) {
                perAccountSecret = candidate;
            }
        }
    } catch (err) {
        // Body is not JSON. Record the malformed delivery and reject.
        // Schema version is null here — we cannot read api_version from a body
        // we couldn't parse.
        await recordIncomingDelivery({
            stripeEventId: null,
            payload,
            signatureHeader: sig,
            verifyOutcome: 'malformed',
            payloadSchemaVersion: null,
        });
        emitWebhookTelemetry({
            event_id: null,
            event_type: null,
            verify_outcome: 'malformed',
            state_machine_outcome: 'rejected',
            processing_ms: Date.now() - t0,
            http_status: 400,
            error_message: err instanceof Error ? err.message : String(err),
        });
        return NextResponse.json({ error: 'Malformed body' }, { status: 400 });
    }

    // Candidate order:
    //   per_account  — Connect merchant secret stored in processor_connections at OAuth time, when present
    //   primary      — STRIPE_WEBHOOK_SECRET, the active platform endpoint signing secret
    //   connect      — STRIPE_CONNECT_WEBHOOK_SECRET, the Connect endpoint signing secret (separate Stripe endpoint with connect:true)
    //   fallback     — STRIPE_WEBHOOK_SECRET_FALLBACK, transitional slot for rotation of any of the above
    //
    // 'connect' sits between 'primary' and 'fallback' so that during a rotation
    // of the platform secret, fallback is the last resort and Connect deliveries
    // are still tagged correctly in telemetry.
    const candidates: Array<{ label: 'primary' | 'fallback' | 'connect' | 'per_account'; secret: string }> = [];
    if (perAccountSecret) candidates.push({ label: 'per_account', secret: perAccountSecret });
    if (process.env.STRIPE_WEBHOOK_SECRET) {
        candidates.push({ label: 'primary', secret: process.env.STRIPE_WEBHOOK_SECRET });
    }
    if (process.env.STRIPE_CONNECT_WEBHOOK_SECRET) {
        candidates.push({ label: 'connect', secret: process.env.STRIPE_CONNECT_WEBHOOK_SECRET });
    }
    if (process.env.STRIPE_WEBHOOK_SECRET_FALLBACK) {
        candidates.push({ label: 'fallback', secret: process.env.STRIPE_WEBHOOK_SECRET_FALLBACK });
    }

    const verifyResult = constructEventDual(payload, sig, candidates);

    if (verifyResult.event === null) {
        // Capture the rejected delivery for forensics (signature failures and
        // unsigned probes are themselves a security signal). Use the schema
        // version we extracted pre-verification — even rejected events have
        // a meaningful api_version when the body parsed.
        await recordIncomingDelivery({
            stripeEventId: parsedEventId,
            payload,
            signatureHeader: sig,
            verifyOutcome: verifyResult.outcome,
            payloadSchemaVersion: parsedSchemaVersion,
        });
        emitWebhookTelemetry({
            event_id: parsedEventId,
            event_type: null,
            verify_outcome: verifyResult.outcome,
            state_machine_outcome: 'rejected',
            processing_ms: Date.now() - t0,
            http_status: verifyResult.outcome === 'no_signature' ? 400 : 400,
            error_message: verifyResult.reason,
        });
        if (verifyResult.outcome === 'no_signature') {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }
        if (verifyResult.reason === 'Stripe client not configured') {
            return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
        }
        console.error('webhook_signature_verification_failed:', verifyResult.reason);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = verifyResult.event;
    const verifyOutcome = verifyResult.outcome;
    const eventTimestamp = new Date(event.created * 1000).toISOString();

    // Capture verified delivery to the ledger before any side-effecting work.
    // event.api_version is Stripe's authoritative schema declaration for the
    // verified event — prefer it over the pre-parsed value from the raw body.
    await recordIncomingDelivery({
        stripeEventId: event.id,
        payload,
        signatureHeader: sig,
        verifyOutcome,
        payloadSchemaVersion: event.api_version || parsedSchemaVersion,
    });

    const outcome = await claimWebhookEvent(event.id);
    if (outcome.kind === 'completed') {
        emitWebhookTelemetry({
            event_id: event.id,
            event_type: event.type,
            verify_outcome: verifyOutcome,
            state_machine_outcome: 'completed',
            processing_ms: Date.now() - t0,
            http_status: 200,
        });
        return NextResponse.json({ received: true, deduplicated: true });
    }
    if (outcome.kind === 'in_flight') {
        emitWebhookTelemetry({
            event_id: event.id,
            event_type: event.type,
            verify_outcome: verifyOutcome,
            state_machine_outcome: 'in_flight',
            processing_ms: Date.now() - t0,
            http_status: 200,
        });
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
        emitWebhookTelemetry({
            event_id: event.id,
            event_type: event.type,
            verify_outcome: verifyOutcome,
            state_machine_outcome: 'success',
            processing_ms: Date.now() - t0,
            http_status: 200,
        });
        return NextResponse.json({ received: true });
    } catch (err: any) {
        // Persist for diagnostics; leave status='received' so a Stripe retry
        // re-attempts (after STALE_RECEIVED_MS) and the Go-side dedup absorbs
        // any duplicate forward. Return 5xx so Stripe retries on its own
        // schedule rather than us swallowing the failure with a 200.
        await recordWebhookError(event.id, err);
        const message = err instanceof Error ? err.message : String(err);
        emitWebhookTelemetry({
            event_id: event.id,
            event_type: event.type,
            verify_outcome: verifyOutcome,
            state_machine_outcome: 'error',
            processing_ms: Date.now() - t0,
            http_status: 500,
            error_message: message,
        });
        console.error('webhook_processing_failed:', {
            event_id: event.id,
            event_type: event.type,
            message,
        });
        return NextResponse.json({ error: 'Processing failed; will retry' }, { status: 500 });
    }
}
