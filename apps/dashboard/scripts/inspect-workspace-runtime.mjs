import pg from 'pg';

const { Client } = pg;

function getEnv(name) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return value;
}

async function queryOne(client, sql, params) {
    const { rows } = await client.query(sql, params);
    return rows[0] ?? null;
}

async function queryMany(client, sql, params) {
    const { rows } = await client.query(sql, params);
    return rows;
}

async function main() {
    const workspaceId = process.env.INTERNAL_VERIFY_WORKSPACE_ID ?? process.argv[2];
    if (!workspaceId) {
        throw new Error('workspace id argument or INTERNAL_VERIFY_WORKSPACE_ID is required');
    }

    const client = new Client({ connectionString: getEnv('DATABASE_URL') });
    await client.connect();

    try {
        const workspace = await queryOne(client, `select * from workspaces where id = $1`, [workspaceId]);
        const billingCustomer = await queryOne(client, `select * from billing_customers where workspace_id = $1`, [workspaceId]);
        const subscriptions = await queryMany(client, `select * from billing_subscriptions where workspace_id = $1 order by updated_at desc`, [workspaceId]);
        const processorConnection = await queryOne(client, `select * from processor_connections where workspace_id = $1`, [workspaceId]);
        const monitoredEntity = await queryOne(client, `select * from monitored_entities where workspace_id = $1`, [workspaceId]);
        const activationRuns = await queryMany(client, `select * from activation_runs where workspace_id = $1 order by created_at desc`, [workspaceId]);
        const baselineSnapshots = await queryMany(client, `select * from baseline_snapshots where workspace_id = $1 order by computed_at desc`, [workspaceId]);
        const reserveProjections = await queryMany(client, `select * from reserve_projections where workspace_id = $1 order by projected_at desc`, [workspaceId]);

        console.log(JSON.stringify({
            workspace,
            billingCustomer,
            subscriptions,
            processorConnection,
            monitoredEntity,
            activationRuns,
            baselineSnapshots,
            reserveProjections,
        }, null, 2));
    } finally {
        await client.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
