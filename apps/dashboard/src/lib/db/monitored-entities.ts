import { dbQuery } from './client';
import { mapMonitoredEntityRow, normalizeHostCandidate } from './rows';
import type { HostSource, MonitoredEntityRow, MonitoredEntityStatus } from './types';

export async function getMonitoredEntityByWorkspaceId(workspaceId: string): Promise<MonitoredEntityRow | null> {
    const result = await dbQuery('SELECT * FROM monitored_entities WHERE workspace_id = $1 LIMIT 1', [workspaceId]);
    return result.rows[0] ? mapMonitoredEntityRow(result.rows[0]) : null;
}

export async function upsertMonitoredEntityForStripeConnection(args: {
    workspaceId: string;
    processorConnectionId: string;
    primaryHost?: string | null;
    primaryHostSource?: HostSource;
    status?: MonitoredEntityStatus;
}): Promise<MonitoredEntityRow> {
    const result = await dbQuery(
        `
        INSERT INTO monitored_entities (
            workspace_id,
            processor_connection_id,
            entity_type,
            status,
            primary_host,
            primary_host_source
        )
        VALUES ($1, $2, 'stripe_account', $3, $4, $5)
        ON CONFLICT (workspace_id) DO UPDATE
        SET
            processor_connection_id = EXCLUDED.processor_connection_id,
            status = EXCLUDED.status,
            primary_host = COALESCE(monitored_entities.primary_host, EXCLUDED.primary_host),
            primary_host_source = CASE
                WHEN monitored_entities.primary_host IS NULL AND EXCLUDED.primary_host IS NOT NULL THEN EXCLUDED.primary_host_source
                ELSE monitored_entities.primary_host_source
            END,
            updated_at = now()
        RETURNING *
        `,
        [
            args.workspaceId,
            args.processorConnectionId,
            args.status ?? 'pending',
            normalizeHostCandidate(args.primaryHost ?? null),
            args.primaryHostSource ?? 'unknown',
        ]
    );

    return mapMonitoredEntityRow(result.rows[0]);
}

export async function hydrateMonitoredEntityPrimaryHost(args: {
    workspaceId: string;
    primaryHost: string | null;
    primaryHostSource: HostSource;
}): Promise<MonitoredEntityRow | null> {
    const result = await dbQuery(
        `
        UPDATE monitored_entities
        SET
            primary_host = COALESCE(primary_host, $2),
            primary_host_source = CASE
                WHEN primary_host IS NULL AND $2 IS NOT NULL THEN $3
                ELSE primary_host_source
            END,
            updated_at = now()
        WHERE workspace_id = $1
        RETURNING *
        `,
        [args.workspaceId, normalizeHostCandidate(args.primaryHost), args.primaryHostSource]
    );

    return result.rows[0] ? mapMonitoredEntityRow(result.rows[0]) : null;
}

export async function markMonitoredEntityReady(args: {
    workspaceId: string;
    baselineSnapshotId: string;
    projectionId: string;
    firstDataAt?: string | null;
    lastDataAt?: string | null;
    lastSyncAt?: string | null;
}): Promise<MonitoredEntityRow> {
    const result = await dbQuery(
        `
        UPDATE monitored_entities
        SET
            status = 'ready',
            current_baseline_snapshot_id = $2,
            current_projection_id = $3,
            first_data_at = COALESCE(first_data_at, $4),
            last_data_at = COALESCE($5, last_data_at),
            last_sync_at = COALESCE($6, now()),
            ready_at = COALESCE(ready_at, now()),
            updated_at = now()
        WHERE workspace_id = $1
        RETURNING *
        `,
        [
            args.workspaceId,
            args.baselineSnapshotId,
            args.projectionId,
            args.firstDataAt ?? null,
            args.lastDataAt ?? null,
            args.lastSyncAt ?? null,
        ]
    );

    if (!result.rows[0]) {
        throw new Error(`Monitored entity not found for workspace: ${args.workspaceId}`);
    }

    return mapMonitoredEntityRow(result.rows[0]);
}
