/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixture callbacks
   take a `use` parameter that the react-hooks lint plugin misidentifies as
   a React hook. This rule does not apply to Playwright fixtures. */
import { test as base } from '@playwright/test';
import { E2EDbFixture, type SeededWorkspace } from './db';
import { startStripeMockServer, type StripeMockServer } from './stripe-mock';
import { E2E_CLERK_COOKIE, encodeClerkIdentity, type ClerkTestIdentity } from './clerk';

interface Fixtures {
    db: E2EDbFixture;
    seededWorkspace: SeededWorkspace;
    stripeMock: StripeMockServer;
    clerkIdentity: ClerkTestIdentity;
    authenticatedBrowser: void;
}

const DEFAULT_IDENTITY: ClerkTestIdentity = {
    userId: 'user_test_e2e_001',
    orgId: 'org_test123',
    orgName: 'E2E Test Workspace',
};

/**
 * Test harness that wires the DB fixture, the Stripe mock HTTP server, and
 * the mocked Clerk identity cookie. Use `test` from this module in specs
 * instead of the raw `@playwright/test` export.
 */
export const test = base.extend<Fixtures>({
    clerkIdentity: async ({}, use) => {
        await use(DEFAULT_IDENTITY);
    },

    db: async ({}, use) => {
        const fixture = new E2EDbFixture();
        await use(fixture);
        await fixture.close();
    },

    seededWorkspace: async ({ db, clerkIdentity }, use) => {
        const seeded = await db.resetAndSeed({
            clerkOrgId: clerkIdentity.orgId,
            ownerUserId: clerkIdentity.userId,
            orgName: clerkIdentity.orgName,
        });
        await use(seeded);
    },

    stripeMock: async ({}, use) => {
        const port = Number(process.env.PAYFLUX_E2E_STRIPE_MOCK_PORT ?? 14242);
        const server = await startStripeMockServer(port);
        await use(server);
        await server.close();
    },

    authenticatedBrowser: [
        async ({ context, clerkIdentity, baseURL }, use) => {
            const url = new URL(baseURL ?? 'http://localhost:3000');
            await context.addCookies([
                {
                    name: E2E_CLERK_COOKIE,
                    value: encodeClerkIdentity(clerkIdentity),
                    domain: url.hostname,
                    path: '/',
                    httpOnly: false,
                    secure: false,
                    sameSite: 'Lax',
                },
            ]);
            await use();
        },
        { auto: true },
    ],
});

export const expect = test.expect;
