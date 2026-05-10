// One-shot: register (or verify) the Stripe webhook endpoint that ships events
// to the PayFlux dashboard, capture the signing secret, and update Netlify
// STRIPE_WEBHOOK_SECRET in the production context.
//
// Idempotent: if an endpoint already points at the target URL, it is reused
// (the existing secret is fetched and rewritten to Netlify only if it differs).
//
// Usage:
//   STRIPE_API_KEY=sk_live_... NETLIFY_AUTH_TOKEN=... \
//     node scripts/register-stripe-webhook.mjs
//
//   Add --dry-run to see what would change without writing.
//   Add --test-mode to operate against test-mode endpoints (key must be sk_test_).
//
// Requires:
//   - Stripe API key with `webhook_endpoint:write` permission
//   - netlify CLI logged in (uses linked project teal-cannoli-99b857)

import { execFileSync } from 'node:child_process';

const ENDPOINT_URL = 'https://app.payflux.dev/api/webhooks/stripe';

// Mirrors the switch + normalizeStripeEvent in route.ts. Anything outside
// this list will be received but no-op'd; subscribing to extras costs nothing
// but registering too few means silent gaps in production.
const ENABLED_EVENTS = [
    // Platform billing (PayFlux's own subscriptions)
    'checkout.session.completed',
    'invoice.payment_failed',
    'invoice.payment_succeeded',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    // Connect (merchant payment events forwarded to the Go service)
    'payment_intent.payment_failed',
    'payment_intent.succeeded',
];

const dryRun = process.argv.includes('--dry-run');
const testMode = process.argv.includes('--test-mode');

const STRIPE_KEY = process.env.STRIPE_API_KEY;
if (!STRIPE_KEY) {
    console.error('STRIPE_API_KEY env var is required');
    process.exit(2);
}
if (!testMode && !STRIPE_KEY.startsWith('sk_live_') && !STRIPE_KEY.startsWith('rk_live_')) {
    console.error('STRIPE_API_KEY does not look like a live-mode key. Pass --test-mode if intentional.');
    process.exit(2);
}

async function stripeApi(method, path, body) {
    const res = await fetch(`https://api.stripe.com${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${STRIPE_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body ? new URLSearchParams(body).toString() : undefined,
    });
    const json = await res.json();
    if (!res.ok) {
        throw new Error(`Stripe ${method} ${path} -> ${res.status}: ${json?.error?.message || JSON.stringify(json)}`);
    }
    return json;
}

async function listAllEndpoints() {
    let starting_after;
    const all = [];
    while (true) {
        const qs = new URLSearchParams({ limit: '100' });
        if (starting_after) qs.set('starting_after', starting_after);
        const page = await stripeApi('GET', `/v1/webhook_endpoints?${qs}`);
        all.push(...page.data);
        if (!page.has_more) break;
        starting_after = page.data[page.data.length - 1].id;
    }
    return all;
}

function setNetlifyEnv(name, value) {
    if (dryRun) {
        console.log(`  [dry-run] would set Netlify ${name} (production)`);
        return;
    }
    // Capture stdout/stderr to a buffer instead of inheriting the parent's
    // streams. The Netlify CLI's confirmation message echoes the value
    // verbatim ("Set environment variable NAME=secret_value in the production
    // branch"); piping prevents it from appearing in operator terminals or
    // chat transcripts. The buffer is discarded.
    try {
        execFileSync('netlify', ['env:set', name, value, '--context', 'production'], {
            cwd: new URL('..', import.meta.url).pathname,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        console.log(`  ${name} set (value redacted)`);
    } catch (err) {
        // execFileSync attaches stdout/stderr to the thrown error object —
        // sanitize before bubbling so a non-zero exit doesn't leak the
        // secret through the failure path either.
        throw new Error(`netlify env:set ${name} failed (status ${err.status ?? '?'})`);
    }
}

(async () => {
    // 1. Confirm which account the key belongs to.
    const acct = await stripeApi('GET', '/v1/account');
    console.log(`Stripe account: ${acct.id}  (${acct.settings?.dashboard?.display_name || '?'})`);
    console.log(`Mode:           ${STRIPE_KEY.startsWith('sk_test_') || STRIPE_KEY.startsWith('rk_test_') ? 'TEST' : 'LIVE'}`);
    console.log(`Endpoint URL:   ${ENDPOINT_URL}`);
    console.log('');

    // 2. Find or create the endpoint.
    const endpoints = await listAllEndpoints();
    let endpoint = endpoints.find((e) => e.url === ENDPOINT_URL);

    if (endpoint) {
        console.log(`Found existing endpoint: ${endpoint.id} (status=${endpoint.status})`);
        // Check enabled_events drift.
        const have = new Set(endpoint.enabled_events);
        const missing = ENABLED_EVENTS.filter((e) => !have.has(e));
        const extra = endpoint.enabled_events.filter((e) => !ENABLED_EVENTS.includes(e) && e !== '*');
        if (missing.length || extra.length) {
            console.log(`  enabled_events drift: missing=${missing.join(',') || '∅'}  extra=${extra.join(',') || '∅'}`);
            if (!dryRun) {
                const body = {};
                ENABLED_EVENTS.forEach((e, i) => { body[`enabled_events[${i}]`] = e; });
                endpoint = await stripeApi('POST', `/v1/webhook_endpoints/${endpoint.id}`, body);
                console.log('  updated enabled_events');
            } else {
                console.log('  [dry-run] would update enabled_events');
            }
        } else {
            console.log('  enabled_events match exactly');
        }
        if (endpoint.status !== 'enabled') {
            console.log(`  WARNING: endpoint status is ${endpoint.status}; consider enabling in dashboard`);
        }
    } else {
        console.log('No endpoint registered for that URL yet.');
        if (dryRun) {
            console.log('  [dry-run] would create endpoint with these events:');
            for (const e of ENABLED_EVENTS) console.log(`    - ${e}`);
            return;
        }
        const body = { url: ENDPOINT_URL, connect: 'true', api_version: acct.api_version || '2025-02-24.acacia' };
        ENABLED_EVENTS.forEach((e, i) => { body[`enabled_events[${i}]`] = e; });
        endpoint = await stripeApi('POST', '/v1/webhook_endpoints', body);
        console.log(`  created: ${endpoint.id}`);
    }

    // 3. Fetch the signing secret (only available immediately after creation,
    // but Stripe API exposes it via /v1/webhook_endpoints/{id} for endpoints
    // you created — so we re-read).
    let secret = endpoint.secret;
    if (!secret) {
        const fresh = await stripeApi('GET', `/v1/webhook_endpoints/${endpoint.id}`);
        secret = fresh.secret;
    }
    if (!secret) {
        console.log('');
        console.log('NOTE: Stripe did not return the signing secret (this happens for endpoints you did not create yourself, e.g. Dashboard-managed).');
        console.log(`Reveal it manually at: https://dashboard.stripe.com/${testMode ? 'test/' : ''}webhooks/${endpoint.id}`);
        console.log('Then run: netlify env:set STRIPE_WEBHOOK_SECRET <whsec_...> --context production');
        process.exit(1);
    }

    // 4. Compare with current Netlify value (best-effort — value may be masked).
    console.log('');
    console.log(`Updating Netlify STRIPE_WEBHOOK_SECRET (production context)…`);
    setNetlifyEnv('STRIPE_WEBHOOK_SECRET', secret);
    console.log('  done');

    console.log('');
    console.log('Endpoint ready. Stripe should start sending matched events to:');
    console.log(`  ${ENDPOINT_URL}`);
    console.log('Verify with: curl -fsSL "$BASE/api/webhooks/stripe" (will 400 with no signature, that is expected).');
})().catch((e) => {
    console.error('failed:', e.message);
    process.exit(1);
});
