import fs from 'fs/promises';
import path from 'path';
import pg from 'pg';

const { Client } = pg;

function getEnv(name) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return value;
}

async function tableExists(client, tableName) {
    const { rows } = await client.query(
        `
        select exists(
            select 1
            from information_schema.tables
            where table_schema = 'public'
              and table_name = $1
        ) as exists
        `,
        [tableName]
    );
    return Boolean(rows[0]?.exists);
}

async function dumpTable(client, tableName) {
    if (!(await tableExists(client, tableName))) {
        return { exists: false, columns: [], rows: [] };
    }

    const columnsResult = await client.query(
        `
        select column_name, data_type, is_nullable
        from information_schema.columns
        where table_schema = 'public'
          and table_name = $1
        order by ordinal_position
        `,
        [tableName]
    );

    const rowsResult = await client.query(`select * from ${tableName} order by 1`);

    return {
        exists: true,
        columns: columnsResult.rows,
        rowCount: rowsResult.rowCount,
        rows: rowsResult.rows,
    };
}

async function main() {
    const client = new Client({ connectionString: getEnv('DATABASE_URL') });
    await client.connect();

    try {
        const now = new Date().toISOString().replace(/[:.]/g, '-');
        const outputDir = path.join(process.cwd(), 'output', 'runtime-backups', now);
        await fs.mkdir(outputDir, { recursive: true });

        const metadata = {
            createdAt: new Date().toISOString(),
            databaseUrlHost: new URL(getEnv('DATABASE_URL')).hostname,
            tables: {},
        };

        for (const tableName of ['billing_customers', 'subscriptions', 'stripe_webhook_events', 'schema_migrations']) {
            const dump = await dumpTable(client, tableName);
            metadata.tables[tableName] = {
                exists: dump.exists,
                rowCount: dump.rowCount ?? 0,
            };
            await fs.writeFile(
                path.join(outputDir, `${tableName}.json`),
                JSON.stringify(dump, null, 2)
            );
        }

        await fs.writeFile(
            path.join(outputDir, 'metadata.json'),
            JSON.stringify(metadata, null, 2)
        );

        console.log(JSON.stringify({ outputDir, metadata }, null, 2));
    } finally {
        await client.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
