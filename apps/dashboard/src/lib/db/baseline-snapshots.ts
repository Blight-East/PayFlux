import { dbQuery } from './client';
import { mapBaselineSnapshotRow } from './rows';
import type { BaselineSnapshotRow, JsonObject } from './types';

export async function createBaselineSnapshot(args: {
    workspaceId: string;
    monitoredEntityId: string;
    sourceProcessorConnectionId: string;
    riskTier: number;
    riskBand: string;
    stabilityScore: number;
    trend: string;
    policySurface: JsonObject;
    sourceSummary: JsonObject;
    computedAt: string;
}): Promise<BaselineSnapshotRow> {
    const result = await dbQuery(
        `
        INSERT INTO baseline_snapshots (
            workspace_id,
            monitored_entity_id,
            source_processor_connection_id,
            risk_tier,
            risk_band,
            stability_score,
            trend,
            policy_surface,
            source_summary,
            computed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10)
        RETURNING *
        `,
        [
            args.workspaceId,
            args.monitoredEntityId,
            args.sourceProcessorConnectionId,
            args.riskTier,
            args.riskBand,
            args.stabilityScore,
            args.trend,
            JSON.stringify(args.policySurface),
            JSON.stringify(args.sourceSummary),
            args.computedAt,
        ]
    );

    return mapBaselineSnapshotRow(result.rows[0]);
}

export async function getBaselineSnapshotById(id: string): Promise<BaselineSnapshotRow | null> {
    const result = await dbQuery('SELECT * FROM baseline_snapshots WHERE id = $1 LIMIT 1', [id]);
    return result.rows[0] ? mapBaselineSnapshotRow(result.rows[0]) : null;
}

export async function getLatestBaselineSnapshotByWorkspaceId(workspaceId: string): Promise<BaselineSnapshotRow | null> {
    const result = await dbQuery(
        `
        SELECT *
        FROM baseline_snapshots
        WHERE workspace_id = $1
        ORDER BY computed_at DESC, created_at DESC
        LIMIT 1
        `,
        [workspaceId]
    );

    return result.rows[0] ? mapBaselineSnapshotRow(result.rows[0]) : null;
}
