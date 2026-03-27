import type { PoolClient } from 'pg';
import { dbQuery, withDbTransaction } from './client';
import { mapWorkspaceRow, normalizeHostCandidate } from './rows';
import type {
    JsonObject,
    WorkspaceActivationState,
    WorkspacePaymentStatus,
    WorkspaceRow,
    WorkspaceStatus,
    WorkspaceTier,
} from './types';

interface ResolveWorkspaceRecordArgs {
    clerkOrgId: string;
    name: string;
    ownerClerkUserId?: string | null;
}

interface UpdateWorkspaceStateArgs {
    workspaceId: string;
    entitlementTier?: WorkspaceTier;
    paymentStatus?: WorkspacePaymentStatus;
    activationState?: WorkspaceActivationState;
    status?: WorkspaceStatus;
}

export interface AttachScanSummaryArgs {
    workspaceId: string;
    primaryHostCandidate: string | null;
    latestScanSummary: JsonObject;
}

export async function findWorkspaceByClerkOrgId(clerkOrgId: string): Promise<WorkspaceRow | null> {
    const result = await dbQuery('SELECT * FROM workspaces WHERE clerk_org_id = $1 LIMIT 1', [clerkOrgId]);
    return result.rows[0] ? mapWorkspaceRow(result.rows[0]) : null;
}

export async function findWorkspaceById(workspaceId: string): Promise<WorkspaceRow | null> {
    const result = await dbQuery('SELECT * FROM workspaces WHERE id = $1 LIMIT 1', [workspaceId]);
    return result.rows[0] ? mapWorkspaceRow(result.rows[0]) : null;
}

export async function resolveOrCreateWorkspaceRecord(
    args: ResolveWorkspaceRecordArgs
): Promise<WorkspaceRow> {
    const result = await dbQuery(
        `
        INSERT INTO workspaces (clerk_org_id, name, owner_clerk_user_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (clerk_org_id) DO UPDATE
        SET
            name = EXCLUDED.name,
            owner_clerk_user_id = COALESCE(workspaces.owner_clerk_user_id, EXCLUDED.owner_clerk_user_id),
            updated_at = now()
        RETURNING *
        `,
        [args.clerkOrgId, args.name, args.ownerClerkUserId ?? null]
    );

    return mapWorkspaceRow(result.rows[0]);
}

export async function updateWorkspaceState(args: UpdateWorkspaceStateArgs): Promise<WorkspaceRow> {
    const fields: string[] = ['updated_at = now()'];
    const values: unknown[] = [];
    let position = 1;

    if (args.entitlementTier !== undefined) {
        fields.push(`entitlement_tier = $${position++}`);
        values.push(args.entitlementTier);
    }
    if (args.paymentStatus !== undefined) {
        fields.push(`payment_status = $${position++}`);
        values.push(args.paymentStatus);
    }
    if (args.activationState !== undefined) {
        fields.push(`activation_state = $${position++}`);
        values.push(args.activationState);
    }
    if (args.status !== undefined) {
        fields.push(`status = $${position++}`);
        values.push(args.status);
    }

    values.push(args.workspaceId);

    const result = await dbQuery(
        `UPDATE workspaces SET ${fields.join(', ')} WHERE id = $${position} RETURNING *`,
        values
    );

    if (!result.rows[0]) {
        throw new Error(`Workspace not found: ${args.workspaceId}`);
    }

    return mapWorkspaceRow(result.rows[0]);
}

export async function attachWorkspaceScanSummary(args: AttachScanSummaryArgs): Promise<WorkspaceRow> {
    const result = await dbQuery(
        `
        UPDATE workspaces
        SET
            primary_host_candidate = $2,
            scan_attached_at = now(),
            latest_scan_summary = $3::jsonb,
            updated_at = now()
        WHERE id = $1
        RETURNING *
        `,
        [args.workspaceId, normalizeHostCandidate(args.primaryHostCandidate), JSON.stringify(args.latestScanSummary)]
    );

    if (!result.rows[0]) {
        throw new Error(`Workspace not found: ${args.workspaceId}`);
    }

    return mapWorkspaceRow(result.rows[0]);
}

export async function withWorkspaceTransaction<T>(
    fn: (client: PoolClient) => Promise<T>
): Promise<T> {
    return withDbTransaction(fn);
}

