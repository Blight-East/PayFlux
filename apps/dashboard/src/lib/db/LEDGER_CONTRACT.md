# Stripe Event Ledger Contract

**Status:** active
**Owner:** dashboard / payments
**Last reviewed:** 2026-05-10

This document is the canonical contract for the `stripe_event_ledger` table.
Read this before writing any code that reads from or writes to the ledger.

---

## What the ledger IS

- **Immutable ingress history.** Every Stripe webhook delivery this service
  receives is captured here, including signature failures, malformed bodies,
  and unsigned probes.
- **A replay substrate.** Given a starting `received_at` cursor, a consumer
  can scan forward and re-process every event in the order Stripe delivered
  them.
- **A forensic source.** The signature header + raw payload bytes preserved
  per row mean any historical event can be re-verified against any past or
  future webhook signing secret.
- **A temporal chronology.** The `received_at` ordering is the ground truth
  for "in what order did Stripe inform us of state changes?"

## What the ledger IS NOT

- **NOT a current-state store.** A ledger row says "Stripe sent these bytes
  at this time with this signature outcome." It does NOT say "the world is
  now in this state." The `customer.subscription.deleted` event in the
  ledger does not mean the customer is currently canceled — it means we
  received a deletion notification. The customer's current state is the
  output of projecting the relevant slice of the ledger forward, possibly
  reconciled against a polling pull, under deterministic conflict-resolution
  rules.
- **NOT a query-serving layer.** Do not write code that does
  `SELECT … FROM stripe_event_ledger WHERE event_type = '…'` to answer
  product questions. Use a projection table that the reducer writes to.
  Reading the ledger directly for current state is the canonical way that
  half-adopted event sourcing collapses.
- **NOT a transactional business object model.** Subscriptions, payouts,
  workspaces — none of those live here. They live in their own tables,
  derived (when the reducer exists) from the ledger.
- **NOT a synchronization primitive.** Two services writing to the ledger
  do not thereby coordinate. Coordination happens through projections,
  cursors, and (eventually) a real queue. The ledger is a record, not a
  rendezvous.

---

## Append-only enforcement

Triggers on `stripe_event_ledger` raise `feature_not_supported` on UPDATE,
DELETE, and TRUNCATE (see migration `0012_ledger_append_only.sql`).
INSERT is the only mutation path. Any consumer — Node webhook handler, Go
reconciliation worker, future polling worker, retry orchestrator — gets
the same enforcement no matter which language or service connects.

This is database-enforced, not policy. Code discipline is necessary but
not sufficient once multiple consumers exist.

Owner-level operations (DROP, ALTER, RLS bypass) are not gated and are
intentional schema changes that require a migration.

---

## Versioning columns (migration 0013)

Every row carries enough version metadata to make replay over heterogeneous
historical periods possible without silent semantic drift:

| Column | Source | Purpose |
|---|---|---|
| `payload_schema_version` | `event.api_version` from the Stripe payload | Which Stripe API version produced the bytes. Null for malformed bodies and unsigned probes (no event object was constructed). |
| `ingestion_version` | `PAYFLUX_GIT_SHA` of the deployed dashboard | Which version of OUR ingestion code wrote this row. Captures fail-open behavior, signature verify logic, normalization rules current at write time. |
| `reducer_version` | currently always null | Informational: the reducer version current at ingestion time. The **authoritative** reducer fingerprint belongs on the projection row the reducer writes, not here. |

**Why reducer_version is on the ledger but null:** a forward declaration of
"which reducer is expected to apply" is forward-looking metadata that may
or may not match the reducer that actually runs. The reducer that runs
should write its actual version onto its own projection rows (alongside
`last_event_id_processed`). This column exists so that historical debugging
can ask "what reducer was live when this row arrived?" — useful — without
overloading the column to mean "what reducer derived state from this row,"
which is a question the projection answers.

**Backfill:** rows written before the versioning migration are marked
`ingestion_version = 'pre-versioning'` so they're distinguishable from
write-path bugs that drop the field.

---

## The temporary "polling bus" pattern

A consumer can scan the ledger by storing a `received_at` cursor and
repeatedly running:

```sql
SELECT * FROM stripe_event_ledger
WHERE received_at > $cursor
ORDER BY received_at, id
LIMIT $batch;
```

This works at small scale. **It is explicitly declared:**

- **temporary.** Until a real queue (Hatchet or equivalent) lands.
- **non-SLA.** No latency, throughput, or delivery guarantees.
- **non-scalable.** Replay amplification during consumer lag is the
  predictable failure mode — a stalled worker means everyone re-reads
  large append ranges, which becomes self-reinforcing load.
- **not exactly-once.** Consumers must be idempotent on `id` (or
  `(stripe_event_id, ingestion_version)` if cross-deploy idempotency
  matters).

**Cursor durability requirement:** the cursor MUST be advanced in the
same database transaction as the consumer's side effects (the projection
write, the metric increment, whichever). If the cursor lives in
app-process memory, a redeploy resets it and everyone re-replays from
t=0. The transactional outbox pattern — write the projection AND advance
the cursor in one BEGIN/COMMIT — is what turns at-least-once delivery
into bounded-replay-on-consumer-side.

**Replay window cap:** consumers SHOULD cap the replay window length
(e.g., refuse to scan more than 24h worth of events in one batch, alert
ops instead). This bounds the blast radius of a consumer that has been
offline too long and prevents single-handler thundering-herd recovery.

When a real queue lands, this pattern is removed — not just deprecated.
The ledger reverts to its core role as forensic substrate; live event
delivery flows through the queue.

---

## Reducer / projection guidance (when reducers exist)

Reducers MUST:

1. **Be deterministic.** Same input → same output, every time.
2. **Be idempotent.** Re-running the reducer over the same event slice
   must not change the projection beyond the first execution.
3. **Be order-independent within a window.** Webhook arrival order is not
   guaranteed to match world-event order. The merge function for any
   entity must produce the same final state regardless of whether
   webhook-A arrived before webhook-B or vice versa, AS LONG AS both are
   in the slice. (Strict ordering across slices is fine and expected.)
4. **Write their version onto projection rows.** Each projection row
   carries `reducer_version` and `last_event_ledger_id`. Re-deriving
   state under an updated reducer requires knowing which reducer wrote
   each existing projection row.
5. **Not write to the ledger.** Append-only is enforced by trigger.
   Reducer state lives in projection tables.

---

## Future expansion (not yet, but plan around)

- **Partitioning.** When row count crosses ~10M or VACUUM contention
  shows up in monitoring, partition by `received_at` month with
  `pg_partman`. The schema is partitioning-ready (no foreign keys
  referencing this table from elsewhere).
- **Cold storage.** Detached old partitions can be archived to S3 /
  Neon Branch. Cold rows remain replayable, just slower.
- **SELECT-only role.** Defense in depth against compromised app
  credentials. INSERT-only role for the webhook handler; SELECT-only
  role for read consumers. Today everyone is the same DB user.
- **Cross-source ledger.** If the Go execution plane decides to write
  its own `/v1/events/payment_exhaust` ingestion to the same ledger,
  add a `source` column (`'dashboard_webhook'`, `'go_ingest'`, etc.).
  Until that decision is made, the ledger is dashboard-webhook-only.

---

## Versioning

| Migration | Date | Change |
|---|---|---|
| `0011_raw_stripe_events.sql` | 2026-05-10 | Initial ledger schema. |
| `0012_ledger_append_only.sql` | 2026-05-10 | Append-only triggers + 5m operational view. |
| `0013_ledger_versioning.sql` | 2026-05-10 | `payload_schema_version`, `ingestion_version`, `reducer_version`. |
| `0014_ledger_verify_outcome_connect.sql` | 2026-05-10 | Added `'connect'` to the `verify_outcome` CHECK constraint so deliveries from the Connect endpoint are tagged distinctly from rotation-`fallback` deliveries. |

---

## verify_outcome slot semantics

The handler tries signing secrets in this order, stopping at the first success:

| Order | Outcome | Source env var | Purpose |
|---|---|---|---|
| 1 | `per_account` | `processor_connections.connection_metadata.webhook_secret` | Per-merchant secret set at OAuth time. Used only for events whose `event.account` matches a known connection with a stored secret. |
| 2 | `primary` | `STRIPE_WEBHOOK_SECRET` | Platform endpoint signing secret. Verifies all `connect: false` deliveries (PayFlux's own billing events). |
| 3 | `connect` | `STRIPE_CONNECT_WEBHOOK_SECRET` | Connect endpoint signing secret. Verifies all `connect: true` deliveries (events from connected merchants). |
| 4 | `fallback` | `STRIPE_WEBHOOK_SECRET_FALLBACK` | Transitional slot for rotation of any of the above. Set when rotating, drop when no `fallback` outcomes have been seen for ~3 days (Stripe's retry window). |

The slot ordering matters for two reasons:
- **Connect deliveries are tagged correctly** even when the platform secret is being rotated (which puts the old platform secret in `fallback`).
- **`per_account` wins over `primary`** because per-merchant secrets are the most specific match for events that have an `event.account` and a stored connection.
