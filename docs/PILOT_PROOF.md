# Pilot Proof Mode (v0.2.3+)

PayFlux includes a minimal pilot proof system for capturing "warning → outcome" evidence during a 90-day pilot.

## Overview

When enabled, pilot mode provides:
- **Warning records** for elevated+ risk events
- **Outcome annotation endpoint** for real-time capture
- **Minimal dashboard** for pilot champions
- **Prometheus metrics** for outcome tracking
- **Stdout proof capture** for log pipeline persistence

## Enabling Pilot Mode

```bash
PAYFLUX_PILOT_MODE=true
```

When enabled, PayFlux will:
1. Create in-memory warning records for events with `processor_risk_band` ∈ {elevated, high, critical}
2. Register pilot routes (auth required)
3. Emit pilot outcome annotations to stdout

## Pilot Routes

All routes require the same `Authorization: Bearer <API_KEY>` header as the ingest endpoint.

| Route | Method | Description |
|-------|--------|-------------|
| `/pilot/dashboard` | GET | HTML dashboard with outcome annotation |
| `/pilot/warnings` | GET | JSON list of recent warnings |
| `/pilot/warnings/{id}` | GET | Single warning by ID |
| `/pilot/warnings/{id}/outcome` | POST | Set outcome for a warning |

## Outcome Annotation

### Endpoint
```
POST /pilot/warnings/{warning_id}/outcome
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

### Request Body
```json
{
  "outcome_type": "throttle",
  "observed_at": "2026-01-11T08:00:00Z",
  "notes": "Processor reduced approval rate by 15%"
}
```

### Outcome Types
| Type | Description |
|------|-------------|
| `throttle` | Processor throttled transaction volume |
| `review` | Account flagged for manual review |
| `hold` | Funds or account placed on hold |
| `auth_degradation` | Approval rates declined |
| `rate_limit` | Transaction rate limiting applied |
| `other` | Other observed outcome |
| `none` | No outcome observed (marks as not-observed) |

### Example curl
```bash
curl -X POST http://localhost:8080/pilot/warnings/1768097434029-0/outcome \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"outcome_type": "throttle", "observed_at": "2026-01-11T08:30:00Z", "notes": "15% approval rate drop"}'
```

## Proof Capture

When an outcome is set, PayFlux emits a JSON line to stdout:

```json
{
  "type": "pilot_outcome_annotation",
  "warning_id": "1768097434029-0",
  "event_id": "550e8400-...",
  "processor": "stripe",
  "risk_band": "high",
  "risk_score": 0.72,
  "warning_at": "2026-01-11T08:00:00Z",
  "outcome_type": "throttle",
  "outcome_timestamp": "2026-01-11T08:30:00Z",
  "outcome_source": "manual",
  "outcome_notes": "15% approval rate drop",
  "lead_time_seconds": 1800,
  "annotated_at": "2026-01-11T08:31:00Z"
}
```

This can be shipped via Vector/Fluent Bit to persist pilot evidence even if the process restarts.

## Prometheus Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `payflux_warning_outcome_set_total{outcome_type,source}` | Counter | Outcomes annotated by type and source |
| `payflux_warning_outcome_lead_time_seconds` | Histogram | Time between warning and outcome |

## Storage

**Pilot mode uses in-memory storage only:**
- Cap: 1000 warnings (LRU eviction)
- Lifetime: process restart clears storage
- Redis persistence: not implemented (pilot scope)

This is intentional for pilot simplicity. Proof capture via stdout ensures no data loss.

## Guardrails

> [!IMPORTANT]
> - Labels use "**Observed Outcome**" — not "Caused Outcome"
> - No causal claims — only "outcome observed after warning"
> - No recommendations — champions decide their own actions
> - Language remains probabilistic for Tier 2 context

## Pilot Workflow

1. Enable pilot mode: `PAYFLUX_PILOT_MODE=true`
2. Run PayFlux with Vector shipping logs to your data warehouse
3. Access `/pilot/dashboard` with your API key
4. When processor outcomes occur, annotate them immediately
5. After 90 days, analyze `pilot_outcome_annotation` events for proof

## Future Enhancements (Not Implemented)

- `stripe_webhook` and `adyen_webhook` outcome sources
- Redis-backed persistent warning storage
- Lead time dashboards and trend analysis
