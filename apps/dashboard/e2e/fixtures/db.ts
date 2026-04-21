import { Pool, type QueryResult } from 'pg';

/**
 * Thin pg wrapper used only by the Playwright E2E suite. Intentionally
 * separate from `src/lib/db/client.ts` so tests never boot the Next.js
 * migration pipeline during setup/teardown — that is handled once by
 * `global-setup.ts`.
 */
class E2EDbClient {
    private pool: Pool | null = null;

    private getPool(): Pool {
        if (!this.pool) {
            const connectionString =
                process.env.DATABASE_URL ??
                'postgres://payflux:payflux@127.0.0.1:5433/payflux';
            this.pool = new Pool({
                connectionString,
                max: 2,
                connectionTimeoutMillis: 5_000,
            });
        }
        return this.pool;
    }

    async query<T extends Record<string, unknown> = Record<string, unknown>>(
        text: string,
        params: readonly unknown[] = []
    ): Promise<QueryResult<T>> {
        return this.getPool().query<T>(text, params as unknown[]);
    }

    async close(): Promise<void> {
        if (this.pool) {
            const p = this.pool;
            this.pool = null;
            await p.end();
        }
    }
}

export interface SeededWorkspace {
    workspaceId: string;
    clerkOrgId: string;
    ownerUserId: string;
    orgName: string;
}

export class E2EDbFixture {
    readonly client = new E2EDbClient();

    /**
     * Wipe every table the Stripe OAuth flow touches, then insert a
     * deterministic workspace row keyed to the mocked Clerk org.
     */
    async resetAndSeed(input: {
        clerkOrgId: string;
        ownerUserId: string;
        orgName?: string;
    }): Promise<SeededWorkspace> {
        const orgName = input.orgName ?? 'E2E Test Workspace';

        // Wipe every table reachable from processor_connections / workspaces
        // via FK cascade. CASCADE handles activation_runs, baseline_snapshots,
        // reserve_projections, monitored_entities, stripe_financials,
        // billing_customers, billing_subscriptions, and signal_failure_velocity
        // without us having to enumerate them explicitly.
        await this.client.query(
            `TRUNCATE TABLE processor_connections, workspaces
             RESTART IDENTITY CASCADE`
        );

        const workspace = await this.client.query<{ id: string }>(
            `INSERT INTO workspaces (clerk_org_id, name, owner_clerk_user_id, entitlement_tier)
             VALUES ($1, $2, $3, 'free')
             RETURNING id`,
            [input.clerkOrgId, orgName, input.ownerUserId]
        );

        const row = workspace.rows[0];
        if (!row) {
            throw new Error('Failed to seed workspaces row for E2E fixture');
        }

        return {
            workspaceId: row.id,
            clerkOrgId: input.clerkOrgId,
            ownerUserId: input.ownerUserId,
            orgName,
        };
    }

    async getStripeProcessorConnection(
        workspaceId: string
    ): Promise<{
        id: string;
        workspace_id: string;
        stripe_account_id: string;
        access_token: string | null;
        refresh_token: string | null;
        oauth_scope: string;
        status: string;
    } | null> {
        const result = await this.client.query<{
            id: string;
            workspace_id: string;
            stripe_account_id: string;
            access_token: string | null;
            refresh_token: string | null;
            oauth_scope: string;
            status: string;
        }>(
            `SELECT id, workspace_id, stripe_account_id, access_token,
                    refresh_token, oauth_scope, status
               FROM processor_connections
              WHERE workspace_id = $1 AND provider = 'stripe'
              LIMIT 1`,
            [workspaceId]
        );
        return result.rows[0] ?? null;
    }

    async close(): Promise<void> {
        await this.client.close();
    }
}
