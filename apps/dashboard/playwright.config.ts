import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for the PayFlux dashboard E2E suite.
 *
 * The suite targets a local `npm run dev` instance with mocks enabled for
 * Clerk (via the webpack alias in `next.config.mjs`) and Stripe (via
 * `STRIPE_API_HOST`/`STRIPE_API_PORT` honored in the Stripe Connect
 * callback route). See `e2e/README.md` for details.
 */

const BASE_URL = process.env.PAYFLUX_E2E_BASE_URL ?? 'http://localhost:3000';
const STRIPE_MOCK_PORT = Number(process.env.PAYFLUX_E2E_STRIPE_MOCK_PORT ?? 14242);

export default defineConfig({
    testDir: './e2e',
    testMatch: /.*\.spec\.ts$/,
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
    globalSetup: './e2e/global-setup.ts',
    use: {
        baseURL: BASE_URL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        // Force the webpack builder so the Clerk E2E alias in next.config.mjs
        // is honored. Next 16 defaults to Turbopack, which ignores the
        // `webpack()` hook.
        command: 'npm run dev -- --webpack',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
            // Enable the Clerk alias + skip live Clerk initialization.
            PAYFLUX_E2E_MODE: '1',

            // Point the Stripe SDK at the in-process mock server.
            STRIPE_API_HOST: '127.0.0.1',
            STRIPE_API_PORT: String(STRIPE_MOCK_PORT),
            STRIPE_API_PROTOCOL: 'http',

            // Prefix-validated placeholders required by the callback's
            // early guard (`pk_`, `sk_`).
            NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
                process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? 'pk_test_e2e_placeholder',
            CLERK_SECRET_KEY:
                process.env.CLERK_SECRET_KEY ?? 'sk_test_e2e_placeholder',
            STRIPE_SECRET_KEY:
                process.env.STRIPE_SECRET_KEY ?? 'sk_test_e2e_placeholder',
            STRIPE_CONNECT_CLIENT_ID:
                process.env.STRIPE_CONNECT_CLIENT_ID ?? 'ca_test_e2e_placeholder',

            // App URL used when constructing redirects / state HMACs.
            NEXT_PUBLIC_APP_URL: BASE_URL,
            OAUTH_STATE_SECRET:
                process.env.OAUTH_STATE_SECRET ?? 'e2e-oauth-state-secret-32bytes-min',

            // Local Postgres used by the fixture.
            DATABASE_URL:
                process.env.DATABASE_URL ??
                'postgres://payflux:payflux@127.0.0.1:5433/payflux',
            DB_AUTO_MIGRATE: 'true',

            // Disable the in-repo Clerk webhook cron noise in dev.
            NODE_ENV: 'development',
        },
    },
});
