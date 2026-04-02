import { dbQuery } from './client';
import { mapWorkspaceApiKeyRow } from './rows';
import type { WorkspaceApiKeyRow } from './types';

export async function listWorkspaceApiKeys(workspaceId: string): Promise<WorkspaceApiKeyRow[]> {
    const result = await dbQuery(
        `
        SELECT *
        FROM workspace_api_keys
        WHERE workspace_id = $1
        ORDER BY created_at DESC
        `,
        [workspaceId]
    );

    return result.rows.map(mapWorkspaceApiKeyRow);
}

export async function createWorkspaceApiKey(args: {
    workspaceId: string;
    label: string;
    keyPrefix: string;
    keyHash: string;
    createdByClerkUserId?: string | null;
}): Promise<WorkspaceApiKeyRow> {
    const result = await dbQuery(
        `
        INSERT INTO workspace_api_keys (
            workspace_id,
            label,
            key_prefix,
            key_hash,
            created_by_clerk_user_id
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [
            args.workspaceId,
            args.label,
            args.keyPrefix,
            args.keyHash,
            args.createdByClerkUserId ?? null,
        ]
    );

    return mapWorkspaceApiKeyRow(result.rows[0]);
}

export async function revokeWorkspaceApiKey(args: {
    workspaceId: string;
    keyId: string;
}): Promise<WorkspaceApiKeyRow | null> {
    const result = await dbQuery(
        `
        UPDATE workspace_api_keys
        SET
            revoked_at = COALESCE(revoked_at, now()),
            updated_at = now()
        WHERE workspace_id = $1
          AND id = $2
        RETURNING *
        `,
        [args.workspaceId, args.keyId]
    );

    return result.rows[0] ? mapWorkspaceApiKeyRow(result.rows[0]) : null;
}

export async function findActiveWorkspaceApiKeyByHash(keyHash: string): Promise<WorkspaceApiKeyRow | null> {
    const result = await dbQuery(
        `
        SELECT *
        FROM workspace_api_keys
        WHERE key_hash = $1
          AND revoked_at IS NULL
        LIMIT 1
        `,
        [keyHash]
    );

    return result.rows[0] ? mapWorkspaceApiKeyRow(result.rows[0]) : null;
}

export async function touchWorkspaceApiKeyLastUsed(keyId: string): Promise<void> {
    await dbQuery(
        `
        UPDATE workspace_api_keys
        SET
            last_used_at = now(),
            updated_at = now()
        WHERE id = $1
        `,
        [keyId]
    );
}
