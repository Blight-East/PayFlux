# PayFlux Alert Router

An optional sidecar service that routes PayFlux pilot warnings to Slack or generic webhooks.

> **Note**: This is a pilot-optional adapter. It does not modify PayFlux behavior, does not process payment data, and operates only on metadata. Best-effort notifications only.

## Overview

The Alert Router polls the PayFlux pilot API for warnings and delivers event-driven alerts to your notification channels. It's designed to be:

- **Optional** — PayFlux runs fine without it
- **Non-blocking** — Never impacts PayFlux operations
- **Best-effort** — Alerts are delivered with retry, but not guaranteed
- **Safe** — No PII/PAN processed; only warning metadata

## Features

- Polls `/pilot/warnings` endpoint on configurable interval
- Routes alerts to Slack Incoming Webhooks or generic HTTP endpoints
- Built-in dedupe (same warning alerts once per 24h by default)
- Rate limiting (max 30 alerts/hour by default, configurable)
- Bounded retry on failures (3 attempts with backoff)
- Structured JSON logging with no sensitive data

## Requirements

- PayFlux running with `PAYFLUX_PILOT_MODE=true`
- A valid PayFlux API key with access to `/pilot/*` endpoints
- Slack Incoming Webhook URL or a generic webhook endpoint

## Quick Start

### 1. Create environment file

```bash
cat > .env << EOF
PAYFLUX_API_KEY=your-payflux-api-key
STRIPE_API_KEY=sk_test_xxx

# Enable the router
PAYFLUX_ALERT_ROUTER_ENABLED=true

# Slack configuration
ALERT_SINK=slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00/B00/XXXX
EOF
```

### 2. Start the stack

```bash
docker compose up --build
```

### 3. Verify it's running

```bash
# Check router logs
docker compose logs alert-router

# Should see:
# {"level":"INFO","msg":"alert_router_started","poll_interval":"15s",...}
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PAYFLUX_ALERT_ROUTER_ENABLED` | No | `false` | Master switch to enable router |
| `PAYFLUX_BASE_URL` | No | `http://payflux:8080` | PayFlux API URL |
| `PAYFLUX_PILOT_AUTH` | Yes* | — | Bearer token for pilot API |
| `ALERT_SINK` | Yes* | `slack` | `slack` or `webhook` |
| `SLACK_WEBHOOK_URL` | If slack | — | Slack incoming webhook URL |
| `ALERT_WEBHOOK_URL` | If webhook | — | Generic webhook URL |
| `POLL_INTERVAL_SECONDS` | No | `15` | How often to poll for warnings |
| `ALERT_MIN_BAND` | No | `elevated` | Minimum risk band to alert on |
| `ALERT_MAX_PER_HOUR` | No | `30` | Max alerts per destination per hour |
| `DEDUPE_TTL_SECONDS` | No | `86400` | How long to suppress duplicate alerts |
| `PAYFLUX_DASHBOARD_URL` | No | — | Link to include in alerts |

*Required only when `PAYFLUX_ALERT_ROUTER_ENABLED=true`

## Alert Payload

Alerts contain only minimal, truthful metadata:

```json
{
  "warning_id": "1234567890-0",
  "processor": "stripe",
  "risk_band": "high",
  "processed_at": "2026-01-13T10:00:00Z",
  "message": "PayFlux detected an elevated risk pattern",
  "dashboard_url": "http://localhost:8080/pilot/dashboard"
}
```

For Slack, the message is formatted with color-coded attachments.

## Safety & Compliance

- **No PCI impact**: Router does not process, store, or transmit cardholder data
- **Metadata only**: Alerts contain warning IDs, processor names, and risk bands
- **Redacted logging**: Webhook URLs, auth tokens, and bodies are never logged
- **Rate limited**: Built-in throttling prevents alert spam

## Running Tests

```bash
cd examples/alert-router
go test -v ./...
```

## Disabling

To disable the router, either:
- Set `PAYFLUX_ALERT_ROUTER_ENABLED=false`
- Remove or comment out the `alert-router` service from docker-compose
- Simply don't run the router container

PayFlux will function identically with or without the router.

## Limitations

- In-memory state (dedupe cache resets on restart)
- No persistent alert history
- No Stripe/Adyen direct integration (relies on PayFlux API)
- Best-effort delivery only

## Troubleshooting

**Router not sending alerts?**
1. Check `PAYFLUX_ALERT_ROUTER_ENABLED=true`
2. Verify `PAYFLUX_PILOT_AUTH` matches your PayFlux API key
3. Ensure PayFlux has `PAYFLUX_PILOT_MODE=true`
4. Check warning risk band meets `ALERT_MIN_BAND` threshold

**Rate limit exceeded?**
- Increase `ALERT_MAX_PER_HOUR` or wait for hourly reset
- Check logs for `rate_limit_exceeded` messages

**Connection errors?**
- Verify `PAYFLUX_BASE_URL` is reachable from router container
- Check PayFlux health: `curl http://localhost:8080/health`
