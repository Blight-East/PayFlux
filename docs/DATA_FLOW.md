# PayFlux Data Flow

This document describes how PayFlux processes payment event data.

---

## Flow Overview

```
[Customer System] ──▶ [PayFlux Ingest] ──▶ [Normalize] ──▶ [Score] ──▶ [Export]
```

1. **Ingest** — Receives pseudonymous event metadata via HTTP API
2. **Normalize** — Validates and structures event data
3. **Score** — Computes behavioral risk signals (in-memory, O(1))
4. **Export** — Emits enriched events to stdout/file for downstream consumption

---

## What PayFlux Processes

✅ **Pseudonymous operational metadata only**

- Event type (e.g., `payment_failed`, `payment_succeeded`)
- Processor identifier (e.g., `stripe`, `adyen`)
- Hashed merchant and payment intent identifiers
- Failure category and retry count
- Geographic bucket (e.g., `US`, `EU`)
- Timestamp

---

## What PayFlux Does NOT Process

❌ **No PAN** — No primary account numbers (card numbers)

❌ **No CVV** — No card verification values

❌ **No PII** — No names, emails, addresses, or personal customer information

---

## Data Preparation Requirements

All identifiers must be **hashed or tokenized prior to ingestion** by the customer.

PayFlux does not perform hashing or tokenization. Customers are responsible for ensuring that no raw identifiers or sensitive data are sent to PayFlux.

---

## Operational Model

PayFlux operates **out of band** and **never blocks payments**.

- PayFlux receives event data after the payment decision has been made
- PayFlux does not interact with payment processors directly
- PayFlux does not approve, reject, or modify transactions

If PayFlux is unavailable, payment processing continues normally with no impact to transaction flow.

---

## Data Retention

PayFlux is an observability buffer, not a long-term data store.

- Events are retained in Redis Streams up to `PAYFLUX_STREAM_MAXLEN` (default: 200,000 messages)
- For long-term storage, export events to a downstream system (data warehouse, S3, Kafka)
