# Synthetic Operational Exercise — 2026-05-15

**Status:** complete
**Type:** substrate-behavior validation (not real-merchant validation)
**Scope:** end-to-end exercise of `cmd/reducer` + `cmd/drift-detector` binaries against a clean local PostgreSQL with synthetic Stripe-like flow
**Result:** all 16 steps produced expected behavior; **three new operational findings** worth folding back into the runbook

---

## Why this exercise existed

The 24h Phase 1 detector gate proves *runtime stability* — the process stays alive, sweeps emit, telemetry parses. It does not prove that the full substrate (reducer + detector + reconciliation chain + replay determinism + governance pathology handling) actually behaves correctly under operational flow.

The integration harness (`internal/reducer/subscription/integration/scenarios_test.go`) proves *substrate mechanics* — merge function is order-independent, supersession is topology, append-only is enforced, drift detects and resolves. But those tests use a Go test runner; they do not exercise the *production binaries* (`cmd/reducer`, `cmd/drift-detector`) running as services.

This exercise fills the gap: real binaries, real Postgres, real lifecycle flow. It produced **substrate-behavior evidence**, the second of the three evidence classes named in the architectural review:

| Evidence class | What validates it |
|---|---|
| Runtime stability | 24h Phase 1 idle gate |
| **Substrate behavior** | **This exercise** |
| Institutional correctness | Real merchant onboarding |

Critically: the exercise ran on a clean local PostgreSQL, **not** production. Synthetic merchants in an append-only production ledger would live forever as permanent footnotes; we avoided that cost.

---

## Setup

- Local PostgreSQL 17, database `payflux_synthetic_v1`
- Migrations 0001–0021 applied (21 total; 0000* legacy compatibility shims skipped per harness convention)
- Binaries built from `main` HEAD: `/tmp/payflux-reducer`, `/tmp/payflux-drift-detector` (same source as the Fly-deployed detector)
- Synthetic merchant: `org_synthetic_v1` workspace, `cus_synthetic_v1` billing customer
- Two synthetic subscriptions:
  - `sub_synthetic_v1_lifecycle` — clean 6-event lifecycle
  - `sub_synthetic_v1_pathology` — single governance-pathology event

---

## Sequence executed + observations

### Steps 1–4: lifecycle injection + reducer backfill

Injected 6 events into `stripe_event_ledger`:

| stripe_event_id | type | event_occurred_at | status |
|---|---|---|---|
| `evt_synthetic_v1_001` | subscription.created | 2026-04-01 | trialing |
| `evt_synthetic_v1_002` | subscription.updated | 2026-04-15 | active |
| `evt_synthetic_v1_003` | subscription.updated | 2026-05-01 | past_due |
| `evt_synthetic_v1_004` | subscription.updated | 2026-05-05 | active (recovered) |
| `evt_synthetic_v1_005` | subscription.updated | 2026-05-10 | active (cancel_at_period_end=true) |
| `evt_synthetic_v1_006` | subscription.deleted | 2026-05-14 | canceled |

Reducer in `REDUCER_MODE=backfill`:

```
epoch b3781168  scanned=6  projected=6  conflicts=0  checksum=5718d8ff9138e8ff0f626cda2e2e484d
backfill complete in ~37ms
```

Projection chain formed with correct supersession topology — each row references the previous, head row = canceled.

**Result:** clean. Substrate accepts realistic lifecycle, builds correct chain, completes epoch with deterministic checksum.

### Step 5: matching canonical row → clean detector sweep

Inserted `billing_subscriptions` row matching the projection head (status=canceled). Ran `cmd/drift-detector` for ~12s with `DRIFT_DETECTOR_TICK_SECONDS=3`. SIGINT-terminated cleanly.

```
sweep complete  authority_count=1  detections_emitted=0  resolutions_emitted=0   (× 4 sweeps)
```

`subscription_reconciliation_events` count remained 0 — steady state, no false drift.

### Steps 6–7: drift induction + resolution chain

Mutated `billing_subscriptions.status` from `canceled` → `active`. Detector swept:

```
sweep complete  authority_count=1  detections_emitted=1  resolutions_emitted=0
```

Reconciliation event row:

| field | value |
|---|---|
| event_type | `drift_major` |
| severity | `critical` |
| reducer_state.status | `canceled` |
| canonical_state.status | `active` |

`subscription_drift_open` reported 1 open critical-severity drift.

Reverted the mutation. Next sweep:

```
sweep complete  authority_count=1  detections_emitted=0  resolutions_emitted=1
```

Resolution row written:

| field | value |
|---|---|
| event_type | `drift_resolved` |
| severity | `informational` |
| resolution_mechanism | `auto_provider_agreed` |
| resolves_id | → original detection |

`subscription_drift_open` returned 0. Chain forensically intact.

**Result:** the institutional claim "drift events are themselves reducible evidence" is observationally true.

### Step 8: latency view

`subscription_drift_resolution_latency`:

```
event_type=drift_major  severity=critical
  detection_count=1  resolution_count=1  unresolved=0
  median=26.525s  p95=26.525s  max=26.525s
```

Manual cross-check: detection at 02:08:08.072Z, resolution at 02:08:34.600Z. Delta ≈ 26.5s. Matches. Metric surface alive.

### Steps 9–11: idempotency + checksum self-consistency

Reset `reducer_cursors.cursor_received_at` to epoch 0. Re-ran reducer.

```
epoch 81649b73  scanned=6  projected=0  conflicts=6  checksum=d41d8cd98f00b204e9800998ecf8427e
```

Projection table count: 6, unchanged from before. Idempotency confirmed.

**Unexpected finding #1: replay surfaces every event as a `late_event_detected` conflict.** After epoch 1, the chain head has `event_occurred_at = 2026-05-14`. On replay, each of the 6 events has `event_occurred_at < 2026-05-14`, so the merge function emits `late_event_detected` and skips. The UNIQUE constraint (`stripe_subscription_id`, `source_event_id`, `reducer_version`) is never consulted because the projection insert never happens.

This is the substrate **correctly refusing** to supersede the chain with stale interpretations, even during a deliberate replay. But it produces conflict-row noise that an operator could misread as "the replay went wrong." Worth documenting.

**Checksum self-consistency:** re-ran the same md5 query the reducer uses at `completeEpoch` against epoch 1's projection rows. Result `5718d8ff9138e8ff0f626cda2e2e484d` — exact match to recorded value. Proves the checksum computation is deterministic over the same inputs.

**Not proven by this exercise:** cross-version replay determinism. That requires a v1.1 reducer producing v2 projections to compare against v1. The runbook calls this out as the first reducer-version-evolution exercise; it's a separate, deliberate test.

### Steps 12–15: governance pathology

Injected `evt_synthetic_v1_pathology_001` with `status="invalid_phantom_status"` (a value not in Stripe's subscription_status_enum). Also inserted a `billing_subscriptions` row with valid `status="active"` for the same subscription, so the detector would have something to compare against.

**Unexpected finding #2: the first pathology event was rejected by backfill.** Its `received_at` was set to `2026-05-16T12:00:00Z`, ~34h ahead of wall-clock. `REDUCER_MODE=backfill` uses `upperBound = process_start_time`, so the SQL filter `received_at <= upperBound` excluded it. Reducer reported `events_scanned=0`, `backfill complete`, but the event was untouched.

**The append-only ledger then prevented correction.** Trying to UPDATE the bad event's `received_at` was refused by the trigger. I had to insert a second event (`_002`) with a past `received_at` to actually exercise the pathology path. The future-dated `_001` event remains in the ledger forever; it will become processable when wall-clock crosses `2026-05-16T12:00:00Z` and will silently activate at that moment unless explicitly handled.

**This is a real time-bomb risk** that the runbook does not currently warn about. A malformed or maliciously-future-dated event in the ledger time-bombs into reducer processing when wall-clock catches up.

After the corrected `_002` injection, the reducer accepted the invalid status into the projection (`observe, don't editorialize`):

```
sub_synthetic_v1_pathology projection: status="invalid_phantom_status"
```

Detector then swept:

```
sweep complete  authority_count=2  detections_emitted=1  resolutions_emitted=0
```

Reconciliation row:

| field | value |
|---|---|
| event_type | `projection_impossible` |
| severity | `regulatory` |
| reducer_state.status | `"invalid_phantom_status"` |
| canonical_state.status | `"active"` |

**Result:** the substrate's regulatory-severity pathway works end-to-end. The reducer accepted Stripe's claim without editorializing (correct policy), the detector caught the impossibility via `ValidStripeStatuses` (correct guard), the reconciliation event carries both states for forensic review.

The substrate **surfaces epistemic ambiguity explicitly** rather than silently coercing or rejecting it. That is the institutional property the architecture claimed.

### Step 16: replay determinism after pathology

Final state of epochs:

```
b3781168  scanned=6  projected=6  conflicts=0  checksum=5718d8ff9138e8ff0f626cda2e2e484d
81649b73  scanned=6  projected=0  conflicts=6  checksum=d41d8cd98f00b204e9800998ecf8427e   (replay of clean lifecycle)
9113adec  scanned=0  projected=0  conflicts=0  checksum=d41d8cd98f00b204e9800998ecf8427e   (failed pathology backfill — future received_at)
94bca536  scanned=1  projected=1  conflicts=0  checksum=f01efc00dc394b2478ae89ceb7768b44   (successful pathology backfill)
```

Two epochs with zero projections produce identical checksums — md5 of the empty string. This is a useful operational signal: an "empty-set" projection_checksum means "this epoch processed nothing."

The two non-empty epochs produced different checksums because they contained different projection sets. No epoch ever needed to be retried; replay determinism (in the limited sense of "same input → same output") held.

---

## Final row counts

```
stripe_event_ledger:                  8
subscription_projection (total):      7
  lifecycle sub:                      6
  pathology sub:                      1
subscription_projection_conflicts:    6   (all late_event_detected from epoch 81649b73)
subscription_reconciliation_events:   3   (drift_major + drift_resolved for lifecycle, projection_impossible for pathology)
replay_epochs:                        4
```

---

## Three new findings to fold into the runbook

### Finding 1 — Replay produces conflict-row noise

On any deliberate replay (cursor reset → re-run reducer), the existing chain head's `event_occurred_at` is later than all incoming events, so the merge function emits a `late_event_detected` conflict for every event. This is **correct behavior** (the substrate refuses to supersede with stale interpretations) but produces visible noise that an operator could misread as a replay failure.

**Runbook addition:** when reading conflicts emitted during a replay epoch, the *expected* count is roughly equal to the number of events for affected subscriptions. A replay that emits zero `late_event_detected` conflicts is suspicious — it implies either no events were re-presented or the cursor wasn't actually reset.

### Finding 2 — Future-dated `received_at` time-bombs

A ledger event with `received_at` set to a future timestamp is invisible to backfill (filtered by the `upperBound` clause) but **silently activates** when wall-clock crosses the value. The append-only trigger prevents corrective UPDATE/DELETE.

**Runbook addition:** the on-ingest path must guarantee `received_at <= now()`. The webhook handler does this implicitly (`received_at = NOW()`), but the pattern should be enforced or at least watched. A future-dated event in the ledger is operationally a buried mine.

Possible enforcement: a CHECK constraint on `stripe_event_ledger.received_at <= now() + interval '5 minutes'` (the 5-minute slack absorbs clock skew between app servers and Postgres). This would also block legitimate ingest if any future-dated paths exist — worth auditing before adding.

### Finding 3 — Append-only correctly blocks correction even for *our own* mistakes

When my test harness injected a malformed event by mistake (the future-dated `_001`), there was no way to remove it from the ledger. The institutional property "the database refuses to lie about its history" was uncomfortable in this moment — but exactly correct. The cure was to inject a corrected event under a new id, not to mutate the bad one.

**Runbook addition:** operators should expect the append-only invariant to be uncomfortable during their own mistakes. The correct response is *always* a corrective insert, never a mutation. The institutional substrate's value lies in being uncomfortable in exactly this way.

---

## What this exercise did NOT prove

For honesty, the unscored questions:

- **Cross-version replay determinism.** Requires a v1.1 reducer evolution. Listed as the next deliberate exercise per the runbook.
- **Sustained operational load.** This exercise processed 8 events. Real merchant traffic will be orders of magnitude higher; sweep latency under realistic volume is unknown.
- **Stripe-API behavior change resilience.** Stripe occasionally adds/changes event fields. Our model is built around the current schema; the substrate's behavior under api_version drift is unproven.
- **Disaster recovery.** Backup → restore → re-derive projections from ledger has not been exercised. Listed as Phase 3 prerequisite.
- **Fly machine restart behavior.** The local exercise didn't exercise Fly's runtime supervision. The on-call escalation exercise on 2026-05-15 covered the controlled-restart path; the long-tail (host migration, region failover) remains unproven.

---

## Operational interpretation

The substrate's behavioral claims are now empirically grounded for the synthetic-flow class of evidence. The reducer + detector + reconciliation pipeline behaves correctly under:

- Realistic subscription lifecycle (6 events, 5 state transitions)
- Induced drift + resolution with chain integrity
- Idempotent replay with conflict-noise (Finding 1)
- Append-only enforcement during operator mistakes (Finding 3)
- Governance pathology with regulatory-severity classification

The substrate's claims that *do not yet have evidence* are also explicit: cross-version replay, sustained load, disaster recovery, Fly runtime resilience.

This is "substrate ready, operations still soft" — exactly the position the strategic frame predicted, with the soft spots now named individually.

---

## Versioning

| Date | Version | Change |
|---|---|---|
| 2026-05-15 | v1 | Initial exercise + findings. |
