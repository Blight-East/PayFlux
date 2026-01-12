# Stripe Webhook Forwarder Reference (Pilot Use)

This example provides an event-driven reference implementation for forwarding Stripe Webhook events to PayFlux. It is designed to help pilot champions correlate PayFlux warnings with actual enforcement actions taken by Stripe.

## Overview

The forwarder is a lightweight, optional service that:
1. Listens for Stripe webhooks on `POST /webhooks/stripe`.
2. Verifies the Stripe signature to ensure authenticity.
3. Maps only specific Stripe events (`payment_intent.payment_failed`, `charge.failed`) to the PayFlux ingest schema.
4. Forwards normalized events to PayFlux asynchronously to measure the time between a warning and an observed Stripe outcome.

### When to use this
- You are running a 90-day PayFlux pilot with Stripe volume.
- You need to track exactly when Stripe throttles or reviews a transaction following a PayFlux warning.
- You want a turnkey integration without touching your core payment logic or checkout flow.

### When NOT to use this
- You are strictly evaluating PayFlux's internal traffic-based warnings and don't yet need outcome correlation.
- You require persistent, compliance-grade transaction logging (this is a pilot-scoped tool).

**Safety & Compliance:**
This forwarder handles only metadata delivered by Stripe webhooks and does not touch PAN or card data. It is intentionally scoped to non-sensitive fields to minimize compliance impact.

---

## Technical Note: Guarantees
- **Async Handling:** The service returns a 200 OK to Stripe immediately after signature verification. Forwarding happens off the request path.
- **Idempotency:** The service maintains an in-memory deduplication cache to prevent duplicate forwarding of the same Stripe Event ID.
- **Pilot Scoped:** These guarantees are best-effort and in-memory, which is sufficient for pilot proof capture.

---

## Configuration

The following environment variables are required:

| Variable | Description |
|----------|-------------|
| `STRIPE_WEBHOOK_SECRET` | Secret from Stripe Dashboard used to verify signatures. |
| `PAYFLUX_API_KEY` | Your PayFlux API key. |
| `PAYFLUX_INGEST_URL` | URL of the PayFlux ingest endpoint (default: `http://localhost:8080/v1/events/payment_exhaust`). |

## Setup Instructions

### 1. Create Stripe Webhook
1. Go to the [Stripe Dashboard](https://dashboard.stripe.com/webhooks).
2. Click **Add endpoint**.
3. Set the URL to your forwarder's endpoint (e.g., `https://your-domain.com/webhooks/stripe`).
4. Select events: `payment_intent.payment_failed`, `charge.failed`.
5. Copy the **Signing secret** (`whsec_...`).

### 2. Run with Docker Compose
```bash
STRIPE_WEBHOOK_SECRET=whsec_... PAYFLUX_API_KEY=test-key docker compose up
```

### 3. Test with Stripe CLI
You can simulate webhooks locally using the Stripe CLI:
```bash
# Listen and forward to local forwarder
stripe listen --forward-to localhost:8081/webhooks/stripe

# Trigger a test failure
stripe trigger payment_intent.payment_failed
```

## Field Mapping

| Stripe Field | PayFlux Field | Notes |
|--------------|---------------|-------|
| `event.type` | `event_type` | e.g. `payment_intent.payment_failed` |
| `event.id` | `event_id` | Stripe event ID |
| `pi.last_payment_error.code` | `failure_category` | e.g. `card_declined` |
| `pi.amount` | `amount_bucket` | Mapped to `low`, `medium`, `high` |
| `event.account` | `merchant_id_hash` | SHA256 hashed (first 16 chars) |
| `pi.id` | `payment_intent_id_hash` | SHA256 hashed (first 16 chars) |

## Development

To run locally without Docker:
```bash
export STRIPE_WEBHOOK_SECRET=whsec_...
export PAYFLUX_API_KEY=test-key
go run main.go
```
