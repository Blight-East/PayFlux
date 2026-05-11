# Subscription Reducer Contract

**Status:** active (projection-only mode)
**Reducer version:** v1
**Last reviewed:** 2026-05-10

This document is the canonical contract for the subscription reducer and the
projection it writes. Read this before writing any code that interacts with
`subscription_projection`, `subscription_projection_conflicts`, or
`subscription_reconciliation_events`.

---

## Operational mode

**Projection-only.** The reducer writes `subscription_projection` rows. Nothing
else changes:

- `billing_subscriptions` remains the canonical write path for the dashboard.
- The dashboard's Stripe webhook handler still updates `billing_subscriptions`
  directly via the existing CRUD logic.
- Production reads continue to use `billing_subscriptions` (or its existing
  read surfaces).
- Zero writes have been removed.

The reducer accumulates a parallel interpretation. The drift-detection job
(future PR) compares the two surfaces and emits `subscription_reconciliation_events`
rows. After at least 30 days of green drift metrics, a separate decision (and
PR) can promote the reducer to shadow-write or cutover mode.

This contract describes projection-only mode. Other modes require this document
to be updated before any production change.

---

## What the projection IS

- An immutable, append-only sequence of interpretations the reducer produced
  about a subscription over time.
- A replay substrate: given the same ledger event range and the same reducer
  version, the same projection rows must be reproducible.
- A provenance record: every row carries enough metadata to answer "which
  event, which reducer version, which epoch produced this interpretation."

## What the projection IS NOT

- **NOT canonical state.** During projection-only mode, the canonical answer to
  "what is this subscription's current status?" comes from `billing_subscriptions`,
  not from the projection. The projection accumulates evidence; the canonical
  table serves traffic.
- **NOT mutable.** Once written, a projection row never changes. State evolution
  is captured by appending a new row that references the prior via `supersedes_id`.
  "Current state" is the row with no successor, derived from the graph, not
  from a mutable marker.
- **NOT a place to record drift, conflicts, or reconciliation outcomes.** Those
  go to `subscription_projection_conflicts` and `subscription_reconciliation_events`.
  Mixing categories would pollute the projection chain.

---

## Append-only enforcement

Triggers on `subscription_projection`, `subscription_projection_conflicts`,
and `subscription_reconciliation_events` raise `feature_not_supported` on
UPDATE, DELETE, and TRUNCATE.

`replay_epochs` is a special case: it is mutable WHILE running (so
`events_processed` can increment as the run progresses) and immutable after
`completed_at` or `aborted_at` is set. Enforced by a trigger that compares
OLD to NEW.

`reducer_cursors` is intentionally mutable. The cursor advances are the whole
point. Institutional integrity is preserved at the layer above: every projection
row carries the `source_event_id` it derived from and the `replay_epoch_id`
under which the derivation ran.

---

## Supersession semantics

Each projection row optionally references a prior row via `supersedes_id`.
**No row ever updates a prior row.** The chain forms a graph; the current
interpretation is the row with no successor:

```sql
SELECT p.*
FROM subscription_projection p
WHERE NOT EXISTS (
    SELECT 1 FROM subscription_projection newer
    WHERE newer.supersedes_id = p.id
);
```

This is exposed as `subscription_current_state` — a semantic contract, not
a serving strategy. Today it's a regular view; future workload may promote
it to a materialized view, projection cache, or read replica. The name and
shape are stable; the physical implementation evolves.

---

## Field-level authority arbitration

The reducer's merge function is not a state merge. It is a **per-attribute
arbitration engine**. Each interpreted field carries an authority tag in the
`field_authority` jsonb column, indicating which source determined the value.

### Authority policy v1 (projection-only mode)

| Field | Authority | Rationale |
|---|---|---|
| `status` | webhook | The reducer derives status from Stripe-emitted events. When the polling reconciliation worker exists, this becomes "polling supersedes webhook" — Stripe's API at-rest is authoritative for current status. |
| `current_period_start` | webhook | Stripe-emitted; rarely contested. |
| `current_period_end` | webhook | Stripe-emitted; rarely contested. |
| `cancel_at_period_end` | webhook | Stripe-emitted; rarely contested. |
| `canceled_at` | webhook | Webhook is authoritative for transition timing (Stripe's API at-rest gives the value but not the timing). |
| `trial_start` | webhook | Stripe-emitted; rarely contested. |
| `trial_end` | webhook | Webhook is authoritative for transition timing. |

The policy is stored both in code (`internal/reducer/subscription/authority.go`)
and copied here for review. If the policy changes, both must change, and the
change must be documented in the version history table at the bottom of this
document.

### Per-attribute, not per-entity

This is intentional. Different attributes have different authority profiles
even within the same entity. `status` and `transition_history` for the same
subscription are answered by different authoritative sources. Bundling
authority into a single entity-level column would force the merge function
to make wrong tradeoffs.

---

## Merge function semantics (reducer v1)

Given:
- `current`: the current projection state for a subscription (may be nil if
  no prior projection exists)
- `event`: a verified Stripe event from `stripe_event_ledger`

The merge function:

1. **Extracts ordering metadata from the event.** Uses `event.created` as the
   logical timestamp. If `event.created` is missing or invalid, emits an
   `ordering_metadata_missing` conflict and does not produce a projection.
2. **Detects late events.** If `event.created < current.event_occurred_at`,
   emits a `late_event_detected` conflict and does NOT supersede the current
   projection. A subsequent replay epoch may rebuild the chain.
3. **Detects chronology conflicts.** If `event.created == current.event_occurred_at`,
   emits a `chronology_conflict` conflict and does NOT supersede.
4. **Applies per-field authority rules.** For each interpreted field, looks up
   the authority policy. If the policy says "webhook" and the event source is
   a webhook, applies the event's value. Otherwise keeps the current value.
5. **Detects merge invariant violations.** Examples: `status` transitioning
   from a terminal state (`canceled`) back to an active state without an
   explicit reactivation event. Emits a `merge_invariant_violation` conflict.
   The reducer's policy is **observe, don't editorialize** — Stripe's state
   machine is treated as authoritative, but invariant violations are recorded
   for review.
6. **Writes a new projection row** with `supersedes_id = current.id` (or
   NULL if no prior projection).

The merge function is **deterministic** and **order-independent** in the
following sense: given the same set of events for a subscription, the final
non-superseded projection is identical regardless of the order in which the
reducer encounters them, as long as each event carries valid ordering metadata.

---

## Reducer Acceptance Contract (RAC)

No reducer ships without passing the RAC test harness. Tests cover:

- **Permutation invariance.** The same event set fed in 10 random orders
  produces the same final non-superseded state.
- **Idempotency.** Applying the same event twice produces the same state as
  applying it once.
- **Determinism.** Running the full reducer twice over the same input produces
  byte-identical projection chains (modulo timestamps).
- **Partial replay.** Processing events 1..N then 1..M (M > N) produces the
  same final state as processing 1..M directly.
- **Future-version compatibility (placeholder).** When reducer v2 exists, its
  output over the v1 event set must either be identical to v1's output or
  differ in ways explained by a documented logic-change migration.

The RAC harness lives at `payment-node/internal/reducer/rac/`. The subscription
reducer's RAC tests live at `payment-node/internal/reducer/subscription/reducer_test.go`.

---

## Replay epochs

Every projection row references the epoch under which it was written. An
epoch is a single replay run with a specific reducer version. Epochs are
mutable while running (so `events_processed`, `projections_written`, etc.
can increment) and immutable after `completed_at` or `aborted_at` is set.

The epoch's `projection_checksum` is a deterministic hash over all projection
rows produced. Two epochs with the same reducer version and same input range
must produce identical checksums. Across reducer versions, identical checksums
indicate "this logic change had no effect on these inputs" — useful for
verifying refactors didn't change behavior.

Epoch lifecycle:

1. **Start.** A new row is inserted with `started_at = now()`, terminal
   timestamps null, counters at zero.
2. **Tail or backfill.** The reducer processes events, advancing the cursor
   and incrementing counters. The cursor advance and projection insert
   happen in the same transaction.
3. **Complete or abort.** When the epoch finishes its scope (e.g., reaches
   the current `received_at`), the reducer sets `completed_at` and the
   final checksum. If something went wrong, sets `aborted_at` and
   `abort_reason` instead. After either, the row is immutable.

---

## Operational mode transitions

| Mode | What it means | Requires |
|---|---|---|
| Projection-only (current) | Reducer writes projections. Canonical table unchanged. | This contract. |
| Shadow-write | Reducer writes projections AND drift detector runs continuously. Canonical table still serves traffic. | Drift detector deployed. ≥30 days of projection-only data. |
| Canonical cutover | Reducer is the only writer for this entity. CRUD writer is REMOVED (not disabled). | ≥30 days of green drift metrics in shadow-write mode. Recovery proofs (backup restore, replay determinism, projection rebuild from ledger). Explicit decision documented in this file. |

**Cutover is not a code flag.** It's the removal of the old write path.
Removable code makes the commitment irreversible-by-design.

---

## Drift detector (Phase 1: billing provider)

The drift detector runs as a separate Fly service (`payflux-drift-detector`)
on a periodic tick. Each sweep:

1. Fetches all subscriptions known to the **authority provider**. Phase 1
   provider: `billing_subscriptions` table. Phase 2 (post-polling-worker):
   Stripe's API directly.
2. For each subscription, loads the current projection from
   `subscription_current_state`.
3. Compares per-field using `TimestampTolerance` for clock-skew leniency.
4. Decides outcome:
   - **Agreement and no open drift**: silent steady state.
   - **Agreement after prior drift**: emits a `drift_resolved` row referencing
     the open detection via `resolves_id`, with
     `resolution_mechanism = auto_provider_agreed`.
   - **Disagreement and no open drift**: emits a new detection row tagged with
     event_type (drift_minor / drift_major / projection_impossible) and
     severity (informational / warning / critical / regulatory).
   - **Disagreement with open drift already**: no row — drift remains open.

The detector NEVER corrects either side. The row IS the signal.

### Authority Provider Interface

```go
type Provider interface {
    Name() string
    Version() string
    FetchState(ctx, stripeSubscriptionID) (*State, error)
    FetchAll(ctx) ([]*State, error)
}
```

Phase 2 (Stripe polling provider) implements this same interface. Detector
code is unchanged across the transition.

### Severity policy

Severity is orthogonal to event_type. The detector picks the worst severity
across all disagreeing fields:

| Field | Severity on disagreement |
|---|---|
| `status` | critical |
| `cancel_at_period_end` | critical |
| `current_period_start` / `current_period_end` / `canceled_at` | warning |
| `trial_start` / `trial_end` | warning |
| Projection holds invalid Stripe status | regulatory |

### Resolution chain

Drift events are themselves reducible evidence. The chain is:

```
detection row  (event_type=drift_major, resolves_id=NULL)
    ↑
    └── resolution row (event_type=drift_resolved, resolves_id=detection.id,
                        resolution_mechanism=auto_provider_agreed)
```

Currentness of drift is derived from graph topology: a drift is "open" if no
row with `resolves_id` pointing at it exists. Same pattern as the projection
chain — no mutable markers.

### Drift resolution latency view

`subscription_drift_resolution_latency` reports, by hour / event_type /
severity:

- `detection_count` — how many new drifts were detected
- `resolution_count` — how many of those have been resolved
- `unresolved_count` — open drifts that have not yet been resolved
- `median_resolution_seconds` / `p95_resolution_seconds` / `max_resolution_seconds`

This is the metric surface for "drift half-life" as the operational concept.
The view is a stable semantic contract; promote to MATERIALIZED VIEW with
scheduled REFRESH if volume warrants.

`subscription_drift_open` is a companion view that returns currently-
unresolved drifts grouped by severity and event_type — for alerting on
drift that survives longer than expected.

## Versioning

| Date | reducer_version | projection_version | Change |
|---|---|---|---|
| 2026-05-10 | `v1` | `v1` | Initial reducer (projection-only mode). Field authority policy v1: all fields = webhook. |
| 2026-05-11 | `v1` | `v1` | Drift detector (Phase 1: billing provider) + reconciliation event severity + resolution chain (migrations 0020-0021). Reducer unchanged. |
