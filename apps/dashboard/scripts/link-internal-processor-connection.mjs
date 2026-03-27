import pg from 'pg';

const { Client } = pg;

function getEnv(name) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return value;
}

async function main() {
    const workspaceId = getEnv('INTERNAL_VERIFY_WORKSPACE_ID');
    const stripeAccountId = getEnv('INTERNAL_VERIFY_STRIPE_ACCOUNT_ID');
    const oauthScope = process.env.INTERNAL_VERIFY_OAUTH_SCOPE ?? 'read_write';

    const client = new Client({ connectionString: getEnv('DATABASE_URL') });
    await client.connect();

    try {
        await client.query('BEGIN');

        const workspaceResult = await client.query(
            `select id, entitlement_tier, primary_host_candidate from workspaces where id = $1 limit 1`,
            [workspaceId]
        );
        const workspace = workspaceResult.rows[0];
        if (!workspace) {
            throw new Error(`Workspace not found: ${workspaceId}`);
        }

        const processorResult = await client.query(
            `
            insert into processor_connections (
                workspace_id,
                provider,
                stripe_account_id,
                status,
                oauth_scope,
                connected_at,
                connection_metadata
            )
            values ($1, 'stripe', $2, 'connected', $3, now(), $4::jsonb)
            on conflict (workspace_id, provider) do update
            set
                stripe_account_id = excluded.stripe_account_id,
                status = excluded.status,
                oauth_scope = excluded.oauth_scope,
                connected_at = coalesce(processor_connections.connected_at, excluded.connected_at),
                updated_at = now(),
                connection_metadata = excluded.connection_metadata
            returning id, stripe_account_id, status
            `,
            [
                workspaceId,
                stripeAccountId,
                oauthScope,
                JSON.stringify({
                    internal_verification: true,
                    linked_by: 'script',
                }),
            ]
        );
        const processorConnection = processorResult.rows[0];

        const monitoredEntityResult = await client.query(
            `
            insert into monitored_entities (
                workspace_id,
                processor_connection_id,
                entity_type,
                status,
                primary_host,
                primary_host_source
            )
            values ($1, $2, 'stripe_account', 'pending', $3, $4)
            on conflict (workspace_id) do update
            set
                processor_connection_id = excluded.processor_connection_id,
                primary_host = coalesce(monitored_entities.primary_host, excluded.primary_host),
                primary_host_source = case
                    when monitored_entities.primary_host is null and excluded.primary_host is not null
                        then excluded.primary_host_source
                    else monitored_entities.primary_host_source
                end,
                updated_at = now()
            returning id, status, primary_host
            `,
            [
                workspaceId,
                processorConnection.id,
                workspace.primary_host_candidate,
                workspace.primary_host_candidate ? 'scan' : 'unknown',
            ]
        );
        const monitoredEntity = monitoredEntityResult.rows[0];

        const nextActivationState =
            workspace.entitlement_tier === 'pro' || workspace.entitlement_tier === 'enterprise'
                ? 'ready_for_activation'
                : 'not_started';

        await client.query(
            `
            update workspaces
            set
                activation_state = $2,
                updated_at = now()
            where id = $1
            `,
            [workspaceId, nextActivationState]
        );

        await client.query('COMMIT');

        console.log(JSON.stringify({
            workspaceId,
            processorConnection,
            monitoredEntity,
            activationState: nextActivationState,
        }, null, 2));
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        await client.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
