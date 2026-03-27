# Phase 2 Runtime Compatibility Runbook

## Preflight

1. Confirm you are targeting the correct Netlify-linked dashboard site.
2. Confirm `DATABASE_URL`, `CLERK_SECRET_KEY`, `STRIPE_SECRET_KEY`, and `STRIPE_PRICE_ID` are available.
3. Export a local JSON backup of the legacy runtime tables before applying anything:

```bash
cd /Users/ct/payflux-prod/apps/dashboard
DATABASE_URL="$(npx netlify env:get DATABASE_URL --context production)" \
node scripts/backup-legacy-runtime.mjs
```

4. Run:

```bash
cd /Users/ct/payflux-prod/apps/dashboard
DATABASE_URL="$(npx netlify env:get DATABASE_URL --context production)" \
node scripts/db-preflight.mjs
```

5. Review these preflight conditions before continuing:
   - `billing_customers` has no duplicate `stripe_customer_id`
   - `subscriptions` has no duplicate `stripe_subscription_id`
   - `subscriptions` has no duplicate `stripe_checkout_session_id`
   - The target DB is the expected runtime DB

## Backup / Snapshot

1. Preferred: take a Neon branch/snapshot of the production database before applying migrations.
2. Minimum local containment: keep the JSON backup from `scripts/backup-legacy-runtime.mjs`.
3. If Neon snapshotting is available, do both.
4. Do not proceed without at least one recoverable copy of:
   - `billing_customers`
   - `subscriptions`
   - `stripe_webhook_events`
5. Record the snapshot identifier or backup path in the deploy/change log.

## Apply Order

Apply in lexical order:

1. `0000_legacy_runtime_compat.sql`
2. `0001_phase1a_workspace_fulfillment.sql`
3. `0002_phase2_monitored_state.sql`

Use the migration runner so `schema_migrations` is recorded correctly:

```bash
cd /Users/ct/payflux-prod/apps/dashboard
DATABASE_URL="$(npx netlify env:get DATABASE_URL --context production)" \
node scripts/apply-db-migrations.mjs
```

For a dry run:

```bash
cd /Users/ct/payflux-prod/apps/dashboard
DATABASE_URL="$(npx netlify env:get DATABASE_URL --context production)" \
node scripts/apply-db-migrations.mjs --dry-run
```

## Post-Migration Verification

Run:

```bash
cd /Users/ct/payflux-prod/apps/dashboard
DATABASE_URL="$(npx netlify env:get DATABASE_URL --context production)" \
node scripts/db-preflight.mjs
```

Then verify these relations exist:

- `workspaces`
- `billing_customers`
- `billing_subscriptions`
- `processor_connections`
- `monitored_entities`
- `activation_runs`
- `baseline_snapshots`
- `reserve_projections`
- `schema_migrations`

Expected applied versions:

- `0000_legacy_runtime_compat.sql`
- `0001_phase1a_workspace_fulfillment.sql`
- `0002_phase2_monitored_state.sql`

Expected compatibility behavior:

- existing `billing_customers` is evolved in place
- existing `subscriptions` is preserved untouched
- new `billing_subscriptions` is created alongside legacy `subscriptions`
- no legacy rows are dropped or renamed

## Containment / Rollback

1. If `0000_legacy_runtime_compat.sql` fails:
   - stop
   - inspect duplicate/constraint errors
   - do not continue to `0001` or `0002`
2. If `0001` or `0002` fails:
   - stop
   - inspect `schema_migrations`
   - restore from the Neon snapshot if the database is left in an unsafe partial state
3. Do not manually drop or rename legacy `subscriptions`.
4. Do not delete legacy `billing_customers.user_id`; it is preserved intentionally.
5. If a DB snapshot is unavailable, restore the affected legacy rows from the JSON backup before retrying.

## Internal Verification Substrate

Create or reuse the internal verification Clerk user + workspace:

```bash
cd /Users/ct/payflux-prod/apps/dashboard
DATABASE_URL="$(npx netlify env:get DATABASE_URL --context production)" \
CLERK_SECRET_KEY="$(npx netlify env:get CLERK_SECRET_KEY)" \
node scripts/create-internal-verification-user.mjs
```

Create internal-only Stripe fixtures:

```bash
cd /Users/ct/payflux-prod/apps/dashboard
STRIPE_SECRET_KEY="$(npx netlify env:get STRIPE_SECRET_KEY)" \
STRIPE_PRICE_ID="$(npx netlify env:get STRIPE_PRICE_ID)" \
INTERNAL_VERIFY_WORKSPACE_ID="<workspace-id>" \
node scripts/create-internal-stripe-fixtures.mjs
```

Link the internal connected account to the internal workspace without touching any customer data:

```bash
cd /Users/ct/payflux-prod/apps/dashboard
DATABASE_URL="$(npx netlify env:get DATABASE_URL --context production)" \
INTERNAL_VERIFY_WORKSPACE_ID="<workspace-id>" \
INTERNAL_VERIFY_STRIPE_ACCOUNT_ID="<connected-account-id>" \
node scripts/link-internal-processor-connection.mjs
```

Inspect the internal workspace runtime state:

```bash
cd /Users/ct/payflux-prod/apps/dashboard
DATABASE_URL="$(npx netlify env:get DATABASE_URL --context production)" \
INTERNAL_VERIFY_WORKSPACE_ID="<workspace-id>" \
node scripts/inspect-workspace-runtime.mjs
```

Notes:

- The created subscription is internal-only and trialing.
- The created connected account is internal-only and expected to remain low-signal / not-ready unless explicitly onboarded and funded.
- The platform account may be used only for blocked-path verification, not for claiming customer activation success.
- The internal link script is verification-only. It proves DB-scoped runtime behavior without claiming that live OAuth callback was exercised.
