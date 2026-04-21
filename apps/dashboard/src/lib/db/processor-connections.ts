import { dbQuery } from './client';
import { mapProcessorConnectionRow } from './rows';
import type { JsonObject, ProcessorConnectionRow, ProcessorConnectionStatus } from './types';

export async function getStripeProcessorConnectionByWorkspaceId(
    workspaceId: string
): Promise<ProcessorConnectionRow | null> {
    const result = await dbQuery(
        'SELECT * FROM processor_connections WHERE workspace_id = $1 AND provider = $2 LIMIT 1',
        [workspaceId, 'stripe']
    );
    return result.rows[0] ? mapProcessorConnectionRow(result.rows[0]) : null;
}

// Reverse lookup: given a Stripe connected-account id (acct_…) from an inbound
// Connect webhook event, find the workspace that owns it. The stripe_account_id
// column is UNIQUE, so this is the inverse of upsertStripeProcessorConnection.
export async function getStripeProcessorConnectionByStripeAccountId(
    stripeAccountId: string
): Promise<ProcessorConnectionRow | null> {
    const result = await dbQuery(
        'SELECT * FROM processor_connections WHERE provider = $1 AND stripe_account_id = $2 LIMIT 1',
        ['stripe', stripeAccountId]
    );
    return result.rows[0] ? mapProcessorConnectionRow(result.rows[0]) : null;
}

// Shallow-merge keys into connection_metadata without overwriting unrelated
// keys. Used by the lazy country lookup in resolveMerchantContextFromEvent so
// the first webhook for a merchant pays the Stripe API roundtrip and every
// subsequent webhook reads from cache.
export async function mergeStripeProcessorConnectionMetadata(
    connectionId: string,
    patch: JsonObject
): Promise<void> {
    await dbQuery(
        `UPDATE processor_connections
         SET connection_metadata = COALESCE(connection_metadata, '{}'::jsonb) || $2::jsonb,
             updated_at = now()
         WHERE id = $1`,
        [connectionId, JSON.stringify(patch)]
    );
}

export async function upsertStripeProcessorConnection(args: {
    workspaceId: string;
    stripeAccountId: string;
    oauthScope: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    status?: ProcessorConnectionStatus;
    connectionMetadata?: JsonObject;
}): Promise<ProcessorConnectionRow> {
    const result = await dbQuery(
        `
        INSERT INTO processor_connections (
            workspace_id,
            provider,
            stripe_account_id,
            status,
            oauth_scope,
            connected_at,
            connection_metadata,
            access_token,
            refresh_token,
            token_expires_at
        )
        VALUES ($1, 'stripe', $2, $3, $4, now(), $5::jsonb, $6, $7, $8)
        ON CONFLICT (workspace_id, provider) DO UPDATE
        SET
            stripe_account_id = EXCLUDED.stripe_account_id,
            status = EXCLUDED.status,
            oauth_scope = EXCLUDED.oauth_scope,
            connected_at = COALESCE(processor_connections.connected_at, EXCLUDED.connected_at),
            disconnected_at = NULL,
            connection_metadata = EXCLUDED.connection_metadata,
            access_token = COALESCE(EXCLUDED.access_token, processor_connections.access_token),
            refresh_token = COALESCE(EXCLUDED.refresh_token, processor_connections.refresh_token),
            token_expires_at = COALESCE(EXCLUDED.token_expires_at, processor_connections.token_expires_at),
            updated_at = now()
        RETURNING *
        `,
        [
            args.workspaceId,
            args.stripeAccountId,
            args.status ?? 'connected',
            args.oauthScope,
            JSON.stringify(args.connectionMetadata ?? {}),
            args.accessToken ?? null,
            args.refreshToken ?? null,
            args.tokenExpiresAt ? args.tokenExpiresAt.toISOString() : null,
        ]
    );

    return mapProcessorConnectionRow(result.rows[0]);
}

export async function setStripeWebhookSecret(
    workspaceId: string,
    webhookSecret: string
): Promise<void> {
    await dbQuery(
        `UPDATE processor_connections
         SET connection_metadata = jsonb_set(connection_metadata, '{webhook_secret}', $2::jsonb)
         WHERE workspace_id = $1 AND provider = 'stripe'`,
        [workspaceId, JSON.stringify(webhookSecret)]
    );
}
