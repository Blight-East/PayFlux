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

export async function upsertStripeProcessorConnection(args: {
    workspaceId: string;
    stripeAccountId: string;
    oauthScope: string;
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
            connection_metadata
        )
        VALUES ($1, 'stripe', $2, $3, $4, now(), $5::jsonb)
        ON CONFLICT (workspace_id, provider) DO UPDATE
        SET
            stripe_account_id = EXCLUDED.stripe_account_id,
            status = EXCLUDED.status,
            oauth_scope = EXCLUDED.oauth_scope,
            connected_at = COALESCE(processor_connections.connected_at, EXCLUDED.connected_at),
            disconnected_at = NULL,
            connection_metadata = EXCLUDED.connection_metadata,
            updated_at = now()
        RETURNING *
        `,
        [
            args.workspaceId,
            args.stripeAccountId,
            args.status ?? 'connected',
            args.oauthScope,
            JSON.stringify(args.connectionMetadata ?? {}),
        ]
    );

    return mapProcessorConnectionRow(result.rows[0]);
}

