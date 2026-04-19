import type Stripe from 'stripe';

import {
    getStripeProcessorConnectionByStripeAccountId,
    mergeStripeProcessorConnectionMetadata,
} from '@/lib/db/processor-connections';
import { findWorkspaceById } from '@/lib/db/workspaces';

export interface MerchantContext {
    /** Internal workspace UUID — the canonical merchant identifier inside PayFlux. */
    workspaceId: string;
    /** Stripe connected-account id (acct_…). */
    stripeAccountId: string;
    /** Workspace tier at the moment the event was processed. */
    entitlementTier: 'free' | 'pro' | 'enterprise';
    /** Public host the workspace is monitoring (if scanned) — null when unset. */
    primaryHost: string | null;
    /** Coarse geo bucket — 'US' | 'EU' | 'UK' | 'OTHER' — or null if Stripe call failed. */
    geoBucket: string | null;
}

// Conservative bucketing: US, UK, EU member states, otherwise OTHER. Keeps
// the 'geo_bucket' field <= 20 chars per the Go ingest validator.
const EU_COUNTRIES = new Set([
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
    'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
    'SI', 'ES', 'SE',
]);

function bucketCountry(countryCode: string | null | undefined): string | null {
    if (!countryCode) return null;
    const upper = countryCode.toUpperCase();
    if (upper === 'US') return 'US';
    if (upper === 'GB') return 'UK';
    if (EU_COUNTRIES.has(upper)) return 'EU';
    return 'OTHER';
}

let _stripeClient: Stripe | null = null;

async function getStripeClient(): Promise<Stripe | null> {
    if (_stripeClient) return _stripeClient;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    const { default: StripeCtor } = await import('stripe');
    _stripeClient = new StripeCtor(key);
    return _stripeClient;
}

/**
 * Resolve country from connection_metadata cache; on miss, ask Stripe and
 * write back to the cache so subsequent events skip the round-trip.
 */
async function resolveCountryBucket(
    connectionId: string,
    stripeAccountId: string,
    metadata: Record<string, unknown>
): Promise<string | null> {
    const cached = metadata.country;
    if (typeof cached === 'string' && cached.length === 2) {
        return bucketCountry(cached);
    }

    const stripe = await getStripeClient();
    if (!stripe) return null;

    try {
        const account = await stripe.accounts.retrieve(stripeAccountId);
        const country = account.country ?? null;
        if (country) {
            await mergeStripeProcessorConnectionMetadata(connectionId, { country });
        }
        return bucketCountry(country);
    } catch (err) {
        console.error('stripe_account_country_lookup_failed', {
            stripeAccountId,
            message: err instanceof Error ? err.message : String(err),
        });
        return null;
    }
}

/**
 * Resolve the merchant context behind a Connect-flavoured Stripe event.
 *
 * Stripe stamps Connect events with `event.account = "acct_…"` — that field is
 * the only ground truth tying an inbound webhook to a connected merchant. We
 * use the unique `stripe_account_id` index on `processor_connections` to find
 * the workspace, then load the workspace row for tier + host metadata. The
 * country lookup is cached on `connection_metadata.country` so only the first
 * webhook per merchant pays the Stripe round-trip.
 *
 * Returns null when:
 *   - The event has no `event.account` (platform-only events such as the
 *     dashboard's own billing webhooks live in this branch).
 *   - The connected account isn't recognised — this can happen if a workspace
 *     disconnected, or if the event arrived before the OAuth callback finished
 *     persisting the connection.
 *
 * Callers should treat a null return as "not a per-merchant Connect event"
 * and skip merchant-attributed forwarding rather than fall back to
 * `merchant_id: 'unknown'`.
 */
export async function resolveMerchantContextFromEvent(
    event: Stripe.Event
): Promise<MerchantContext | null> {
    const stripeAccountId = (event as Stripe.Event & { account?: string | null }).account;
    if (!stripeAccountId) {
        return null;
    }

    const connection = await getStripeProcessorConnectionByStripeAccountId(stripeAccountId);
    if (!connection || connection.status !== 'connected') {
        return null;
    }

    const workspace = await findWorkspaceById(connection.workspace_id);
    if (!workspace || workspace.deleted_at) {
        return null;
    }

    const geoBucket = await resolveCountryBucket(
        connection.id,
        stripeAccountId,
        connection.connection_metadata ?? {}
    );

    return {
        workspaceId: workspace.id,
        stripeAccountId,
        entitlementTier: workspace.entitlement_tier,
        primaryHost: workspace.primary_host_candidate,
        geoBucket,
    };
}
