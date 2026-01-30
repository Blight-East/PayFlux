import { NextResponse } from 'next/server';
import Stripe from 'stripe';
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

export async function POST(request: Request) {
    const payload = await request.text();
    const sig = request.headers.get('stripe-signature');
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    // Require signature header
    if (!sig) {
        return NextResponse.json({ error: 'Missing Stripe-Signature header' }, { status: 400 });
    }

    // In non-dev environments, require a valid whsec_ secret
    if (!isTestBypassAllowed() && !isValidStripeSecret(secret)) {
        console.warn('webhook_config_error: STRIPE_WEBHOOK_SECRET must start with whsec_');
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    let event: Stripe.Event;

    try {
        // Test bypass: only in dev mode with explicit flag
        if (isTestBypassAllowed() && sig === 'test_bypass') {
            event = JSON.parse(payload) as Stripe.Event;
        } else if (isValidStripeSecret(secret)) {
            // Use a dummy API key for constructEvent (it doesn't make network calls)
            const stripe = new Stripe('sk_test_dummy');
            event = stripe.webhooks.constructEvent(payload, sig, secret);
        } else {
            // Bypass attempted outside dev
            console.warn('webhook_bypass_blocked: test bypass attempted outside development');
            return NextResponse.json({ error: 'Not available in this environment' }, { status: 403 });
        }
    } catch (err: any) {
        console.error('webhook_signature_verification_failed:', err.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Normalize event
    let payfluxEvent: any = null;

    if (event.type === 'payment_intent.payment_failed') {
        const pi = event.data.object as any;
        payfluxEvent = {
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
        payfluxEvent = {
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


    if (payfluxEvent) {
        const ingestUrl = process.env.PAYFLUX_INGEST_URL;
        const apiKey = process.env.PAYFLUX_API_KEY;

        try {
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
        } catch (err: unknown) {
            const e = err as { name?: string; message?: string; stack?: string };
            console.error('payflux_forward_failed', {
                stripe_event_id: event.id,
                stripe_event_type: event.type,
                stripe_event_created: event.created,
                attempted_forward: Boolean(ingestUrl && apiKey),
                error_name: e?.name,
                error_message: e?.message,
                // optional: include first line only to avoid log spam
                error_stack: e?.stack ? e.stack.split('\n').slice(0, 2).join('\n') : undefined,
            });
        }
    }


    return NextResponse.json({ received: true });
}
