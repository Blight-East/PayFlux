PayFlux — Real-Time Payment Event Gateway

PayFlux is a lightweight, high-throughput event ingestion node for payment systems.

It ingests payment events over HTTP and converts them into a durable, ordered stream using Redis Streams—allowing downstream consumers (risk, analytics, alerting, billing) to scale independently without blocking the payment path.

HTTP in → ordered stream out. No Kafka required.

⸻

Quickstart

```bash
redis-server &
PAYFLUX_API_KEY=test-key STRIPE_API_KEY=sk_test_placeholder go run main.go
curl -H "Authorization: Bearer test-key" -H "Content-Type: application/json" -d '{"event_type":"payment_failed","event_timestamp":"2026-01-09T12:00:00Z","event_id":"550e8400-e29b-41d4-a716-446655440000","processor":"stripe","merchant_id_hash":"test","payment_intent_id_hash":"test","failure_category":"test","retry_count":0,"geo_bucket":"US","amount_bucket":"test","system_source":"test","payment_method_bucket":"test","channel":"web","retry_result":"failed","failure_origin":"processor"}' http://localhost:8080/v1/events/payment_exhaust
curl http://localhost:8080/health && curl -s http://localhost:8080/metrics | grep payflux_ingest_accepted
```

⸻

Proof it runs

![PayFlux validation screenshot showing startup logs, health check, metrics, and successful event processing during v0.1.1 local validation](proof-running.png)

⸻

Why PayFlux Exists

Payment systems fail silently.

Processors make decisions in real time based on traffic patterns, retries, and failure clustering—while most merchants only see delayed dashboards or logs. By the time an issue is visible, the damage is already done.

PayFlux gives teams real-time visibility and control over payment behavior before processors escalate risk actions.

⸻

Core Architecture
[Producers]
   |
   |  HTTP JSON (stateless)
   v
[ PayFlux Node ]
   |
   |  Redis Streams (durable, ordered)
   v
[ Consumers ]
  ├─ Risk / Alerting
  ├─ Analytics
  ├─ Retry Optimization
  └─ Exports (Kafka, Webhooks, Warehouses)

Design Principles
	•	Producers never block on downstream systems
	•	Ordering is guaranteed per stream
	•	Backpressure handled natively by Redis
	•	Consumers scale independently
	•	Failure domains are isolated

⸻

Key Features
	•	High-throughput HTTP ingestion
	•	Redis Streams for durability and ordering
	•	Consumer groups for parallel processing
	•	Crash-safe processing with pending reclaim
	•	Dead-letter queue (DLQ) support
	•	Prometheus-compatible metrics
	•	Health checks for orchestration systems

⸻

API Overview

Ingest Event

POST /v1/events/payment_exhaust
json
{
  "event_type": "payment_failed",
  "event_timestamp": "2026-01-06T00:00:00Z",
  "event_id": "uuid-123",
  "merchant_id_hash": "abc123",
  "payment_intent_id_hash": "xyz456",
  "processor": "stripe",
  "failure_category": "processor_timeout",
  "retry_count": 0,
  "geo_bucket": "US",
  "amount_bucket": "50-200",
  "system_source": "checkout_api",
  "payment_method_bucket": "credit_card",
  "channel": "web",
  "retry_result": "failed",
  "failure_origin": "processor"
}

Response
202 Accepted

⸻

Configuration

All configuration is via environment variables.

**Required:**

| Variable | Description |
|----------|-------------|
| `PAYFLUX_API_KEY` | Single API key for auth (used if `PAYFLUX_API_KEYS` not set) |
| `PAYFLUX_API_KEYS` | Comma-separated list of valid API keys (preferred for rotation) |
| `STRIPE_API_KEY` | Stripe secret key (must start with `sk_`) |

**Optional:**

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_ADDR` | `localhost:6379` | Redis server address |
| `HTTP_ADDR` | `:8080` | HTTP listen address |
| `PAYFLUX_CONSUMER_NAME` | auto-generated | Consumer name (hostname-pid-random if unset) |
| `PAYFLUX_RATELIMIT_RPS` | `100` | Rate limit: requests per second per key |
| `PAYFLUX_RATELIMIT_BURST` | `500` | Rate limit: burst allowance |
| `PAYFLUX_STREAM_MAXLEN` | `200000` | Max stream length (0 = no trimming) |
| `PAYFLUX_PANIC_MODE` | `crash` | Panic handling: `crash` (exit) or `recover` (restart loop) |
| `PAYFLUX_EXPORT_MODE` | `stdout` | Event export: `stdout`, `file`, or `both` |
| `PAYFLUX_EXPORT_FILE` | (none) | Export file path (required for `file` or `both` mode) |
| `PRICE_CENTS` | `9900` | Checkout price in cents |
| `PRODUCT_NAME` | `PayFlux Early Access` | Checkout product name |
| `SITE_URL` | `https://payflux.dev` | Site URL for checkout redirects |

**API Key Rotation:**

To rotate keys without downtime:
1. Add the new key to `PAYFLUX_API_KEYS` alongside the old key: `old-key,new-key`
2. Deploy and verify clients can use the new key
3. Update clients to use the new key
4. Remove the old key from the list and redeploy

⸻

Production Checklist (10 mins)

Run these commands to verify your deployment:

**1. Start Redis and PayFlux**
```bash
redis-server &
export PAYFLUX_API_KEY="test-key-12345"
export STRIPE_API_KEY="sk_test_placeholder"
go run main.go
```

**2. Health Check**
```bash
curl http://localhost:8080/health
# Expected: ok (200)
```

**3. Metrics**
```bash
curl -s http://localhost:8080/metrics | grep payflux_
# Expected: Prometheus metrics with payflux_ prefix
```

**4. Auth - No Token (should fail)**
```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/v1/events/payment_exhaust
# Expected: 401
```

**5. Auth - Valid Token**
```bash
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/v1/events/payment_exhaust \
  -H "Authorization: Bearer test-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"test","event_timestamp":"2026-01-09T12:00:00Z","event_id":"550e8400-e29b-41d4-a716-446655440000","processor":"stripe","merchant_id_hash":"abc","payment_intent_id_hash":"xyz","failure_category":"test","retry_count":0,"geo_bucket":"US","amount_bucket":"test","system_source":"test","payment_method_bucket":"test","channel":"web","retry_result":"test","failure_origin":"test"}'
# Expected: 202
```

**6. Idempotency (send same event_id twice)**
```bash
# First request
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/v1/events/payment_exhaust \
  -H "Authorization: Bearer test-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"test","event_timestamp":"2026-01-09T12:00:00Z","event_id":"550e8400-e29b-41d4-a716-446655440001","processor":"stripe","merchant_id_hash":"abc","payment_intent_id_hash":"xyz","failure_category":"test","retry_count":0,"geo_bucket":"US","amount_bucket":"test","system_source":"test","payment_method_bucket":"test","channel":"web","retry_result":"test","failure_origin":"test"}'
# Expected: 202

# Second request (same event_id)
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/v1/events/payment_exhaust \
  -H "Authorization: Bearer test-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"test","event_timestamp":"2026-01-09T12:00:00Z","event_id":"550e8400-e29b-41d4-a716-446655440001","processor":"stripe","merchant_id_hash":"abc","payment_intent_id_hash":"xyz","failure_category":"test","retry_count":0,"geo_bucket":"US","amount_bucket":"test","system_source":"test","payment_method_bucket":"test","channel":"web","retry_result":"test","failure_origin":"test"}'
# Expected: 202 (idempotent, no duplicate created)

# Check duplicate metric
curl -s http://localhost:8080/metrics | grep payflux_ingest_duplicate_total
# Expected: payflux_ingest_duplicate_total 1 (or higher)
```

**7. Validation (bad UUID)**
```bash
curl -s -X POST http://localhost:8080/v1/events/payment_exhaust \
  -H "Authorization: Bearer test-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"test","event_timestamp":"2026-01-09T12:00:00Z","event_id":"not-a-uuid","processor":"stripe"}'
# Expected: 400 with "event_id must be valid UUID"
```

**8. Graceful Shutdown**
```bash
# In another terminal, send SIGTERM
pkill -TERM -f "go run main.go"
# Expected in logs: shutdown_initiated, shutdown_complete
```

⸻

Event Export

After successful processing, PayFlux exports events as line-delimited JSON to stdout and/or file.

**Why JSON export?**
- Standards-compliant: Works with Datadog, Fluent Bit, Vector, Filebeat, CloudWatch, etc.
- Simple piping: `./payflux > events.jsonl` or systemd journal capture
- No vendor lock-in: Pure JSON, no proprietary formats

**Export modes:**
- `stdout` (default): Write to stdout for log collection
- `file`: Append to `PAYFLUX_EXPORT_FILE`
- `both`: Write to both stdout and file

Export is best-effort after ACK; if export fails, events are still acknowledged.

**Example exported event:**
```json
{"event_id":"550e8400-e29b-41d4-a716-446655440000","event_type":"payment_failed","event_timestamp":"2026-01-09T12:00:00Z","processor":"stripe","stream_message_id":"1767957855596-0","consumer_name":"host-1234-abc","processed_at":"2026-01-09T17:00:00Z"}
```

**What this is NOT:**
- Not a replacement for analytics databases (use downstream exporters)
- Not a compliance archive (export to S3, warehouse, etc.)
- This is a starter interface for observability, not the final data layer

⸻

Observability & Integrations

Available Today
	•	/metrics — Prometheus format (Grafana, Datadog compatible)
	•	/health — readiness / liveness checks
	•	Structured JSON logs
	•	Redis Streams as the event backbone

Export Model

PayFlux does not force a dashboard.

Instead:
	•	All events land in Redis Streams
	•	Consumers attach to the stream
	•	Each consumer implements a single responsibility

This makes PayFlux compatible with:
	•	Datadog
	•	Grafana
	•	Kafka / Redpanda
	•	Webhooks
	•	Data warehouses (Snowflake, BigQuery)

Planned Exporters
	•	Kafka / Redpanda exporter
	•	Webhook exporter
	•	Warehouse batch exporter

Exporters are implemented as consumers—no changes to ingestion required.

⸻

Performance (Local Proof)
	•	Sustained 40k+ events/sec on a laptop
	•	Zero pending messages under load
	•	Consumer lag drains to zero after spikes
	•	No producer backpressure

Raw Redis output and load test commands are included in:PROOF-load-test.md

Deployment

Requirements
	•	Go 1.21+
	•	Redis 6.2+
Run
bash
 go run main.go

Endpoints
	•	POST /v1/events/payment_exhaust
	•	GET /health
	•	GET /metrics

⸻

Operational Defaults

**Redis Durability**

PayFlux relies on Redis for event buffering and stream durability. Redis persistence is the operator's responsibility.

Recommended Redis configuration for production:
- Enable AOF (Append Only File): `appendonly yes`
- Use `appendfsync everysec` for a good balance of durability and performance
- Consider RDB snapshots as a secondary backup

PayFlux assumes Redis is configured for production-safe durability. Without proper persistence, events may be lost on Redis restart.

**Stream Retention**

PayFlux intentionally bounds stream size using `XTRIM MAXLEN ~` (approximate trimming).

- Default retention: `PAYFLUX_STREAM_MAXLEN=200000` messages
- Set to `0` to disable trimming (not recommended for production)

This is a deliberate design decision:
- PayFlux is an **observability and alerting buffer**, not a long-term data store
- Events are retained long enough for real-time monitoring, alerting, and short-term replay
- For compliance archiving or long-term analytics, export events downstream (data warehouse, Kafka, S3)

**Replay and Reprocessing**

Consumers can replay events within the retention window:
- Use `XREAD` or `XREADGROUP` with specific message IDs to replay
- Old events are trimmed by design after reaching `PAYFLUX_STREAM_MAXLEN`

For long-term replay requirements:
- Attach a downstream exporter (Kafka, warehouse, log sink)
- Exporters are implemented as consumers—no changes to PayFlux required

⸻

Production Readiness Notes

PayFlux v0.1.0 is safe for early access and pilot deployments.

**Assumptions:**
- Redis is configured with AOF persistence (`appendfsync everysec` or stricter)
- PayFlux runs under a process supervisor (systemd, Docker, Kubernetes) for automatic restarts
- External monitoring is in place (Prometheus scraping `/metrics`, alerting on `payflux_pending_messages`)
- TLS termination is handled by a load balancer or reverse proxy

**What PayFlux handles:**
- Authentication and rate limiting
- Idempotency and deduplication
- Graceful shutdown with in-flight request completion
- Dead-letter queue for failed messages
- Panic recovery (configurable)

**What PayFlux does NOT handle:**
- Redis persistence configuration (operator responsibility)
- TLS termination (use a reverse proxy)
- Long-term event archival (use downstream exporters)
- Horizontal scaling coordination (each instance is independent)

⸻

Licensing

PayFlux is offered under a commercial early-access license.
	•	Self-hosted
	•	Annual license
	•	Pricing based on deployment size and event volume
	•	Custom enterprise agreements available

See LICENSE.md for details.

⸻

Roadmap (Non-Binding)
	•	Multi-consumer examples
	•	Kafka exporter
	•	Managed hosted offering
	•	Per-merchant stream partitioning
	•	SLA tooling for processors and PSPs

⸻

Contact

📧 hello@payflux.dev
🌐 https://payflux.dev

