import pg from 'pg';

const { Client } = pg;

function getDatabaseUrl() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error('DATABASE_URL is required');
    }
    return url;
}

async function main() {
    const client = new Client({ connectionString: getDatabaseUrl() });
    await client.connect();

    try {
        const checks = [
            ['database', `select current_database() as value`],
            ['schema', `select current_schema() as value`],
            ['tables', `
                select string_agg(tablename, ', ' order by tablename) as value
                from pg_tables
                where schemaname = 'public'
            `],
            ['legacy billing_customers duplicate stripe_customer_id', `
                select coalesce(json_agg(t), '[]'::json)::text as value
                from (
                    select stripe_customer_id, count(*) as count
                    from billing_customers
                    group by stripe_customer_id
                    having count(*) > 1
                ) t
            `],
            ['legacy billing_customers null stripe_customer_id', `
                select count(*)::text as value
                from billing_customers
                where stripe_customer_id is null
            `],
            ['legacy subscriptions duplicate stripe_subscription_id', `
                select coalesce(json_agg(t), '[]'::json)::text as value
                from (
                    select stripe_subscription_id, count(*) as count
                    from subscriptions
                    where stripe_subscription_id is not null
                    group by stripe_subscription_id
                    having count(*) > 1
                ) t
            `],
            ['legacy subscriptions duplicate stripe_checkout_session_id', `
                select coalesce(json_agg(t), '[]'::json)::text as value
                from (
                    select stripe_checkout_session_id, count(*) as count
                    from subscriptions
                    where stripe_checkout_session_id is not null
                    group by stripe_checkout_session_id
                    having count(*) > 1
                ) t
            `],
            ['schema_migrations', `
                select coalesce(string_agg(version, ', ' order by version), '(none)') as value
                from schema_migrations
            `],
        ];

        for (const [label, query] of checks) {
            try {
                const { rows } = await client.query(query);
                console.log(`${label}: ${rows[0]?.value ?? '(none)'}`);
            } catch (error) {
                console.log(`${label}: ERROR ${error.message}`);
            }
        }
    } finally {
        await client.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
