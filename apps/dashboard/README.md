# PayFlux Dashboard MVP

Minimal hosted onboarding and dashboard UI for PayFlux.

## Stack
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS

## Deployment (app.payflux.dev)

### Prerequisites
- Node.js 18+
- PayFlux Core instance running and accessible

### Setup
1. `cd apps/dashboard`
2. `npm install`
3. Set required environment variables (see below)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ADMIN_TOKEN` | Yes | Dashboard login token |
| `PAYFLUX_API_KEY` | Yes | Auth for PayFlux core |
| `PAYFLUX_API_URL` | Yes | PayFlux core base URL |
| `PAYFLUX_INGEST_URL` | Yes | PayFlux ingest endpoint |
| `STRIPE_WEBHOOK_SECRET` | Yes (prod) | Must start with `whsec_` |
| `DASHBOARD_ALLOW_PILOT_ENDPOINTS` | No | Set `true` to enable pilot data |
| `DASHBOARD_WEBHOOK_TEST_BYPASS` | No | Set `true` in dev only for test events |
| `DASHBOARD_PERSIST_CONFIG` | No | Set `true` to persist non-secret config |

> **Production Security**: Set all secrets via environment variables only. The dashboard does NOT persist secrets to disk. Only non-sensitive fields (labels, timestamps) are stored when persistence is enabled.

### Running Locally
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

## Features
- **Auth**: Single token login via `ADMIN_TOKEN`.
- **Connectors**: Stripe-first connector with signature verification.
- **Dashboard**: Warnings dashboard (requires `DASHBOARD_ALLOW_PILOT_ENDPOINTS=true`).
- **Control Plane**: Forwarding layer to PayFlux core.

## Security Model
1. **Webhook Verification**: Requires valid `whsec_` secret in production.
2. **Test Bypass**: Only works when `NODE_ENV=development` AND `DASHBOARD_WEBHOOK_TEST_BYPASS=true`.
3. **Pilot Gating**: Pilot endpoints blocked unless `DASHBOARD_ALLOW_PILOT_ENDPOINTS=true`.
4. **No Secret Persistence**: Secrets must come from env vars, never stored on disk.

## Testing
```bash
# Run unit tests
node scripts/test-webhook.js

# Run smoke tests (requires dashboard running)
./scripts/smoke.sh
```

## Prometheus Integration

The dashboard can display auth denial metrics when Prometheus is configured.

```bash
# Add to .env.local
PROMETHEUS_URL=http://localhost:19090
```

### Verifying Auth Metrics Endpoint

The `/api/metrics/auth-denials` endpoint requires authentication:

```bash
# 1. Login and save cookies
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"token":"payflux-admin-token"}' \
  -c cookies.txt

# 2. Test auth denial metrics endpoint
curl -b cookies.txt http://localhost:3000/api/metrics/auth-denials

# Expected responses:
# - Unauthenticated: {"error":"Unauthorized"}
# - Authenticated + Prometheus up: {"available":true,"denials":{...},"window":"15m"}
# - Authenticated + Prometheus down: {"available":false}
```
