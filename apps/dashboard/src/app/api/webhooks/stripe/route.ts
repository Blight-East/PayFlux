import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { clerkClient } from '@clerk/nextjs/server';
import fs from 'fs/promises';
import path from 'path';

const STATUS_PATH = path.join(process.cwd(), 'data', 'status.json');

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
    // Require signature header
    if (!sig) {
        throw new Error('Missing Stripe-Signature header');
    }

    // In non-dev environments, require a valid whsec_ secret
    if (!isTestBypassAllowed() && !isValidStripeSecret(secret)) {
        console.warn('webhook_config_error: STRIPE_WEBHOOK_SECRET must start with whsec_');
        throw new Error('Webhook not configured');
    }

    // Test bypass: only in dev mode with explicit flag
    if (isTestBypassAllowed() && sig === 'test_bypass') {
        return JSON.parse(payload) as Stripe.Event;
    }

    if (isValidStripeSecret(secret)) {
        // Use a dummy API key for constructEvent (it doesn't make network calls)
        const stripe = new Stripe('sk_test_dummy');
        return stripe.webhooks.constructEvent(payload, sig, secret);
    }

    // Bypass attempted outside dev
    console.warn('webhook_bypass_blocked: test bypass attempted outside development');
    throw new Error('Not available in this environment');
}

// Helper: Normalize Stripe event to PayFlux format
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

// Helper: Handle checkout.session.completed — upgrade Clerk org tier to "pro"
async function handleCheckoutCompleted(session: any) {
    const workspaceId = session.metadata?.workspaceId;
    if (!workspaceId) {
        console.error('[CHECKOUT_COMPLETED] No workspaceId in session metadata');
        return;
    }

    try {
        const clerk = await clerkClient();
        await clerk.organizations.updateOrganization(workspaceId, {
            publicMetadata: { tier: 'pro' },
        });
        console.log(`[CHECKOUT_COMPLETED] Upgraded workspace ${workspaceId} to pro`);
    } catch (err) {
        console.error('[CHECKOUT_COMPLETED] Failed to update Clerk org tier:', err);
    }
}

// Helper: Handle customer.subscription.deleted — downgrade Clerk org tier to "free"
async function handleSubscriptionDeleted(subscription: any) {
    const workspaceId = subscription.metadata?.workspaceId;
    if (!workspaceId) {
        console.error('[SUBSCRIPTION_DELETED] No workspaceId in subscription metadata');
        return;
    }

    try {
        const clerk = await clerkClient();
        await clerk.organizations.updateOrganization(workspaceId, {
            publicMetadata: { tier: 'free' },
        });
        console.log(`[SUBSCRIPTION_DELETED] Downgraded workspace ${workspaceId} to free`);
    } catch (err) {
        console.error('[SUBSCRIPTION_DELETED] Failed to update Clerk org tier:', err);
    }
}

// Helper: Forward event to PayFlux Ingest API
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

export async function POST(request: Request) {
    const payload = await request.text();
    const sig = request.headers.get('stripe-signature');
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
        const event = constructEvent(payload, sig, secret);

        // Handle billing lifecycle events
        if (event.type === 'checkout.session.completed') {
            await handleCheckoutCompleted(event.data.object);
        } else if (event.type === 'customer.subscription.deleted') {
            await handleSubscriptionDeleted(event.data.object);
        }

        // Forward payment events to PayFlux ingest
        const payfluxEvent = normalizeStripeEvent(event);
        if (payfluxEvent) {
            await forwardToPayFlux(payfluxEvent);
        }

        return NextResponse.json({ received: true });

    } catch (err: any) {
        // Map specific error messages to status codes
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
