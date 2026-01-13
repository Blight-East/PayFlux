# PayFlux Ops Observability Stack

Optional monitoring stack for PayFlux operators. Includes Prometheus, Grafana, and pre-configured alert rules.

## What This Is

- **Operator observability** for your own infrastructure: consumer lag, rate limiting, kill switches, process health
- Pre-built dashboard showing operational metrics
- Alert rules for common operational issues
- Fully optional — does not run unless you start it
- Does **not** require a real Stripe API key to show metrics

> **Note**: This is infrastructure monitoring for operators. It is NOT customer-facing alerting, provides no latency guarantees, and is not required for PayFlux to function.

## What This Is NOT

- **Not customer-facing alerting** (see Alert Router for that)
- **Periodic, not instantaneous** — scrape intervals are 10-15s; this is for operational awareness, not latency-sensitive alerting
- **Not a guarantee** of uptime or response times
- **Not required** for PayFlux to function

## Quick Start

```bash
cd examples/ops-observability

# Create .env file with secure password (required)
echo "GF_ADMIN_PASSWORD=your-secure-password-here" > .env

# Start the stack
docker compose up -d

# Access Grafana (localhost only)
open http://127.0.0.1:3000
# Login: admin / your-secure-password-here

# Access Prometheus (localhost only)
open http://127.0.0.1:19090
```

## Shutting Down

```bash
cd examples/ops-observability
docker compose down      # Stop containers (keeps data)
docker compose down -v   # Stop and remove volumes (clears metrics history)
```

## Security Notes

> ⚠️ **Do not expose Grafana or Prometheus to the public internet.**

- Both services bind to `127.0.0.1` (localhost only) by default
- If you need remote access, use SSH tunneling or VPN
- **Change the default Grafana password** before first use
- No secrets are logged by this stack
- Consider network policies if deploying beyond local development

### Default Credentials

| Service | Username | Password |
|---------|----------|----------|
| Grafana | admin | Set via `GF_ADMIN_PASSWORD` env var |
| Prometheus | N/A | No authentication by default |

## Stripe API Key

> **Stripe key is optional here.** It is used only for Stripe integration paths, not for metrics.

The docker-compose.yml provides a placeholder key (`sk_test_ops_demo_placeholder`) that satisfies PayFlux's format requirement. This allows the metrics stack to run without a real Stripe key.

If you're testing actual Stripe integration, replace the key in your `.env` file:

```bash
echo "STRIPE_API_KEY=sk_test_your_real_key" >> .env
```

## Expected Behaviors

### PayFlux shows "target down" in Prometheus

This is **expected and normal** if:
- PayFlux container is still starting
- PayFlux is not running in this compose stack
- PayFlux crashed and is restarting

The ops stack (Prometheus + Grafana) will continue to run and function. When PayFlux becomes available, Prometheus will automatically start scraping it.

## Dashboard Panels

The pre-provisioned "PayFlux Ops Overview" dashboard includes:

| Panel | Metric | Description |
|-------|--------|-------------|
| Consumer Lag | `payflux_consumer_lag_messages` | Messages waiting in Redis stream |
| PayFlux Status | `up{job="payflux"}` | Process health (UP/DOWN) |
| Rate Limiting | `rate(payflux_ingest_rate_limited_total[5m])` | Rate-limited requests per second |
| Ingest Rejections | `rate(payflux_ingest_rejected_total[5m])` | Rejected events per second |
| Warnings Suppressed | `increase(payflux_warnings_suppressed_total[5m])` | Deduplicated warnings |
| Scrape Duration | `scrape_duration_seconds` | Prometheus scrape latency |

## Alert Rules

Pre-configured alerts in `alerts.yml`:

| Alert | Condition | Severity |
|-------|-----------|----------|
| PayFluxDown | `up == 0` for 1m | critical |
| ConsumerLagHigh | `lag > 1000` for 2m | warning |
| RateLimitingSpike | `rate > 5/s` for 5m | warning |
| IngestRejectSpike | `rate > 1/s` for 5m | warning |
| WarningsSuppressed | `increase > 0` in 5m | info |

### Customizing Thresholds

Edit `alerts.yml` to adjust thresholds:

```yaml
# Example: raise consumer lag threshold to 5000
- alert: ConsumerLagHigh
  expr: payflux_consumer_lag_messages > 5000
  for: 2m
```

Then reload Prometheus:

```bash
curl -X POST http://127.0.0.1:19090/-/reload
```

## Smoke Test

Verify the stack is working:

```bash
./smoke_test.sh
```

Expected output:
```
✓ Port 19090 available for Prometheus
✓ Port 3000 available for Grafana
✓ Port 8080 available for PayFlux
✓ Prometheus healthy
✓ Grafana healthy
✓ PayFlux metrics reachable (up=1)
✓ Smoke test: PASS
```

If PayFlux is not running, you'll see:
```
✓ Prometheus healthy
✓ Grafana healthy
⚠ PayFlux not reachable (ops stack healthy, PayFlux target down)
⚠ Smoke test: WARN (ops stack healthy, PayFlux target may be down)
```

This is normal — the ops stack itself is healthy. PayFlux just isn't available to scrape.

## Architecture

```
┌─────────────┐     scrape      ┌─────────────┐
│  Prometheus │◄────────────────│   PayFlux   │
│  :19090      │  /metrics       │   :8080     │
└─────────────┘                 └─────────────┘
       │                               │
       │                               │
       ▼                               ▼
┌─────────────┐                 ┌─────────────┐
│   Grafana   │                 │    Redis    │
│   :3000     │                 │   :6379     │
└─────────────┘                 └─────────────┘
```

## Troubleshooting

### Prometheus shows PayFlux as DOWN

1. Check if PayFlux container is running:
   ```bash
   docker compose ps
   ```

2. Check PayFlux logs:
   ```bash
   docker compose logs payflux
   ```

3. Verify metrics endpoint (if PayFlux is running):
   ```bash
   curl http://127.0.0.1:8080/metrics
   ```

### No data in Grafana

1. Confirm Prometheus is scraping:
   ```bash
   curl http://127.0.0.1:19090/api/v1/targets
   ```

2. Check Grafana datasource connection:
   - Go to Grafana → Connections → Data sources → Prometheus
   - Click "Test"

### Port conflicts

The smoke test will detect port conflicts before starting. If you see errors:
```bash
# Check what's using port 9091
lsof -i :9091

# Check what's using port 3000
lsof -i :3000
```
