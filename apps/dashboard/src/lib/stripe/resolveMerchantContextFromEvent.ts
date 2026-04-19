import type Stripe from 'stripe';

import { getStripeProcessorConnectionByStripeAccountId } from '@/lib/db/processor-connections';
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
}

/**
 * Resolve the merchant context behind a Connect-flavoured Stripe event.
 *
 * Stripe stamps Connect events with `event.account = "acct_…"` — that field is
 * the only ground truth tying an inbound webhook to a connected merchant. We
 * use the unique `stripe_account_id` index on `processor_connections` to find
 * the workspace, then load the workspace row for tier + host metadata.
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

    return {
        workspaceId: workspace.id,
        stripeAccountId,
        entitlementTier: workspace.entitlement_tier,
        primaryHost: workspace.primary_host_candidate,
    };
}
