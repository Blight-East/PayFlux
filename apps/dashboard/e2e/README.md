# Dashboard E2E (Playwright)

End-to-end tests for `apps/dashboard`, focused on the Stripe Connect OAuth
flow. Tests run against a local `npm run dev` instance with Clerk and
Stripe mocked out.

## One-time prerequisites

1. A Postgres reachable at `DATABASE_URL` (defaults to
   `postgres://payflux:payflux@127.0.0.1:5433/payflux`). The fastest
   local setup is Docker:
   ```bash
   docker run -d --name payflux-pg-e2e \
     -e POSTGRES_PASSWORD=payflux \
     -e POSTGRES_USER=payflux \
     -e POSTGRES_DB=payflux \
     -p 5433:5432 postgres:16
   ```
2. Install browsers once per checkout:
   ```bash
   npx playwright install chromium --with-deps
   ```

## Running

```bash
cd apps/dashboard
npx playwright test
```

Playwright will spin up `npm run dev` with the E2E env vars described
below, apply any pending DB migrations via `global-setup.ts`, and run
the suite in `./e2e`.

## How the mocks work

Two narrowly scoped, env-gated hooks keep production code untouched
while letting us exercise the real API routes end to end:

1. **Clerk** — when `PAYFLUX_E2E_MODE=1`, `next.config.mjs` aliases
   `@clerk/nextjs/server` to
   `src/test-helpers/clerk-nextjs-server-mock.ts`. The mock reads a
   deterministic identity (`userId`, `orgId`) from the
   `__payflux_e2e_clerk` cookie set by the Playwright context, and
   stubs `clerkClient()` organization / user lookups.
2. **Stripe** — when `STRIPE_API_HOST` is set, the Stripe Connect
   callback constructs the Stripe SDK pointed at that host/port/proto.
   The test fixture spins up a tiny HTTP server on `127.0.0.1:14242`
   that implements just `POST /v1/oauth/token`.

The Playwright test then uses `page.route('**/connect.stripe.com/**', …)`
to capture the `state` param from the authorize redirect and fulfil the
redirect back at `/api/stripe/callback`.

## Environment variables (set automatically by `playwright.config.ts`)

| Variable | Purpose |
| --- | --- |
| `PAYFLUX_E2E_MODE=1` | Enables the Clerk webpack alias |
| `STRIPE_API_HOST`, `STRIPE_API_PORT`, `STRIPE_API_PROTOCOL` | Route Stripe SDK at the mock server |
| `DATABASE_URL` | Postgres used for seeding + assertions |
| `OAUTH_STATE_SECRET` | Required for state token HMAC |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Placeholder values with required `pk_`/`sk_` prefixes |
| `STRIPE_SECRET_KEY`, `STRIPE_CONNECT_CLIENT_ID` | Placeholder values accepted by the callback guard |
| `NEXT_PUBLIC_APP_URL` | Base URL used for state HMAC + redirects |

You can override any of these by exporting them before running
`npx playwright test`.

## Layout

```
e2e/
├── fixtures/
│   ├── clerk.ts          Cookie encoding shared with the Clerk mock
│   ├── db.ts             Pg wrapper: truncate + seed + assertion helpers
│   ├── stripe-mock.ts    Local HTTP server mocking api.stripe.com
│   └── test.ts           Combined Playwright fixture wiring everything
├── global-setup.ts       Applies pending dashboard migrations once
├── stripe-oauth.spec.ts  The OAuth flow spec
└── README.md             This file
```
