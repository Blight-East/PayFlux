# Risk Intelligence API: Operational Overview

This document provides technical and operational clarity for the PayFlux Risk Intelligence layer.

## Authentication & Quotas
Use the `x-payflux-key` header to authenticate and access higher-tier rate limits.

| Tier | Header | Rate Limit | Capacity |
|------|--------|------------|----------|
| **ANONYMOUS** | (None) | 1 req / min | 3 |
| **FREE** | `x-payflux-key: pf_test_...` | 5 req / min | 10 |
| **PRO** | `x-payflux-key: pf_live_...` | 60 req / min | 100 |

## Core Endpoints

### 1. Risk Scan (`POST /api/v1/risk`)
Perform a real-time risk assessment of a merchant URL.
- **Request**: `{"url": "...", "industry": "...", "processor": "..."}`
- **Headers**: `x-payflux-key` (optional), `x-trace-id` (returned)
- **Response**: `ResponseSchema` (Standard risk snapshot)

### 2. Audit History (`GET /api/v1/risk/history?url=...`)
Returns the full timeline of scans performed for a given host.
- **Payload**: Includes raw snapshots of every previous scan.

### 3. Intelligence Trend (`GET /api/v1/risk/trend?url=...`)
Returns deterministic behavioral signals for a merchant.
- **Trend Logic**:
    - `DEGRADING`: Risk tier increased in the latest scan (risk drift).
    - `IMPROVING`: Risk tier decreased in the latest scan.
    - `STABLE`: No change in risk tier.
- **Policy Surface**: Current counts of Present/Weak/Missing compliance policies.

### 4. System Health (`GET /api/v1/risk/health`)
Returns real-time in-memory counters for SSRF blocks, rate limit denials, and scan success rates.

## Caching & Performance
- **Fresh Scans**: 24 hours (`CACHE_TTL.URL_CRAWL`)
- **Negative Caching**: 1 hour (for scan failures)
- **DNS/SSRF Safety**: 5 seconds
- **Deduplication**: In-flight concurrent requests for the same URL are deduped (leader/follower pattern).

## Observability
Check `x-trace-id` in every response header. This ID maps to a structured JSON log entry in our internal telemetry with the event type:
- `risk_request_start` / `risk_request_complete`
- `risk_ssrf_block`
- `risk_rate_limit_deny`
- `risk_cache_hit` / `risk_cache_miss`
- `risk_history_read` / `risk_trend_read`
