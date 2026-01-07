PayFlux — Real-Time Payment Event Gateway

PayFlux is a lightweight, high-throughput event ingestion node for payment systems.

It ingests payment events over HTTP and converts them into a durable, ordered stream using Redis Streams—allowing downstream consumers (risk, analytics, alerting, billing) to scale independently without blocking the payment path.

HTTP in → ordered stream out. No Kafka required.

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

