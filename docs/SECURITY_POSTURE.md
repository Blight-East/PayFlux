# PayFlux Pilot Security Posture (v0.x)

This document describes pilot-level security controls for PayFlux. This is process documentation, not enterprise certification.

---

## Authentication & Access Control

- **API Key Authentication** — All ingest endpoints require a valid API key via `Authorization: Bearer <key>` header
- **Key Rotation** — Multiple keys can be configured via `PAYFLUX_API_KEYS` for zero-downtime rotation
- **Rate Limiting** — Per-key rate limiting prevents abuse (configurable via `PAYFLUX_RATELIMIT_RPS`)

---

## Logging Discipline

PayFlux logs are designed for operational debugging without exposing sensitive data.

- **No raw payloads** — Request bodies are not logged
- **No sensitive fields** — API keys, tokens, and identifiers are redacted or omitted
- **Structured logs** — Startup logs use JSON format for parsing; runtime logs are plain text

---

## Data Handling

- **No PAN, CVV, or PII** — PayFlux does not accept or store cardholder data or personal information
- **Pseudonymous identifiers only** — All identifiers must be hashed or tokenized before ingestion
- **No data enrichment from external sources** — PayFlux does not call out to third-party APIs

---

## Isolation & Blast Radius

PayFlux is designed as a single-node, stateless application.

- **Single node compromise** — Affects only that node's event buffer; no lateral movement to payment systems
- **No direct processor access** — PayFlux does not hold credentials for payment processors
- **Out-of-band operation** — Compromise does not affect payment transaction flow

---

## Metrics Exposure

- **Prometheus endpoint** — `/metrics` exposes operational counters and gauges
- **No secrets in metrics** — Metric labels contain processor names and categories, not keys or tokens
- **Scoped access** — Metrics endpoint does not require authentication (intended for internal scraping)

---

## Network Exposure

- **Single HTTP port** — Default `:8080` for ingest, health, and metrics
- **TLS termination** — Expected to be handled by a reverse proxy or load balancer
- **No outbound connections** — PayFlux does not initiate connections except to Redis

---

## Limitations

This document describes pilot-level controls, not enterprise certification.

- No SOC 2 attestation
- No ISO 27001 certification
- No formal penetration test report

For enterprise security requirements, contact security@payflux.dev.
