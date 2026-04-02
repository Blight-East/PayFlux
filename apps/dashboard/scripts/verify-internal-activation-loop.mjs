import pg from 'pg';

const { Client } = pg;

function getEnv(name) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return value;
}

async function main() {
    const workspaceId = process.env.INTERNAL_VERIFY_WORKSPACE_ID ?? process.argv[2];
    if (!workspaceId) {
        throw new Error('workspace id argument or INTERNAL_VERIFY_WORKSPACE_ID is required');
    }

    const client = new Client({ connectionString: getEnv('DATABASE_URL') });
    await client.connect();

    try {
        const { rows } = await client.query(
            `
            select
                w.id,
                w.name,
                w.entitlement_tier::text as entitlement_tier,
                w.payment_status::text as payment_status,
                w.activation_state::text as activation_state,
                pc.id as processor_connection_id,
                pc.status::text as processor_connection_status,
                pc.stripe_account_id,
                me.id as monitored_entity_id,
                me.status::text as monitored_entity_status,
                me.primary_host,
                ar.id as activation_run_id,
                ar.status::text as activation_run_status,
                ar.failure_code,
                ar.failure_detail,
                bs.id as baseline_snapshot_id,
                rp.id as reserve_projection_id
            from workspaces w
            left join processor_connections pc on pc.workspace_id = w.id and pc.provider = 'stripe'
            left join monitored_entities me on me.workspace_id = w.id
            left join lateral (
                select *
                from activation_runs
                where workspace_id = w.id
                order by created_at desc
                limit 1
            ) ar on true
            left join lateral (
                select id
                from baseline_snapshots
                where workspace_id = w.id
                order by computed_at desc, created_at desc
                limit 1
            ) bs on true
            left join lateral (
                select id
                from reserve_projections
                where workspace_id = w.id
                order by projected_at desc, created_at desc
                limit 1
            ) rp on true
            where w.id = $1
            limit 1
            `,
            [workspaceId]
        );

        const row = rows[0];
        if (!row) {
            throw new Error(`Workspace not found: ${workspaceId}`);
        }

        const checks = {
            paidSubscription: row.entitlement_tier === 'pro' || row.entitlement_tier === 'enterprise',
            processorConnectionPersisted: Boolean(row.processor_connection_id) && row.processor_connection_status === 'connected',
            monitoredEntityCreated: Boolean(row.monitored_entity_id),
            scopedHostPresent: typeof row.primary_host === 'string' && row.primary_host.length > 0,
            activationRunCompleted: Boolean(row.activation_run_id) && row.activation_run_status === 'completed',
            baselineSnapshotPersisted: Boolean(row.baseline_snapshot_id),
            reserveProjectionPersisted: Boolean(row.reserve_projection_id),
            workspaceActive: row.activation_state === 'active',
        };

        const failedChecks = Object.entries(checks)
            .filter(([, passed]) => !passed)
            .map(([label]) => label);

        console.log(JSON.stringify({
            workspace: {
                id: row.id,
                name: row.name,
                entitlementTier: row.entitlement_tier,
                paymentStatus: row.payment_status,
                activationState: row.activation_state,
            },
            processorConnection: row.processor_connection_id ? {
                id: row.processor_connection_id,
                status: row.processor_connection_status,
                stripeAccountId: row.stripe_account_id,
            } : null,
            monitoredEntity: row.monitored_entity_id ? {
                id: row.monitored_entity_id,
                status: row.monitored_entity_status,
                primaryHost: row.primary_host,
            } : null,
            latestActivationRun: row.activation_run_id ? {
                id: row.activation_run_id,
                status: row.activation_run_status,
                failureCode: row.failure_code,
                failureDetail: row.failure_detail,
            } : null,
            latestArtifacts: {
                baselineSnapshotId: row.baseline_snapshot_id,
                reserveProjectionId: row.reserve_projection_id,
            },
            checks,
            ok: failedChecks.length === 0,
            failedChecks,
        }, null, 2));

        if (failedChecks.length > 0) {
            process.exitCode = 1;
        }
    } finally {
        await client.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
