import { dbQuery } from './client';
import { mapReserveProjectionRow } from './rows';
import type { JsonObject, ReserveProjectionRow } from './types';

export async function createReserveProjection(args: {
    workspaceId: string;
    monitoredEntityId: string;
    baselineSnapshotId: string;
    activationRunId?: string | null;
    modelVersion: string;
    instabilitySignal: string;
    currentRiskTier: number;
    trend: string;
    tierDelta: number;
    projectionBasis: JsonObject;
    reserveProjections: unknown[];
    recommendedInterventions: unknown[];
    simulationDelta?: JsonObject | null;
    volumeMode?: string;
    projectedAt: string;
}): Promise<ReserveProjectionRow> {
    const result = await dbQuery(
        `
        INSERT INTO reserve_projections (
            workspace_id,
            monitored_entity_id,
            baseline_snapshot_id,
            activation_run_id,
            model_version,
            instability_signal,
            current_risk_tier,
            trend,
            tier_delta,
            projection_basis,
            reserve_projections,
            recommended_interventions,
            simulation_delta,
            volume_mode,
            projected_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14, $15)
        RETURNING *
        `,
        [
            args.workspaceId,
            args.monitoredEntityId,
            args.baselineSnapshotId,
            args.activationRunId ?? null,
            args.modelVersion,
            args.instabilitySignal,
            args.currentRiskTier,
            args.trend,
            args.tierDelta,
            JSON.stringify(args.projectionBasis),
            JSON.stringify(args.reserveProjections),
            JSON.stringify(args.recommendedInterventions),
            JSON.stringify(args.simulationDelta ?? null),
            args.volumeMode ?? 'bps_only',
            args.projectedAt,
        ]
    );

    return mapReserveProjectionRow(result.rows[0]);
}

export async function getReserveProjectionById(id: string): Promise<ReserveProjectionRow | null> {
    const result = await dbQuery('SELECT * FROM reserve_projections WHERE id = $1 LIMIT 1', [id]);
    return result.rows[0] ? mapReserveProjectionRow(result.rows[0]) : null;
}

export async function getLatestReserveProjectionByWorkspaceId(workspaceId: string): Promise<ReserveProjectionRow | null> {
    const result = await dbQuery(
        `
        SELECT *
        FROM reserve_projections
        WHERE workspace_id = $1
        ORDER BY projected_at DESC, created_at DESC
        LIMIT 1
        `,
        [workspaceId]
    );

    return result.rows[0] ? mapReserveProjectionRow(result.rows[0]) : null;
}

export async function listReserveProjectionHistoryByWorkspaceId(
    workspaceId: string,
    limit: number = 50
): Promise<ReserveProjectionRow[]> {
    const result = await dbQuery(
        `
        SELECT *
        FROM reserve_projections
        WHERE workspace_id = $1
        ORDER BY projected_at DESC, created_at DESC
        LIMIT $2
        `,
        [workspaceId, limit]
    );

    return result.rows.map(mapReserveProjectionRow);
}
