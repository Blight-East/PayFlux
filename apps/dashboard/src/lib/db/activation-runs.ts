import { dbQuery } from './client';
import { mapActivationRunRow } from './rows';
import type { ActivationRunRow, ActivationTrigger } from './types';

export async function getLatestActivationRunByWorkspaceId(workspaceId: string): Promise<ActivationRunRow | null> {
    const result = await dbQuery(
        `
        SELECT *
        FROM activation_runs
        WHERE workspace_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [workspaceId]
    );

    return result.rows[0] ? mapActivationRunRow(result.rows[0]) : null;
}

export async function getLatestCompletedActivationRunByWorkspaceId(workspaceId: string): Promise<ActivationRunRow | null> {
    const result = await dbQuery(
        `
        SELECT *
        FROM activation_runs
        WHERE workspace_id = $1
          AND status = 'completed'
        ORDER BY completed_at DESC NULLS LAST, created_at DESC
        LIMIT 1
        `,
        [workspaceId]
    );

    return result.rows[0] ? mapActivationRunRow(result.rows[0]) : null;
}

export async function getOpenActivationRunByWorkspaceId(workspaceId: string): Promise<ActivationRunRow | null> {
    const result = await dbQuery(
        `
        SELECT *
        FROM activation_runs
        WHERE workspace_id = $1
          AND status IN ('pending', 'running')
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [workspaceId]
    );

    return result.rows[0] ? mapActivationRunRow(result.rows[0]) : null;
}

export async function ensurePendingActivationRun(args: {
    workspaceId: string;
    processorConnectionId?: string | null;
    monitoredEntityId?: string | null;
    trigger: ActivationTrigger;
    triggeredBy?: string | null;
}): Promise<ActivationRunRow> {
    const existing = await getOpenActivationRunByWorkspaceId(args.workspaceId);
    if (existing) {
        return existing;
    }

    const attemptResult = await dbQuery<{ next_attempt: number }>(
        'SELECT COALESCE(MAX(attempt_number), 0) + 1 AS next_attempt FROM activation_runs WHERE workspace_id = $1',
        [args.workspaceId]
    );
    const attemptNumber = Number(attemptResult.rows[0]?.next_attempt ?? 1);

    const result = await dbQuery(
        `
        INSERT INTO activation_runs (
            workspace_id,
            processor_connection_id,
            monitored_entity_id,
            status,
            trigger,
            triggered_by,
            attempt_number
        )
        VALUES ($1, $2, $3, 'pending', $4, $5, $6)
        RETURNING *
        `,
        [
            args.workspaceId,
            args.processorConnectionId ?? null,
            args.monitoredEntityId ?? null,
            args.trigger,
            args.triggeredBy ?? null,
            attemptNumber,
        ]
    );

    return mapActivationRunRow(result.rows[0]);
}

export async function markActivationRunRunning(args: {
    activationRunId: string;
    processorConnectionId?: string | null;
    monitoredEntityId?: string | null;
}): Promise<ActivationRunRow> {
    const result = await dbQuery(
        `
        UPDATE activation_runs
        SET
            status = 'running',
            processor_connection_id = COALESCE($2, processor_connection_id),
            monitored_entity_id = COALESCE($3, monitored_entity_id),
            started_at = COALESCE(started_at, now()),
            failure_code = NULL,
            failure_detail = NULL,
            updated_at = now()
        WHERE id = $1
        RETURNING *
        `,
        [args.activationRunId, args.processorConnectionId ?? null, args.monitoredEntityId ?? null]
    );

    if (!result.rows[0]) {
        throw new Error(`Activation run not found: ${args.activationRunId}`);
    }

    return mapActivationRunRow(result.rows[0]);
}

export async function markActivationRunFailed(args: {
    activationRunId: string;
    failureCode: string;
    failureDetail?: string | null;
}): Promise<ActivationRunRow> {
    const result = await dbQuery(
        `
        UPDATE activation_runs
        SET
            status = 'failed',
            failure_code = $2,
            failure_detail = $3,
            completed_at = now(),
            updated_at = now()
        WHERE id = $1
        RETURNING *
        `,
        [args.activationRunId, args.failureCode, args.failureDetail ?? null]
    );

    if (!result.rows[0]) {
        throw new Error(`Activation run not found: ${args.activationRunId}`);
    }

    return mapActivationRunRow(result.rows[0]);
}

export async function markActivationRunCompleted(args: {
    activationRunId: string;
    baselineSnapshotId: string;
    firstProjectionId: string;
}): Promise<ActivationRunRow> {
    const result = await dbQuery(
        `
        UPDATE activation_runs
        SET
            status = 'completed',
            baseline_snapshot_id = $2,
            first_projection_id = $3,
            connection_verified = true,
            baseline_ready = true,
            first_projection_ready = true,
            completed_at = now(),
            updated_at = now()
        WHERE id = $1
        RETURNING *
        `,
        [args.activationRunId, args.baselineSnapshotId, args.firstProjectionId]
    );

    if (!result.rows[0]) {
        throw new Error(`Activation run not found: ${args.activationRunId}`);
    }

    return mapActivationRunRow(result.rows[0]);
}
