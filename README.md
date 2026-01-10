PayFlux — Payment Traffic Observability Buffer

**What PayFlux is:**

PayFlux ingests, orders, and normalizes payment events in real time, providing early visibility into risky patterns—retry storms, processor degradation, geographic anomalies, failure clustering—before they escalate into rate limits, account flags, or lost revenue.

It buffers payment events via Redis Streams and exports them (stdout or file) for downstream analysis, alerting, and archival by external systems (Vector, Fluent Bit, data warehouses).

**What PayFlux is NOT:**

- Not a payment processor (does not handle money or PCI-regulated data)
- Not a compliance audit log (export is best-effort after ACK by design)
- Not a replacement for durable storage (external log shippers with retries handle durability)

**Target users:**

Teams operating real payment systems who need observability buffers for traffic analysis, early warning signals, and anomaly detection. You should be comfortable running Redis, configuring log shippers, and operating infrastructure.

**Key design tradeoff:**

Events are acknowledged (ACK) in Redis **before** export. Export is best-effort and non-blocking. For durable storage, use `PAYFLUX_EXPORT_MODE=stdout` piped to a log shipper with disk buffering. This architecture favors throughput and operational simplicity over in-app durability guarantees.

⸻

> [!WARNING]
> **This is NOT a managed service.**
>
> PayFlux requires you to operate Redis, collect logs, and monitor metrics yourself. There is no hosted dashboard, no support SLA, and no magic.
>
> If you want a hosted version, [request early access](https://payflux.dev) instead.

**License:** PayFlux is offered under a commercial early-access license. See [LICENSE.md](LICENSE.md) for details.

⸻

## Deploy PayFlux in 10 Minutes (Checklist)

**Prerequisites** (install these first):
- **Docker** — runs PayFlux and Redis in containers ([install](https://docs.docker.com/get-docker/))
- **curl** — sends test requests (pre-installed on macOS/Linux)
- **Git** — clones this repo

> [!NOTE]
> **What is Redis?** Redis is a fast in-memory database. PayFlux uses it to queue and order payment events. You don't need to configure it—Docker handles everything.

---

### ✅ Step 1: Clone the Repository

```bash
git clone https://github.com/Blight-East/PayFlux.git
cd PayFlux
```

**Expected:** You see a `deploy/` folder and `main.go` file.

**Common failure:** `git: command not found` → Install Git: `brew install git` (macOS) or `apt install git` (Linux).

---

### ✅ Step 2: Build PayFlux

```bash
docker build -t payflux:latest .
```

**Expected:** Final line says `Successfully tagged payflux:latest`.

**Common failure:** `Cannot connect to Docker daemon` → Start Docker Desktop or run `sudo systemctl start docker`.

---

### ✅ Step 3: Configure Your API Keys

Edit `deploy/docker-compose.yml` and replace these placeholder values:

```yaml
PAYFLUX_API_KEY: "your-secret-api-key"      # Any string you choose
STRIPE_API_KEY: "sk_test_your_stripe_key"   # From Stripe dashboard (test mode OK)
```

**Expected:** File saved with your real keys.

**Common failure:** Forgot to save → PayFlux will reject requests with `unauthorized`.

---

### ✅ Step 4: Start Everything

```bash
cd deploy
docker compose up
```

**Expected:** You see logs like:
```
payflux-1  | {"level":"INFO","msg":"server_listening","addr":":8080"}
redis-1    | Ready to accept connections
```

**Common failure:** `port 8080 already in use` → Stop whatever is using port 8080, or change the port in `docker-compose.yml`.

---

### ✅ Step 5: Verify Health

Open a **new terminal** and run:

```bash
curl http://localhost:8080/health
```

**Expected:** `{"status":"ok"}`

**Common failure:** `Connection refused` → PayFlux isn't running. Check the Docker logs.

---

### ✅ Step 6: Send a Test Event

```bash
curl -X POST http://localhost:8080/v1/events/payment_exhaust \
  -H "Authorization: Bearer your-secret-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "payment_failed",
    "event_timestamp": "2026-01-09T12:00:00Z",
    "event_id": "550e8400-e29b-41d4-a716-446655440000",
    "processor": "stripe",
    "merchant_id_hash": "abc123",
    "payment_intent_id_hash": "pi_abc",
    "failure_category": "card_declined",
    "retry_count": 0,
    "geo_bucket": "US"
  }'
```

**Expected:** HTTP 202 (empty response body).

**Verification:** Run `curl -s localhost:8080/metrics | grep payflux_ingest_accepted` and confirm the counter incremented. Processing logs (`event_processed`) may appear in the Docker terminal shortly after.

**Common failure:** `401 unauthorized` → Your `Authorization` header doesn't match `PAYFLUX_API_KEY` in docker-compose.yml.

---

### ✅ Step 7: Check Metrics

```bash
curl -s http://localhost:8080/metrics | grep payflux_ingest_accepted
```

**Expected:** `payflux_ingest_accepted_total 1`

**Common failure:** Metric is 0 → Your test event was rejected. Check the logs for validation errors.

---

## Did It Work?

If you completed all steps, you should see:

| Check | Command | Expected |
|-------|---------|----------|
| Health | `curl localhost:8080/health` | `{"status":"ok"}` |
| Metrics | `curl -s localhost:8080/metrics \| grep accepted` | `payflux_ingest_accepted_total 1` |
| Logs | Docker terminal | `event_processed id=... type=payment_failed` |

**Congratulations!** PayFlux is running. Events are being buffered in Redis and exported to stdout (which Vector can ship to your logging stack).

---

## What's Next?

- **Ship logs to your stack:** Configure Vector in `deploy/vector.toml` to send events to S3, Elasticsearch, Datadog, etc.
- **Monitor with Prometheus:** Scrape `http://localhost:8080/metrics` for alerting.
- **Read the Runbook:** See [RUNBOOK.md](RUNBOOK.md) for operational guidance.

---

## Advanced Deployment (Optional)

For production environments, see the reference configs below. These require more infrastructure knowledge.

**systemd** ([`deploy/systemd/payflux.service`](deploy/systemd/payflux.service)) — For bare-metal Linux servers.

**Kubernetes** ([`deploy/k8s/payflux.yaml`](deploy/k8s/payflux.yaml)) — Single-file manifest for K8s clusters.

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

## Design Principles

- Producers never block on downstream systems
- Ordering is guaranteed per stream
- Backpressure handled natively by Redis
- Consumers scale independently
- Failure domains are isolated

⸻

## Key Features

- High-throughput HTTP ingestion
- Redis Streams for durability and ordering
- Consumer groups for parallel processing
- Crash-safe processing with pending reclaim
- Dead-letter queue (DLQ) support
- Prometheus-compatible metrics
- Health checks for orchestration systems

⸻

API Overview

Ingest Event

POST /v1/events/payment_exhaust
```json
{
  "event_type": "payment_failed",
  "event_timestamp": "2026-01-06T00:00:00Z",
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
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
```

**Response:** `202 Accepted`

⸻

Configuration

All configuration is via environment variables.

**Logging:**
- Startup logs use structured JSON format (slog) for easy parsing
- All other logs remain as log.Printf for now

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

⸻

## Processor Risk Score (beta)

PayFlux enrichment provides a **deterministic, explainable, and processor-aligned** risk signal computed O(1) in-memory during export. It uses behavioral proximity—not ML—to help infrastructure teams distinguish between nominal jitter and catastrophic failure patterns.

> [!IMPORTANT]
> This is a behavioral early-warning signal, NOT a compliance, fraud-prevention, or audit guarantee.

### Recommended Prometheus Alerts

```yaml
# Alert on sustained high risk
- alert: ProcessorRiskHigh
  expr: payflux_processor_risk_score_last > 0.6
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Processor {{ $labels.processor }} risk is elevated"

# Alert on critical spikes
- alert: ProcessorRiskCritical
  expr: payflux_processor_risk_score_last >= 0.8
  for: 1m
  labels:
    severity: critical
```

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PAYFLUX_RISK_SCORE_ENABLED` | `true` | Enable/disable risk enrichment |
| `PAYFLUX_RISK_SCORE_WINDOW_SEC` | `300` | Sliding window for metrics (default 5m) |
| `PAYFLUX_RISK_SCORE_THRESHOLDS` | `0.3,0.6,0.8` | Cutoffs for elevated, high, and critical bands |

### Export Example

```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "processor": "stripe",
  "processor_risk_score": 0.65,
  "processor_risk_band": "high",
  "processor_risk_drivers": ["high_failure_rate", "retry_pressure_spike"]
}
```

⸻

**API Key Rotation:**

To rotate keys without downtime:
1. Add the new key to `PAYFLUX_API_KEYS` alongside the old key: `old-key,new-key`
2. Deploy and verify clients can use the new key
3. Update clients to use the new key
4. Remove the old key from the list and redeploy

⸻

## Operational Maturity

**Runbook** ([`RUNBOOK.md`](RUNBOOK.md))
- SOPs for stuck messages, Redis outages, and export failures.
- Tuning guide for rate limits and memory pressure.

**Performance & Smoke Tests** ([`scripts/smoke_load.sh`](scripts/smoke_load.sh))
- Reproducible load test (10k events) to verify capacity.
- `main_bench_test.go` for in-process latency tracking.

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

**Integrations:**

Stdout (default) works with log aggregators:
```bash
# Datadog Agent (via journald or file)
./payflux | tee -a /var/log/payflux/events.jsonl

# Vector
./payflux | vector --config vector.toml

# Fluent Bit
./payflux 2>&1 | fluent-bit -c fluent-bit.conf

# CloudWatch Logs (via awslogs driver or agent)
docker run --log-driver=awslogs ... payflux
```

File mode for persistent local export:
```bash
PAYFLUX_EXPORT_MODE=file PAYFLUX_EXPORT_FILE=/var/log/payflux/exports.jsonl ./payflux
```

Monitor export health:
```bash
curl http://localhost:8080/export/health
# Returns per-destination status with timestamps:
# {"enabled":true,"export_mode":"stdout","destinations":{"stdout":{"enabled":true,...}}}
```

Prometheus metrics for export observability:
```
payflux_events_exported_total{destination="stdout|file"}
payflux_export_errors_total{destination="stdout|file",reason="write|marshal|flush"}
payflux_exports_last_success_timestamp_seconds{destination="stdout|file"}
```

**File Rotation:**

PayFlux export is designed for **external rotation** via standard system tools:

```bash
# logrotate (/etc/logrotate.d/payflux)
/var/log/payflux/exports.jsonl {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        killall -SIGHUP payflux 2>/dev/null || true
    endscript
}

# systemd with journald (stdout capture)
systemctl cat payflux.service
[Service]
StandardOutput=journal
# Access via: journalctl -u payflux -f

# Docker logging with rotation
docker run -d \
  --log-driver json-file \
  --log-opt max-size=50m \
  --log-opt max-file=10 \
  payflux

# Log shippers (Vector, Fluent Bit, Filebeat) handle rotation automatically
```

PayFlux intentionally does **not** implement in-app rotation. External tooling is more reliable, configurable, and battle-tested.

**What this is NOT:**
- Not a replacement for analytics databases (use downstream exporters)
- Not a compliance archive (export to S3, warehouse, etc.)
- This is a starter interface for observability, not the final data layer

⸻

## Observability & Integrations

### Available Today

- `/metrics` — Prometheus format (Grafana, Datadog compatible)
- `/health` — readiness / liveness checks
- Structured JSON logs
- Redis Streams as the event backbone

### Export Model

PayFlux does not force a dashboard. Instead:

- All events land in Redis Streams
- Consumers attach to the stream
- Each consumer implements a single responsibility

This makes PayFlux compatible with:

- Datadog
- Grafana
- Kafka / Redpanda
- Webhooks
- Data warehouses (Snowflake, BigQuery)

### Planned Exporters

- Kafka / Redpanda exporter
- Webhook exporter
- Warehouse batch exporter

Exporters are implemented as consumers—no changes to ingestion required.

⸻

## Performance (Local Proof)

- Sustained 40k+ events/sec on a laptop
- Zero pending messages under load
- Consumer lag drains to zero after spikes
- No producer backpressure

Raw Redis output and load test commands are included in [PROOF-load-test.md](PROOF-load-test.md).

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

## Production Readiness Notes

PayFlux v0.2.x is safe for early access and pilot deployments.

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

## Licensing

PayFlux is offered under a commercial early-access license.

- Self-hosted
- Annual license
- Pricing based on deployment size and event volume
- Custom enterprise agreements available

See [LICENSE.md](LICENSE.md) for details.

⸻

## Roadmap (Non-Binding)

- Multi-consumer examples
- Kafka exporter
- Managed hosted offering
- Per-merchant stream partitioning
- SLA tooling for processors and PSPs

⸻

Contact

📧 hello@payflux.dev
🌐 https://payflux.dev

