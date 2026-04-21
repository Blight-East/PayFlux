import { test, expect } from './fixtures/test';

/**
 * Covers the full Stripe Connect OAuth flow against a mocked Clerk
 * identity, a mocked Stripe HTTP API, and a real local Postgres:
 *
 *   1. User visits /connect as an authenticated admin.
 *   2. Clicking the CTA issues `GET /api/stripe/authorize`, which
 *      signs a state token and redirects to `connect.stripe.com`.
 *   3. We intercept that redirect, lift the `state` param, and
 *      navigate straight to `/api/stripe/callback?code=mock_code&state=...`.
 *   4. The callback exchanges the code via the mock Stripe server
 *      and upserts a row into `processor_connections`.
 *   5. The app redirects to `/dashboard`.
 *
 * The test asserts both the client-side landing (`/dashboard`) and the
 * server-side persistence (`processor_connections`).
 */
test.describe('Stripe Connect OAuth flow', () => {
    test('persists tokens and redirects to the dashboard', async ({
        page,
        db,
        seededWorkspace,
        stripeMock,
    }) => {
        const stripeAccountId = 'acct_mock_E2E12345';
        const accessToken = 'sk_test_mock_access_token_abc123';
        const refreshToken = 'rt_test_mock_refresh_token_xyz789';

        stripeMock.setTokenResponse({
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: 'bearer',
            stripe_publishable_key: 'pk_test_mock_publishable',
            stripe_user_id: stripeAccountId,
            scope: 'read_write',
            livemode: false,
            expires_in: 3600,
        });

        // 1. Intercept the `/api/stripe/authorize` response and lift the
        //    `state` param from its `Location` header, rewriting the header
        //    so the browser is redirected straight back to our local
        //    callback with a deterministic code. This avoids any real
        //    navigation to `connect.stripe.com`.
        let capturedState: string | null = null;
        await page.route('**/api/stripe/authorize', async (route) => {
            const response = await route.fetch({ maxRedirects: 0 });
            const location = response.headers()['location'];
            if (!location) {
                await route.fulfill({ response });
                return;
            }
            const target = new URL(location);
            capturedState = target.searchParams.get('state');
            const localCallback = new URL(
                '/api/stripe/callback',
                page.url() || 'http://localhost:3000'
            );
            localCallback.searchParams.set('code', 'mock_auth_code');
            localCallback.searchParams.set('state', capturedState ?? '');
            await route.fulfill({
                status: response.status(),
                headers: { ...response.headers(), location: localCallback.toString() },
                body: '',
            });
        });

        // 2. Land on /connect as the authenticated admin.
        await page.goto('/connect');
        await expect(page).toHaveURL(/\/connect/);

        // 3. Click the primary CTA. The client component navigates to
        //    /api/stripe/authorize, whose redirect we rewrite in the hook
        //    above, sending the browser to /api/stripe/callback instead of
        //    connect.stripe.com. The callback upserts the connection and
        //    redirects to /dashboard.
        const cta = page.getByRole('button', {
            name: /Connect Stripe and turn on live monitoring/i,
        });
        await expect(cta).toBeVisible();

        await Promise.all([
            page.waitForURL(/\/dashboard(?:$|\?|#)/, { timeout: 30_000 }),
            cta.click(),
        ]);

        expect(capturedState, 'state token must have been captured').toBeTruthy();

        // 4. The mock Stripe server should have received exactly one
        //    `POST /v1/oauth/token` call from the callback handler.
        const tokenCalls = stripeMock.requests.filter(
            (r) => r.method === 'POST' && r.url === '/v1/oauth/token'
        );
        expect(tokenCalls.length).toBe(1);
        expect(tokenCalls[0].body).toContain('grant_type=authorization_code');
        expect(tokenCalls[0].body).toContain('code=mock_auth_code');

        // 5. Database must contain the persisted connection with tokens.
        const row = await db.getStripeProcessorConnection(seededWorkspace.workspaceId);
        expect(row, 'processor_connections row should be inserted').not.toBeNull();
        expect(row?.stripe_account_id).toBe(stripeAccountId);
        expect(row?.access_token).toBe(accessToken);
        expect(row?.refresh_token).toBe(refreshToken);
        expect(row?.oauth_scope).toBe('read_write');
        expect(row?.status).toBe('connected');
    });
});
