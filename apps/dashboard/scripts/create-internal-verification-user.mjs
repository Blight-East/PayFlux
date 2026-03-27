import { createClerkClient } from '@clerk/backend';
import pg from 'pg';

const { Client } = pg;

function getEnv(name) {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required`);
    return value;
}

async function main() {
    const email = process.env.INTERNAL_VERIFY_EMAIL ?? 'internal+phase2-verify@payflux.dev';
    const orgName = process.env.INTERNAL_VERIFY_ORG_NAME ?? 'PayFlux Internal Verification';
    const password = process.env.INTERNAL_VERIFY_PASSWORD ?? null;

    const clerk = createClerkClient({ secretKey: getEnv('CLERK_SECRET_KEY') });
    const db = new Client({ connectionString: getEnv('DATABASE_URL') });
    await db.connect();

    try {
        const existingUsers = await clerk.users.getUserList({ emailAddress: [email], limit: 1 });
        const existingUser = existingUsers.data[0] ?? null;
        const user = existingUser ?? await clerk.users.createUser({
            emailAddress: [email],
            firstName: 'PayFlux',
            lastName: 'Verification',
            ...(password ? { password, skipPasswordChecks: true } : {
                skipPasswordRequirement: true,
                skipPasswordChecks: true,
            }),
            skipLegalChecks: true,
            createOrganizationEnabled: true,
        });

        if (password && existingUser) {
            await clerk.users.updateUser(user.id, {
                password,
                skipPasswordChecks: true,
            });
        }

        const memberships = await clerk.users.getOrganizationMembershipList({ userId: user.id, limit: 20 });
        let organization = memberships.data[0]?.organization;

        if (!organization) {
            organization = await clerk.organizations.createOrganization({
                name: orgName,
                createdBy: user.id,
            });
        }

        const { rows } = await db.query(
            `
            INSERT INTO workspaces (clerk_org_id, name, owner_clerk_user_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (clerk_org_id) DO UPDATE
            SET
                name = EXCLUDED.name,
                owner_clerk_user_id = COALESCE(workspaces.owner_clerk_user_id, EXCLUDED.owner_clerk_user_id),
                updated_at = now()
            RETURNING id
            `,
            [organization.id, organization.name, user.id]
        );

        const signInToken = await clerk.signInTokens.createSignInToken({
            userId: user.id,
            expiresInSeconds: 60 * 30,
        });

        console.log(JSON.stringify({
            userId: user.id,
            email,
            organizationId: organization.id,
            organizationName: organization.name,
            workspaceRecordId: rows[0].id,
            passwordSet: Boolean(password),
            signInUrl: signInToken.url,
        }, null, 2));
    } finally {
        await db.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
