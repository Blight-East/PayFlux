# PayFlux Substrate Validation Runbook

**Status:** active
**Audience:** PayFlux operators, on-call engineers, future reviewers
**Companion docs:** `apps/dashboard/src/lib/db/LEDGER_CONTRACT.md`, `apps/dashboard/src/lib/db/SUBSCRIPTION_REDUCER_CONTRACT.md`

---

## What this runbook is

This is the operational playbook for moving the PayFlux substrate from
**built but unproven** to **operationally validated**. It is NOT a feature
plan. The next 30+ days are institutional validation, not capability
expansion.

The runbook covers three phases. Each phase has explicit entry criteria,
expected telemetry, rollback conditions, and exit criteria. **Do not
advance to a later phase without satisfying the gates.**

| Phase | Goal | Duration |
|---|---|---|
| 1. Detector-first | Prove the observability substrate behaves correctly with no derived state | 1-2 days |
| 2. Reducer (projection-only) | Begin evidence accumulation. Reducer writes; nothing trusts it. | Days 3-32+ |
| 3. Evidence evaluation | Decide whether the substrate has earned canonical cutover | After day 32 |

A separate cutover decision document (NOT this runbook) governs Phase 3's
output. Cutover is an architectural commitment, not an operational rollout.

---

## Vocabulary

- **CRUD writer** — the dashboard's existing `upsertSubscriptionFromStripe`
  in `apps/dashboard/src/lib/db/billing.ts`. Today: canonical. Removed
  only after Phase 3 evaluation completes and cutover is approved.
- **Reducer** — `cmd/reducer/main.go`. Today: projection-only. Writes
  `subscription_projection`. Reads from `stripe_event_ledger`. Never
  modifies `billing_subscriptions`.
- **Detector** — `cmd/drift-detector/main.go`. Today: compares projection
  against `billing_subscriptions` (Phase 1 authority provider). Writes
  `subscription_reconciliation_events`. Never corrects either side.
- **Projection** — a row in `subscription_projection`. Immutable.
  Superseded by a later projection via `supersedes_id`.
- **Drift** — a difference between the reducer's projection and the
  authority provider's state.
- **Resolution chain** — a `subscription_reconciliation_events` row
  with `resolves_id` pointing at an earlier detection row.
- **Evidence accumulation** — the act of running the reducer in
  projection-only mode while measuring agreement/disagreement against
  the canonical writer over time. NOT the same as event sourcing.

---

## Critical invariants — must hold at all times

These are NOT goals. They are properties the substrate enforces and that
the runbook's procedures must respect.

1. **Append-only.** `subscription_projection`, `stripe_event_ledger`,
   `subscription_projection_conflicts`, `subscription_reconciliation_events`
   refuse UPDATE, DELETE, TRUNCATE at the database trigger layer. Code
   that tries to mutate them fails by design.
2. **Supersession is topology.** "Current projection" is the row that
   no later row points at via `supersedes_id`. There are no mutable
   "is_current" flags.
3. **Resolution is a new row.** Resolving a drift means inserting a
   row with `resolves_id` set, NOT updating the original detection.
4. **Mutual blindness.** The reducer code does not import billing-CRUD
   write paths. The dashboard code does not import projection internals.
   The drift detector is the ONE third-party comparer. Enforced by
   `scripts/check-mutual-blindness.sh` in CI.
5. **Provenance is mandatory.** Every projection row carries
   `reducer_version`, `projection_version`, `source_event_id`,
   `source_ingestion_version`, `replay_epoch_id`, `event_occurred_at`.

If you find yourself wanting to bend one of these, **stop**. Open an
architecture discussion. These exist because they were earned through
specific architectural decisions documented in the contract files.

---

## Phase 1 — Detector-first deployment

### Entry criteria

- Migrations 0015-0021 applied to production (verify via
  `node apps/dashboard/scripts/db-preflight.mjs`).
- `payflux-drift-detector` Fly app does not yet exist.
- Substrate integration tests pass in CI on `main`.
- Fly account billing current.

### Procedure

```bash
# 1. Create the Fly app (does not deploy yet).
fly apps create payflux-drift-detector --org personal

# 2. Set required secrets. DIRECT_URL bypasses the pooler — the detector
#    does read-heavy comparisons and benefits from a predictable read
#    snapshot.
fly secrets set \
  DIRECT_URL="<your direct URL>" \
  PAYFLUX_GIT_SHA="$(git rev-parse HEAD)" \
  --app payflux-drift-detector

# 3. Deploy.
fly deploy --config fly.drift-detector.toml --app payflux-drift-detector

# 4. Watch the first 5-10 sweeps. Expected: zero projections exist, so
#    the detector logs "sweep complete authority_count=N detections_emitted=0
#    resolutions_emitted=0" for whatever N billing_subscriptions rows
#    exist.
fly logs --app payflux-drift-detector | grep "sweep complete"
```

### Expected telemetry (Phase 1)

```
INFO sweep complete  authority_count=<N>  detections_emitted=0  resolutions_emitted=0
```

`authority_count` should equal `SELECT count(*) FROM billing_subscriptions`.
Zero detections and zero resolutions are correct because no projection
rows exist yet.

### Failure modes

| Symptom | Cause | Action |
|---|---|---|
| `provider FetchAll: ...` errors | DB connection failed / `DIRECT_URL` unset | Verify secret, redeploy |
| `authority_count=0` when subscriptions exist | Connection routed to wrong DB | Verify `DIRECT_URL` points at production |
| `detections_emitted > 0` | Reducer has already run somehow | Halt — investigate which projections exist |
| Sweep takes >10s | DB under load / index missing | Check `pg_stat_activity`, escalate |

### Exit criteria (advance to Phase 2)

- At least 24h of clean Phase 1 operation (no errors, expected counts).
- Telemetry verified to be parseable by ops tooling.
- On-call escalation path tested (induce a deliberate error, verify
  alerting fires, then revert).

### Rollback

```bash
fly scale count 0 --app payflux-drift-detector
```

The detector is read-only. Stopping it has no data effect — no rows are
removed. Safe to scale down at any time.

**Important semantics observed in the 2026-05-15 on-call exercise:**

- `fly scale count 0` **destroys both the primary and the standby
  machine**, not just stops them. It is the "tear down the deployment"
  command, not the "pause" command. To pause a single machine without
  destroying the deployment, use `fly machine stop <id>` instead.
- After scale-to-zero, `fly scale count 1` creates a fresh machine
  with a new id (not the original). The standby is NOT restored by
  `fly scale count N` for N ≥ 1 — `scale count` creates `N` *active*
  machines, all of which would sweep in parallel (see "Duplicate sweep
  race" below). To restore the original 1-primary-plus-1-standby
  topology, run `fly deploy --config fly.drift-detector.toml` again,
  which re-executes the launch logic that originally created the
  standby.
- **Recovery time from `scale count 0` → `scale count 1` → first new
  sweep observed: ~60–70 seconds**. The detector's read-only nature
  means events that would have been observed during the gap can be
  caught on the next sweep without data loss.
- **Duplicate-sweep race:** two or more active detector machines
  (i.e., `scale count ≥ 2` after scale-to-zero recreation) will both
  read the same `billing_subscriptions` and `subscription_projection`
  data on overlapping sweeps. Each calls `findOpenDrift` independently;
  in the window between that lookup and `emitDetection`, two machines
  can race to insert duplicate detection rows for the same drift.
  Mitigation today is single-machine operation; the same class of
  defense — `pg_advisory_lock` keyed on the detector name — is the
  proper fix and is listed as a follow-up to the audit's reducer item
  #6 (advisory lock).

### On-call escalation exercise — 2026-05-15 (executed)

Pre-exercise: 32 clean sweeps over 31 minutes, machine
`6e82025eb46178` (primary) + `148ee332f49448` (standby).

Procedure:

1. `fly scale count 0 --app payflux-drift-detector --process-group drift-detector --yes`
   → both machines destroyed.
2. 30-second observation window — no further sweeps appear in logs.
3. `fly scale count 1 --app payflux-drift-detector --process-group drift-detector --yes`
   → new machine `3d8d04d7c5e348` created.
4. First post-restart sweep at +66s from step 1.
5. Outcome shape across the transition: unchanged
   (`authority_count=2 detections_emitted=0 resolutions_emitted=0`).

Findings encoded in this runbook above. On-call escalation exit
criterion satisfied.

---

## Phase 2 — Reducer deployment (projection-only mode)

### Entry criteria

- Phase 1 exit criteria satisfied.
- Detector running cleanly for ≥24h.
- `payflux-reducer` Fly app does not yet exist.
- `billing_subscriptions` is being written by the dashboard's CRUD path
  in production (verify by recent `updated_at` timestamps).

### Procedure

```bash
# 1. Create the Fly app.
fly apps create payflux-reducer --org personal

# 2. Set required secrets.
fly secrets set \
  DIRECT_URL="<your direct URL>" \
  REDUCER_MODE="backfill" \
  PAYFLUX_GIT_SHA="$(git rev-parse HEAD)" \
  --app payflux-reducer

# 3. Deploy in BACKFILL mode first. The reducer scans the entire ledger
#    range from t=0 onward, building projections for every subscription
#    event in history. Backfill terminates when the cursor catches up
#    to "now" at the time backfill started.
fly deploy --config fly.reducer.toml --app payflux-reducer

# 4. Watch backfill progress.
fly logs --app payflux-reducer | grep -E "(epoch|batch processed|reducer exited)"

# 5. When backfill completes, restart in TAIL mode.
fly secrets set REDUCER_MODE="tail" --app payflux-reducer
fly deploy --config fly.reducer.toml --app payflux-reducer
```

### Expected telemetry (Phase 2 backfill)

```
INFO reducer starting  reducer=subscription  version=v1  mode=backfill
INFO epoch started     epoch=<uuid>
INFO cursor loaded     cursor_received_at=<timestamp>
INFO batch processed   processed=<n>  cursor_at=<timestamp>
... (many batches)
INFO backfill complete
INFO reducer exited cleanly
```

After backfill, in tail mode, the same logs but `mode=tail` and no
`backfill complete` line (the loop runs until canceled).

Simultaneously the detector's logs change:

```
INFO sweep complete  authority_count=<N>  detections_emitted=<N1>  resolutions_emitted=<N2>
```

`detections_emitted > 0` is **expected** during backfill — the reducer
and the CRUD writer have been operating independently for some time
and may have produced different states. `resolutions_emitted` will
follow as backfill catches up and the two sides converge.

### What to watch in the first 72 hours

Query the operational views frequently:

```sql
-- How many drifts are currently open, by severity?
SELECT * FROM subscription_drift_open;

-- Drift resolution latency distribution over the last 24h.
SELECT * FROM subscription_drift_resolution_latency
WHERE hour_bucket > now() - interval '24 hours'
ORDER BY hour_bucket DESC;

-- Replay epoch progress.
SELECT id, reducer_version, started_at, completed_at,
       events_processed, projections_written, conflicts_emitted
FROM replay_epochs
WHERE reducer_name = 'subscription'
ORDER BY started_at DESC LIMIT 10;

-- Are projections accumulating?
SELECT count(*) AS projections,
       count(DISTINCT stripe_subscription_id) AS distinct_subscriptions
FROM subscription_projection;
```

### Drift severity interpretation

| Severity | Operational meaning | Action |
|---|---|---|
| `informational` | Clock skew or near-equivalent timestamps | Observe |
| `warning` | Period or trial timestamps disagree beyond tolerance | Investigate within 1 business day |
| `critical` | Status or `cancel_at_period_end` disagrees | Page on-call. Reducer or CRUD writer has a bug. |
| `regulatory` | Projection holds an invalid Stripe status (`projection_impossible`) | **Halt the reducer.** This is a substrate error, not a drift. |

### Failure modes

| Symptom | Cause | Action |
|---|---|---|
| Reducer exits during backfill with error | Schema constraint violated mid-projection | Read epoch's `abort_reason`. Likely a bug in merge logic or fixture event. |
| `regulatory` severity event emitted | Reducer wrote an invalid status to projection | **STOP REDUCER.** Inspect the bad projection row; replay decision required. |
| Drift open count rises and never falls | Reducer is failing to catch up, OR CRUD writer is diverging | Check replay epoch counters; check `billing_subscriptions.updated_at` distribution |
| `events_processed` not advancing | Cursor stuck — DB issue or replay loop | Check `pg_stat_activity` and reducer logs for transaction errors |

### Exit criteria (begin Phase 3)

- 30+ days continuous reducer operation in `tail` mode.
- `subscription_drift_open` returns 0 critical/regulatory rows for the
  last 7 consecutive days.
- `subscription_drift_resolution_latency` shows `p95_resolution_seconds`
  bounded (typically <300s for tail-mode drift).
- Backup/restore drill executed (see "Disaster recovery" below).
- At least one reducer-version evolution exercised (see "Reducer governance").

### Rollback

```bash
# Stop the reducer. No data is removed — projections accumulated remain
# in place, in case we resume later. The drift detector continues
# running and reports projections as stale relative to billing.
fly scale count 0 --app payflux-reducer
```

If the substrate is corrupted by a reducer bug, the **only** corrective
action is to start a new replay epoch with a fixed reducer version. Old
projections are NOT deleted — they remain as historical evidence of
what the buggy reducer thought. The append-only contract is what makes
the substrate institutionally defensible; do not break it under pressure.

---

## Phase 3 — Evidence evaluation

### Entry criteria

- Phase 2 exit criteria satisfied.
- ≥30 days of operational data accumulated.
- All five cutover criteria below are evaluated against this evidence.

### Cutover criteria (must be ALL satisfied)

The CRUD writer is **not removed** until every one of these is true:

1. **≥30 days of green drift metrics.** No `critical` or `regulatory`
   drift events outstanding for ≥7 consecutive days.
2. **Replay determinism proven on production data.** Run the reducer in
   a parallel backfill epoch over the same ledger range. Compare
   `projection_checksum` across epochs. Identical or explainable
   difference.
3. **At least one reducer-version evolution completed.** Reducer v2 has
   been written, deployed, and replayed alongside v1 on real data. The
   cross-version replay comparison either showed identical results or
   produced an approved migration policy document.
4. **Rollback rehearsal executed.** The team has practiced reverting a
   bad cutover (re-introducing the CRUD writer, removing reducer reads)
   on a staging environment.
5. **Operator intervention patterns understood.** The team can name the
   typical drift causes, expected resolution times, and which signals
   warrant paging. Demonstrated by an incident postmortem or a
   tabletop exercise.

### Explicit approval gate

Removal of `upsertSubscriptionFromStripe` from
`apps/dashboard/src/lib/db/billing.ts` requires:

- A PR whose description references each criterion above with evidence
  links (query results, dashboard screenshots, postmortem docs).
- Approval from at least two reviewers outside the PR author.
- A scheduled deployment window with rollback steps documented.

The read-path flip (pointing dashboard reads at the projection table)
is **operational** and can be staged behind a feature flag. The CRUD
writer removal is **architectural** — it makes the projection chain
canonical, irreversibly.

### Do NOT cut over if

- Drift open count is non-zero at critical severity, even momentarily.
- Replay determinism test produces unexplained divergence.
- The team can't articulate what each drift severity means
  operationally.
- No reducer-version evolution has ever been exercised.
- Backup/restore has not been drilled.
- The reducer has not handled at least one Stripe API behavior change
  organically (api_version bump, new event field, etc.).

---

## Disaster recovery prerequisites

Before Phase 3:

1. **Point-in-time recovery verified.** Neon retains 7-30 days of PITR
   depending on plan. Restore a known historical point to a Neon branch,
   confirm:
   - Schema is intact (`db-preflight.mjs` passes).
   - Append-only triggers fire on the restored DB.
   - Application code can connect and read.

2. **Replay rebuild verified.** From a fresh DB with only the ledger
   restored, run the reducer in `REDUCER_MODE=backfill`. Confirm the
   projection chain rebuilds to a state matching the pre-disaster
   projection (modulo wall-clock timestamps).

3. **Cursor recovery verified.** If `reducer_cursors` is corrupted or
   reset, the reducer can re-derive its position from the ledger and
   resume. UNIQUE constraint on (subscription, source_event_id,
   reducer_version) prevents duplicate projections.

---

## Replay certification procedure

When a reducer version evolves:

1. The new reducer (v2) is built and passes all RAC tests on synthetic
   fixtures.
2. A parallel replay epoch is started against production data while v1
   continues to write canonical projections. v2 writes to a separate
   projection table (`subscription_projection_v2_replay`) — NOT to the
   canonical table.
3. After v2's epoch completes, compare:
   - Row count parity (`v1` projections vs `v2_replay` projections for
     the same subscriptions in the same epoch range).
   - Projection checksum parity.
   - Per-subscription state divergence.
4. Three outcomes are valid:
   - **Identical**: v2 is a refactor with no semantic change. Promote
     v2 to canonical via a separate cutover.
   - **Explained divergence**: v2 made an intentional logic change. The
     migration policy document specifies which subscriptions diverge,
     why, and how downstream consumers should reconcile.
   - **Unexplained divergence**: v2 has a bug. Do not promote. Revert
     to v1 design.

The replay certification is a **governance artifact**, not a debugging
session. The output is a signed document — possibly a regulatory
artifact later.

---

## Replay divergence review procedure

When the cross-version replay shows divergence:

1. Identify the field(s) that differ. Use the
   `subscription_drift_resolution_latency` and direct projection queries
   to find affected subscriptions.
2. For each differing field, document:
   - The change in reducer logic between versions.
   - The set of subscriptions affected.
   - The expected operational impact (which dashboard reads change?
     which billing decisions hang on this field?).
3. Decide:
   - **Backfill new state into v1's chain** (write a v1.x patch reducer
     that produces v2's interpretation under v1's version tag).
   - **Migrate downstream consumers** (update dashboard reads to
     handle both interpretations).
   - **Reject the change** (revert v2 design).
4. The decision must be approved by the same gating reviewers as
   cutover (see "Explicit approval gate").

---

## Operator escalation paths

| Signal | Where it surfaces | Owner |
|---|---|---|
| `regulatory` severity drift event | `subscription_drift_open` view | On-call engineer — page |
| Reducer epoch aborted | `replay_epochs.aborted_at IS NOT NULL` | On-call engineer — investigate within 1h |
| Reducer cursor stuck (no heartbeat in 5min) | `reducer_cursors.last_heartbeat_at` | On-call engineer — investigate within 1h |
| Detector sweep failure | Fly log error rate | On-call engineer — investigate within 4h |
| `critical` drift open >2h | `subscription_drift_open` view | Send alert; investigate within 24h |
| `warning` drift open >24h | `subscription_drift_open` view | Note in weekly review |

---

## Operational nuances surfaced by the synthetic exercise (2026-05-15)

Three findings from the synthetic operational exercise documented in
`docs/SYNTHETIC_OPERATIONAL_EXERCISE_2026-05-15.md`. Each affects how an
on-call operator should interpret normal substrate behavior.

### Replay produces conflict-row noise (by design)

When the reducer cursor is reset and replay runs over already-projected
events, each event will emit a `late_event_detected` conflict because
the existing chain head's `event_occurred_at` is later than every
re-presented event. This is the substrate **correctly refusing** to
supersede a chain with stale interpretations.

A replay that emits *zero* conflicts is suspicious — it means either
the cursor wasn't actually reset or no events were re-presented.

Expected conflict count for a deliberate cursor-reset replay ≈ number
of subscription events for subscriptions that already have projections.

### Future-dated `received_at` time-bombs

A `stripe_event_ledger` row with `received_at > now()` is invisible to
`REDUCER_MODE=backfill` (filtered by the `upperBound` clause) but will
**silently activate** when wall-clock crosses the value. The append-only
trigger prevents corrective `UPDATE` or `DELETE`.

The webhook handler sets `received_at = NOW()` implicitly so this is
not a current production risk. But operators directly inserting into
`stripe_event_ledger` (for testing, replay, or backfill from external
sources) must guarantee `received_at <= now()`. A future-dated event
in the ledger is operationally a buried mine.

### Append-only enforcement is uncomfortable during operator mistakes

When an operator injects a malformed event by mistake, there is no
mutation path to undo it. The institutional property "the database
refuses to lie about its history" is uncomfortable in this exact
moment — and exactly correct.

The cure is **always** a corrective insert, never a mutation. If a
"bad" projection or ledger row exists, the response is:

- For ledger: insert a corrected event under a new `stripe_event_id`.
  The bad one stays as evidence of what was once received.
- For projection: the next reducer run will supersede via the
  `supersedes_id` chain. The bad projection stays as evidence of
  what was once interpreted. Never `UPDATE` or `DELETE`.

Operators should expect to feel the append-only invariant most acutely
during their own mistakes. That discomfort is the substrate working
correctly.

---

## Reconciliation interpretation guidance

When you see drift, ask in order:

1. **Is the reducer wrong?** Check the reducer's interpretation of the
   ledger events for the affected subscription. Look at the projection
   chain and the events that produced each link.
2. **Is the CRUD writer wrong?** Check the dashboard's webhook handler
   logs for the affected subscription. Did it skip an event? Apply a
   stale state?
3. **Are both right but disagreeing because Stripe sent contradictory
   information?** Pull the Stripe Dashboard event log for the
   subscription. Sometimes Stripe issues clarifying events.
4. **Is the drift transient?** Wait one sweep. If it auto-resolves,
   it was lag.

Resolution is NOT an action you take in the database. Resolution is
either:
- **Automatic** — the detector emits a `drift_resolved` row when it
  next observes agreement.
- **Manual** — an operator emits a `manual_reconciliation` event row
  via a controlled tool (NOT raw SQL).

Direct SQL UPDATE on either side is forbidden in normal operation.

---

## Versioning

| Date | Version | Change |
|---|---|---|
| 2026-05-11 | v1 | Initial runbook. Covers Phase 1-3 with cutover gates. |
| 2026-05-15 | v1.1 | Phase 1 rollback semantics clarified — `fly scale count 0` destroys (not pauses), standby is not restored by `fly scale count N`, and `scale count ≥ 2` introduces a duplicate-sweep race. On-call escalation exercise executed and recorded; exit criterion satisfied. |
| 2026-05-15 | v1.2 | Three findings from the synthetic operational exercise folded in: replay produces expected conflict-row noise, future-dated `received_at` time-bombs, append-only enforcement is uncomfortable during operator mistakes (by design). Full exercise documented separately in `SYNTHETIC_OPERATIONAL_EXERCISE_2026-05-15.md`. |
