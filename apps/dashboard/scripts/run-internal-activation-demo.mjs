import pg from 'pg';

const { Client } = pg;

const INTERNAL_ACTIVATION_MODEL_VERSION = 'stripe-internal-demo-v1.0.0';

function getEnv(name) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return value;
}

function slugify(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 32);
}

function fallbackInternalHost(workspaceName) {
    return `${slugify(workspaceName) || 'internal-verification'}.payflux.internal`;
}

function buildInternalDemo(args) {
    const riskTier = 3;
    const riskBand = 'elevated';
    const trend = 'STABLE';
    const baseReserveRate = 0.1;
    const worstCaseReserveRate = 0.14;

    return {
        riskTier,
        riskBand,
        stabilityScore: 62,
        trend,
        tierDelta: 0,
        instabilitySignal: 'LATENT',
        policySurface: { present: 3, weak: 1, missing: 0 },
        sourceSummary: {
            mode: 'internal_demo',
            workspaceName: args.workspaceName,
            stripeAccountId: args.stripeAccountId,
            businessUrl: args.primaryHost,
            note: 'Internal verification artifact generated without requiring live Stripe charge or payout volume.',
        },
        recommendedInterventions: [
            {
                action: 'Improve refund and cancellation policy visibility on your site.',
                rationale: 'Clear, easy-to-find refund and cancellation policies reduce dispute pressure and make processors more comfortable with your account.',
                priority: 'high',
            },
            {
                action: 'Review your customer support contact paths.',
                rationale: 'Visible support channels give processors confidence that customer issues are being handled before they escalate to chargebacks.',
                priority: 'moderate',
            },
        ],
        simulationDelta: {
            velocityReduction: 0.25,
            exposureMultiplier: 0.65,
            rateMultiplier: 0.74,
            label: 'Internal verification simulation',
        },
        projectionBasis: {
            inputs: {
                riskTier,
                riskBand,
                trend,
                tierDelta: 0,
                policySurface: { present: 3, weak: 1, missing: 0 },
                stripeSignals: {
                    internalDemo: true,
                    chargesEnabled: true,
                    payoutsEnabled: true,
                    detailsSubmitted: true,
                },
            },
            constants: {
                baseReserveRate,
                trendMultiplier: 1,
                projectedTier: riskTier,
                projectedReserveRate: baseReserveRate,
                worstCaseReserveRate,
                reserveRateCeiling: 0.25,
            },
            interventionBasis: {
                velocityReductionApplied: 0.25,
                exposureMultiplier: 0.65,
                rateMultiplier: 0.74,
                derivationFormula: 'internal-demo-fixed-surface',
            },
        },
        reserveProjections: [
            {
                windowDays: 30,
                baseReserveRate,
                worstCaseReserveRate,
                projectedTrappedBps: 333,
                worstCaseTrappedBps: 467,
                riskBand: riskBand.toUpperCase(),
            },
            {
                windowDays: 60,
                baseReserveRate,
                worstCaseReserveRate,
                projectedTrappedBps: 667,
                worstCaseTrappedBps: 933,
                riskBand: riskBand.toUpperCase(),
            },
            {
                windowDays: 90,
                baseReserveRate,
                worstCaseReserveRate,
                projectedTrappedBps: 1000,
                worstCaseTrappedBps: 1400,
                riskBand: riskBand.toUpperCase(),
            },
        ],
    };
}

async function queryOne(client, sql, params) {
    const { rows } = await client.query(sql, params);
    return rows[0] ?? null;
}

async function main() {
    const workspaceId = process.env.INTERNAL_VERIFY_WORKSPACE_ID ?? process.argv[2];
    const shouldCommit = process.argv.includes('--commit');

    if (!workspaceId) {
        throw new Error('workspace id argument or INTERNAL_VERIFY_WORKSPACE_ID is required');
    }

    const client = new Client({ connectionString: getEnv('DATABASE_URL') });
    await client.connect();

    try {
        const workspace = await queryOne(
            client,
            `select id, name, entitlement_tier::text as entitlement_tier, payment_status::text as payment_status, activation_state::text as activation_state, primary_host_candidate
             from workspaces where id = $1`,
            [workspaceId]
        );

        if (!workspace) {
            throw new Error(`Workspace not found: ${workspaceId}`);
        }

        const processorConnection = await queryOne(
            client,
            `select id, status::text as status, stripe_account_id
             from processor_connections where workspace_id = $1 and provider = 'stripe' limit 1`,
            [workspaceId]
        );

        const monitoredEntity = await queryOne(
            client,
            `select id, status::text as status, primary_host
             from monitored_entities where workspace_id = $1 limit 1`,
            [workspaceId]
        );

        if (!['pro', 'enterprise'].includes(workspace.entitlement_tier)) {
            throw new Error(`Workspace ${workspaceId} is not paid (tier=${workspace.entitlement_tier})`);
        }

        if (!processorConnection || processorConnection.status !== 'connected') {
            throw new Error(`Workspace ${workspaceId} does not have a connected Stripe processor`);
        }

        if (!monitoredEntity) {
            throw new Error(`Workspace ${workspaceId} does not have a monitored entity`);
        }

        const primaryHost = monitoredEntity.primary_host || workspace.primary_host_candidate || fallbackInternalHost(workspace.name);
        const demo = buildInternalDemo({
            workspaceName: workspace.name,
            stripeAccountId: processorConnection.stripe_account_id,
            primaryHost,
        });

        const plan = {
            workspace: {
                id: workspace.id,
                name: workspace.name,
                entitlementTier: workspace.entitlement_tier,
                paymentStatus: workspace.payment_status,
                activationState: workspace.activation_state,
            },
            processorConnection,
            monitoredEntity: {
                id: monitoredEntity.id,
                status: monitoredEntity.status,
                currentPrimaryHost: monitoredEntity.primary_host,
                nextPrimaryHost: primaryHost,
            },
            mode: shouldCommit ? 'commit' : 'dry_run',
            output: {
                baselineRiskTier: demo.riskTier,
                reserveWindows: demo.reserveProjections.map((projection) => projection.windowDays),
                modelVersion: INTERNAL_ACTIVATION_MODEL_VERSION,
            },
        };

        if (!shouldCommit) {
            console.log(JSON.stringify(plan, null, 2));
            return;
        }

        await client.query('BEGIN');
        try {
            const now = new Date().toISOString();
            const attemptRow = await queryOne(
                client,
                `select coalesce(max(attempt_number), 0) + 1 as next_attempt
                 from activation_runs where workspace_id = $1`,
                [workspaceId]
            );
            const attemptNumber = Number(attemptRow?.next_attempt ?? 1);

            const activationRun = await queryOne(
                client,
                `insert into activation_runs (
                    workspace_id,
                    processor_connection_id,
                    monitored_entity_id,
                    status,
                    trigger,
                    triggered_by,
                    attempt_number,
                    started_at
                )
                values ($1, $2, $3, 'running', 'manual_retry', 'internal_demo_script', $4, now())
                returning id`,
                [workspaceId, processorConnection.id, monitoredEntity.id, attemptNumber]
            );

            const updatedEntity = await queryOne(
                client,
                `update monitored_entities
                 set
                    primary_host = coalesce(primary_host, $2),
                    primary_host_source = case
                        when primary_host is null and $2 is not null then
                            case when $3::text = 'scan' then 'scan'::host_source_enum else 'manual'::host_source_enum end
                        else primary_host_source
                    end,
                    updated_at = now()
                 where workspace_id = $1
                 returning id`,
                [workspaceId, primaryHost, workspace.primary_host_candidate ? 'scan' : 'manual']
            );

            const baseline = await queryOne(
                client,
                `insert into baseline_snapshots (
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
                 values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10)
                 returning id`,
                [
                    workspaceId,
                    updatedEntity.id,
                    processorConnection.id,
                    demo.riskTier,
                    demo.riskBand,
                    demo.stabilityScore,
                    demo.trend,
                    JSON.stringify(demo.policySurface),
                    JSON.stringify(demo.sourceSummary),
                    now,
                ]
            );

            const projection = await queryOne(
                client,
                `insert into reserve_projections (
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
                 values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, 'bps_only', $14)
                 returning id`,
                [
                    workspaceId,
                    updatedEntity.id,
                    baseline.id,
                    activationRun.id,
                    INTERNAL_ACTIVATION_MODEL_VERSION,
                    demo.instabilitySignal,
                    demo.riskTier,
                    demo.trend,
                    demo.tierDelta,
                    JSON.stringify(demo.projectionBasis),
                    JSON.stringify(demo.reserveProjections),
                    JSON.stringify(demo.recommendedInterventions),
                    JSON.stringify(demo.simulationDelta),
                    now,
                ]
            );

            await client.query(
                `update monitored_entities
                 set
                    status = 'ready',
                    current_baseline_snapshot_id = $2,
                    current_projection_id = $3,
                    last_sync_at = $4,
                    ready_at = coalesce(ready_at, now()),
                    updated_at = now()
                 where workspace_id = $1`,
                [workspaceId, baseline.id, projection.id, now]
            );

            await client.query(
                `update activation_runs
                 set
                    status = 'completed',
                    baseline_snapshot_id = $2,
                    first_projection_id = $3,
                    connection_verified = true,
                    baseline_ready = true,
                    first_projection_ready = true,
                    completed_at = now(),
                    updated_at = now()
                 where id = $1`,
                [activationRun.id, baseline.id, projection.id]
            );

            await client.query(
                `update workspaces
                 set activation_state = 'active', updated_at = now()
                 where id = $1`,
                [workspaceId]
            );

            await client.query('COMMIT');

            console.log(JSON.stringify({
                ...plan,
                committed: true,
                activationRunId: activationRun.id,
                baselineSnapshotId: baseline.id,
                reserveProjectionId: projection.id,
            }, null, 2));
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    } finally {
        await client.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
