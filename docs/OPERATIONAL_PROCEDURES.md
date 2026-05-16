# PayFlux Operational Procedures

**Status:** active
**Scope:** procedures that have been executed against production or a
production-equivalent substrate at least once. Each section is captured
operational truth — what actually happened, with the exact commands that
worked and the caveats discovered in real execution.

This file is NOT speculative process fiction. Procedures appear here
only after they have been exercised. New procedures are added with the
date they were first executed and the artifact (PR, exercise report,
log line) that earned them.

Companion docs:
- `docs/PHASE_VALIDATION_RUNBOOK.md` — phase-progression playbook
- `apps/dashboard/src/lib/db/LEDGER_CONTRACT.md` — append-only substrate contract
- `apps/dashboard/src/lib/db/SUBSCRIPTION_REDUCER_CONTRACT.md` — reducer-specific operational contract

---

## Procedure index

| # | Procedure | First executed | Re-exercised |
|---|---|---|---|
| 1 | Stripe webhook signing secret rotation | 2026-05-10 (PR #49 fixup) | 2026-05-10 (Connect endpoint slot cleanup) |
| 2 | Reducer replay procedure | 2026-05-14 (synthetic exercise) | 2026-05-15 (Neon branch restore drill) |
| 3 | Disaster restore drill (Neon branch + reducer rebuild) | 2026-05-15 | — |
| 4 | Reducer deployment (backfill → tail flip) | 2026-05-16 (Phase 2 deploy) | — |
| 5 | Detector deployment + on-call escalation | 2026-05-15 (Phase 1 deploy + drill) | — |

---

## 1. Stripe webhook signing secret rotation

**Trigger:** signing secret was exposed (in logs, transcripts, a screenshot,
etc.) OR routine rotation OR a new endpoint replaces an old one.

**Risk class:** medium. A failed rotation produces a window where Stripe
deliveries fail signature verification. Mitigated by the dual-secret
slots in the webhook handler (`STRIPE_WEBHOOK_SECRET` and
`STRIPE_WEBHOOK_SECRET_FALLBACK`).

### Prerequisites

- Stripe API key with `webhook_endpoint:write` scope
- `netlify` CLI authenticated to the `app.payflux.dev` site
- `apps/dashboard/scripts/register-stripe-webhook.mjs` available (uses
  captured stdio — does **not** echo the new secret to the operator's
  terminal)

### Procedure (single-endpoint roll, transitional pattern)

```bash
# Stage 1: move CURRENT secret to FALLBACK (so the old secret keeps verifying
# while we cut over)
current="$(netlify env:get STRIPE_WEBHOOK_SECRET --context production)"
echo -n "$current" | netlify env:set STRIPE_WEBHOOK_SECRET_FALLBACK --context production
unset current

# Stage 2: roll the endpoint on Stripe and capture the new secret via the
# patched script. Script writes new secret directly to STRIPE_WEBHOOK_SECRET
# using stdio capture (no terminal echo).
cd apps/dashboard
STRIPE_API_KEY=sk_live_... node scripts/register-stripe-webhook.mjs

# Stage 3: trigger a Netlify rebuild so functions pick up the new env
netlify api createSiteBuild --data='{"site_id":"cbc15329-828c-4122-a1a9-661472a6ebbb"}'

# Stage 4: wait for deploy, then watch handler telemetry for verify_outcome
# distribution. During the transition you should see:
#   verify_outcome=primary    (new secret)  — should rise
#   verify_outcome=fallback   (old secret)  — should fall as Stripe catches up
# Once fallback observations stop for ~3 days (Stripe's retry window):
netlify env:unset STRIPE_WEBHOOK_SECRET_FALLBACK --context production
```

### Observations from previous executions

- **`netlify env:set` echoes the value in confirmation output if `stdio: ['ignore', 'inherit', 'inherit']`.** The `register-stripe-webhook.mjs` script uses `'pipe'` stdio specifically to prevent this. If you `env:set` directly from the shell, prefer piping via env var rather than command-line argument:
  ```bash
  NEW_SECRET="whsec_..." node -e '
    require("child_process").execFileSync("netlify",
      ["env:set", "STRIPE_WEBHOOK_SECRET", process.env.NEW_SECRET, "--context", "production"],
      { stdio: ["ignore", "pipe", "pipe"] });
  '
  ```
- **The `STRIPE_WEBHOOK_SECRET_FALLBACK` slot is single-use** — it can hold either the previous platform secret (during rotation) OR the Connect endpoint secret (during multi-endpoint operation). It cannot hold both. Audit which scenario applies before using it.
- **Re-deploying the Netlify site is required** for functions to see new env vars. The `netlify api createSiteBuild` call triggers this; alternatively, push any commit to main.
- **Don't expect to be able to retrieve the old secret from Netlify after rotation.** `netlify env:get` returns asterisks for secret-scoped values in newer CLI versions. Capture it via the Stage-1 pipe before overwriting.

### Caveats

- Rotation while Connect endpoint is using `STRIPE_WEBHOOK_SECRET_FALLBACK` will collide. Move the Connect secret to `STRIPE_CONNECT_WEBHOOK_SECRET` first (proper slot, post-PR #53).
- The 3-day "wait until no fallback observations" window is Stripe's retry envelope. Dropping fallback earlier risks missed deliveries from already-queued events Stripe is still retrying.

### Cleanup if interrupted

If Stage 3 (rebuild) fails or the new deploy crashes:
1. Re-set `STRIPE_WEBHOOK_SECRET` back to the old value from `STRIPE_WEBHOOK_SECRET_FALLBACK`
2. Re-trigger Netlify rebuild
3. Roll back the new Stripe endpoint via Stripe Dashboard (it's the one in `enabled` state most recently)

---

## 2. Reducer replay procedure

**Trigger:** suspected projection corruption from a reducer bug, or a
deliberate exercise to verify replay determinism, or a substrate restore
drill needs to confirm projections re-derive correctly.

**Risk class:** low in projection-only mode (CRUD writer remains
authoritative; replay only affects the projection table, which is
append-only and superseded by graph topology). Will become higher-risk
once cutover happens and projections are canonical — at that point a
bad replay can flood the substrate with conflict noise.

### Prerequisites

- `DIRECT_URL` for the target database (production OR a Neon branch
  for drills)
- `cmd/reducer` binary built or available
- Knowledge of which reducer name/version to replay

### Procedure

```bash
# 1. Stop the running reducer service so two reducers don't race.
fly scale count 0 --app payflux-reducer

# 2. Reset the cursor for the target reducer (deleting the row works;
# loadOrInitCursor will recreate it at epoch 0 on next start).
psql "$DIRECT_URL" -c "
  DELETE FROM reducer_cursors
  WHERE reducer_name = 'subscription' AND reducer_version = 'v1';
"

# 3. Run the reducer in backfill mode. This creates a fresh replay epoch,
# scans all ledger events from epoch 0 onward (up to terminateAt = process
# start time), and exits when the cursor catches up.
go build -o /tmp/payflux-reducer ./cmd/reducer
DIRECT_URL="$DIRECT_URL" \
  REDUCER_MODE=backfill \
  PAYFLUX_GIT_SHA="$(git rev-parse HEAD)" \
  /tmp/payflux-reducer

# 4. Compare the new epoch's projection_checksum to the prior epoch's.
psql "$DIRECT_URL" -c "
  SELECT
    substring(id::text, 1, 8) AS epoch,
    projections_written, events_processed, conflicts_emitted,
    projection_checksum, started_at
  FROM replay_epochs
  WHERE reducer_name = 'subscription'
  ORDER BY started_at DESC LIMIT 5;
"

# 5. Restart the reducer in tail mode for normal operation.
fly secrets set REDUCER_MODE=tail --app payflux-reducer
fly scale count 1 --app payflux-reducer
fly machine start --app payflux-reducer  # if machine landed in stopped state
```

### Expected outputs

Reducer logs during replay:
```
INFO reducer starting     mode=backfill
INFO epoch started        epoch=<uuid>
INFO cursor loaded        cursor_received_at=1970-01-01T00:00:00Z
INFO batch processed      events_scanned=N  projections_written=M  conflicts_emitted=K  cursor_at=...
INFO backfill complete    epoch=<uuid>
INFO reducer exited cleanly
```

**Checksum interpretation:**
- Two epochs over identical inputs **must** produce identical `projection_checksum`. Divergence means a reducer logic change or a data change between runs.
- Empty-set checksum is `d41d8cd98f00b204e9800998ecf8427e` (md5 of empty string). An epoch with `projections_written=0` will always produce this.

### Observations from previous executions

- **A replay over already-projected events produces N `late_event_detected` conflicts**, not N idempotent skips. The merge function sees the existing chain head's `event_occurred_at` as later than the incoming events and refuses to supersede. The UNIQUE constraint on the projection table is never consulted because no `INSERT` is attempted. Expected; not a bug.
- **Cursor `loadOrInitCursor` recreates a deleted cursor row at epoch 0** (`time.Unix(0, 0).UTC()`). Step 2's `DELETE` is therefore safe even with auto-creating logic.
- **Backfill mode terminates on the first empty batch** in newer reducer versions (post-PR #57). Older versions could idle forever if the cursor never crossed `terminateAt`; not applicable now.
- **Fly's process supervisor leaves the machine in `stopped` state after backfill mode's clean exit** (graceful exit ≠ crash). Step 5's `fly machine start` is required for tail mode to begin.

### Caveats

- Don't run two reducer processes concurrently against the same `reducer_name/version` — race condition on cursor advancement and possible duplicate projection conflict-detection. Audit #6 (advisory lock) is the proper fix; mitigation today is single-machine config.
- Future-dated `received_at` events are invisible to backfill (filtered by `upperBound = terminateAt`). They will silently activate when wall-clock catches up. See `PHASE_VALIDATION_RUNBOOK.md` "operational nuances."
- If a projection bug created bad projections, replay does NOT fix them — it produces NEW projections that may also be bad. The append-only contract means bad projections are permanent. The corrective path is a deliberate reducer-version evolution (v1.1) that interprets historical events under updated logic.

### Cleanup

- The cursor row recreates itself on next reducer start.
- The new replay epoch row stays as institutional evidence (append-only).
- Conflict rows from the replay are also permanent.

---

## 3. Disaster restore drill

**Trigger:** quarterly DR verification, OR post-incident substrate-integrity
check, OR pre-cutover Phase 3 prerequisite verification.

**Risk class:** low — drill operates on a throwaway Neon branch; production
is read-only from the drill's perspective.

### Prerequisites

- Neon API key with the project's permissions (note: rotate immediately
  after use; keys land in transcript)
- `cmd/reducer` binary built or available
- `apps/dashboard/scripts/db-preflight.mjs` available
- `pg` Node module installed in `apps/dashboard/node_modules` (run scripts from that dir)

### Procedure

```bash
# 1. Identify the project and parent branch.
NEON_KEY="napi_..."
curl -s https://console.neon.tech/api/v2/projects \
  -H "Authorization: Bearer $NEON_KEY" | jq '.projects[] | {id, name}'
# Expect: id=silent-night-87640564 name=payflux-billing

curl -s "https://console.neon.tech/api/v2/projects/silent-night-87640564/branches" \
  -H "Authorization: Bearer $NEON_KEY" | jq '.branches[] | select(.default == true) | .id'
# Expect: br-weathered-frog-adtnou3x (production)

# 2. Create a branch from current HEAD of production.
curl -s -X POST "https://console.neon.tech/api/v2/projects/silent-night-87640564/branches" \
  -H "Authorization: Bearer $NEON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "branch": {"name": "restore-drill-YYYY-MM-DD", "parent_id": "br-weathered-frog-adtnou3x"},
    "endpoints": [{"type": "read_write"}]
  }' | jq '{branch_id: .branch.id, endpoint_host: .endpoints[0].host}'

# 3. Wait for the branch's endpoint to become "active" (typically 5–30s).
# Then construct the branch DATABASE_URL by swapping host on production URL:
prod_url="$(netlify env:get DATABASE_URL --context production)"
branch_url="$(echo "$prod_url" | node -e '
  const u = new URL(require("fs").readFileSync(0,"utf8").trim());
  u.hostname = process.env.NEW_HOST;
  process.stdout.write(u.toString());
' NEW_HOST="ep-noisy-sun-XXXX.c-2.us-east-1.aws.neon.tech")"

# 4. Schema preflight.
cd apps/dashboard
DIRECT_URL="$branch_url" node scripts/db-preflight.mjs
# Expect: all migrations tracked, append-only triggers present.

# 5. Verify append-only triggers fire against the restored branch.
DIRECT_URL="$branch_url" node -e '
  const pg = require("pg");
  (async () => {
    const c = new pg.Client({ connectionString: process.env.DIRECT_URL });
    await c.connect();
    try {
      await c.query("UPDATE stripe_event_ledger SET verify_outcome = $1 WHERE id IN (SELECT id FROM stripe_event_ledger LIMIT 1)", ["fail"]);
      console.error("FAIL: trigger did not fire");
    } catch (e) {
      if (e.message.includes("append-only")) console.log("PASS: trigger blocked UPDATE");
      else throw e;
    } finally { await c.end(); }
  })();
'

# 6. Reset reducer_cursors on the BRANCH (production is unaffected).
DIRECT_URL="$branch_url" psql -c "DELETE FROM reducer_cursors"

# 7. Re-derive projections from the ledger via reducer backfill.
cd /Users/ct/payment-node
go build -o /tmp/payflux-reducer ./cmd/reducer
DIRECT_URL="$branch_url" REDUCER_MODE=backfill /tmp/payflux-reducer

# 8. Inspect the new replay epoch's checksum.
DIRECT_URL="$branch_url" psql -c "
  SELECT id, events_processed, projections_written, conflicts_emitted, projection_checksum
  FROM replay_epochs ORDER BY started_at DESC LIMIT 1;
"
# In future drills (post-Phase-2-with-real-projections), compare this
# checksum to the production-recorded checksum for the same event range.
# Identical = round-trip parity proven.

# 9. Delete the branch.
curl -s -X DELETE "https://console.neon.tech/api/v2/projects/silent-night-87640564/branches/<branch_id>" \
  -H "Authorization: Bearer $NEON_KEY"

# 10. Rotate the Neon API key in the Neon console.
```

### Observations from previous executions

- **2026-05-15 drill** (first executed):
  - Branch creation: ~30 seconds wall clock
  - Schema preflight: clean, all 24 migrations tracked
  - Append-only triggers: 4/4 (UPDATE/DELETE/TRUNCATE-CASCADE all blocked)
  - Reducer backfill: 4 events scanned, 0 projected (none were subscription events at the time), checksum `d41d8cd98f00b204e9800998ecf8427e` (empty-set)
  - Branch deletion: clean, ~5 seconds
  - Total drill wall-clock: ~3 minutes

### Caveats

- **Branch credentials inherit from parent.** Same Postgres user/password as production. If those credentials were exposed previously, the branch is exposed too. Plan rotation accordingly.
- **The parent's `-pooler` suffix is NOT on the branch endpoint.** Branch endpoints are direct (no pooler). The host-swap in step 3 strips the `-pooler` substring naturally because the new host doesn't have it.
- **Round-trip parity proof requires production to have projections.** While production has zero projections (pre-Phase 2 with real events), the drill validates substrate integrity but not projection re-derivation correctness against a known-good reference.
- **API key in transcript is permanent.** Even after rotation, the key is recorded in chat history forever. Treat any API key paste as permanently logged; rotate immediately.

### Cleanup

- Branch deleted via API or Neon console.
- Local `/tmp/payflux-reducer` binary can be removed.
- Local temp files holding the branch URL must be `shred -u`'d.
- Neon API key rotated.

---

## 4. Reducer deployment (backfill → tail flip)

**Trigger:** initial Phase 2 deployment, or reducer-version evolution requiring
fresh deployment.

**Risk class:** low in projection-only mode. Reducer writes only to its own
projection table; CRUD writer remains authoritative.

### Prerequisites

- Fly account in good billing standing
- `DIRECT_URL` for production
- `PAYFLUX_GIT_SHA` (the git SHA being deployed)
- `cmd/reducer` source committed to main

### Procedure

```bash
# 1. Create the Fly app.
fly apps create payflux-reducer --org personal

# 2. Set secrets via captured stdio (avoids value echo in CLI output).
node -e '
  const { execFileSync } = require("child_process");
  execFileSync("fly", [
    "secrets", "set",
    `DIRECT_URL=${process.env.DIRECT_URL}`,
    `PAYFLUX_GIT_SHA=${process.env.PAYFLUX_GIT_SHA}`,
    "REDUCER_MODE=backfill",
    "--app", "payflux-reducer", "--stage",
  ], { stdio: ["ignore", "pipe", "pipe"] });
'

# 3. Deploy in backfill mode.
fly deploy --config fly.reducer.toml --app payflux-reducer --remote-only

# 4. Watch backfill complete.
fly logs --app payflux-reducer --no-tail | grep -E '"msg":"(epoch started|batch processed|backfill complete)'

# 5. After "backfill complete", flip to tail mode.
fly secrets set REDUCER_MODE=tail --app payflux-reducer

# 6. CRITICAL: Fly leaves the machine stopped after backfill's clean exit.
#    Manually start it so tail mode begins.
fly machine list --app payflux-reducer
fly machine start <machine_id> --app payflux-reducer

# 7. Verify tail mode is active.
fly logs --app payflux-reducer --no-tail | grep -E '"mode":"tail"' | tail -3
```

### Observations from previous executions

- **2026-05-16 Phase 2 deploy** (first executed):
  - App creation: instant
  - Secret staging: instant (captured stdio worked correctly)
  - Deploy time: ~3 minutes (remote builder, image upload, machine creation)
  - Backfill completion: 138ms wall clock (4 ledger events, 0 projections)
  - Mode flip + machine restart: ~30 seconds
  - First tail-mode heartbeat: <60 seconds after machine start

### Caveats

- **Fly does NOT auto-restart a process that exited cleanly.** Backfill mode terminates with exit code 0; Fly considers this a graceful stop and leaves the machine in `stopped` state. Step 6's manual start is required.
- **Fly's `--remote-only` build is preferred** if Docker isn't running locally (the normal case for non-DevOps operators).
- **The deploy creates a primary + standby machine pair** based on fly.reducer.toml's defaults. After backfill+tail flip, only the primary is needed; the standby remains stopped until host failure triggers Fly's auto-failover.
- **`fly secrets set` without `--stage` triggers an immediate redeploy.** Step 5 uses no `--stage` because we want the deploy to pick up the new mode immediately.

### Cleanup if rolling back

```bash
fly scale count 0 --app payflux-reducer
```

NOTE: this destroys both primary and standby. No data is removed (reducer writes to subscription_projection, which is append-only). To resume, redeploy.

---

## 5. Detector deployment + on-call escalation drill

**Trigger:** initial Phase 1 deployment OR controlled rollback rehearsal.

**Risk class:** low — detector is read-only (writes only reconciliation rows
when drift is detected; no mutations elsewhere).

### Prerequisites

- Fly account in good billing standing
- `DIRECT_URL` for production
- `cmd/drift-detector` source committed to main

### Procedure (initial deploy)

```bash
# 1. Create the Fly app.
fly apps create payflux-drift-detector --org personal

# 2. Set secrets via captured stdio.
node -e '
  const { execFileSync } = require("child_process");
  execFileSync("fly", [
    "secrets", "set",
    `DIRECT_URL=${process.env.DIRECT_URL}`,
    `PAYFLUX_GIT_SHA=${process.env.PAYFLUX_GIT_SHA}`,
    "--app", "payflux-drift-detector", "--stage",
  ], { stdio: ["ignore", "pipe", "pipe"] });
'

# 3. Deploy.
fly deploy --config fly.drift-detector.toml --app payflux-drift-detector --remote-only

# 4. Watch first 5–10 sweeps.
fly logs --app payflux-drift-detector --no-tail | grep "sweep complete" | tail
```

### Procedure (on-call escalation drill — controlled rollback rehearsal)

```bash
# Pre-drill snapshot.
fly status --app payflux-drift-detector
fly logs --app payflux-drift-detector --no-tail | grep "sweep complete" | wc -l

# Trigger rollback.
fly scale count 0 --app payflux-drift-detector --process-group drift-detector --yes

# Wait 30+ seconds, verify no sweeps emitting.
sleep 30
fly logs --app payflux-drift-detector --no-tail | grep "sweep complete" | tail

# Resume.
fly scale count 1 --app payflux-drift-detector --process-group drift-detector --yes

# Verify first post-restart sweep matches pre-stop outcome shape.
fly logs --app payflux-drift-detector --no-tail | grep "sweep complete" | tail -1
```

### Observations from previous executions

- **2026-05-15 Phase 1 deploy:** initial sweep within 6 seconds of machine start; sweep cadence stable at default 60s tick; outcome shape `authority_count=2 detections=0 resolutions=0` consistent.
- **2026-05-15 on-call drill:** recovery time = 66 seconds from `scale count 0` to first new sweep on the recreated machine. Outcome shape unchanged across transition. Both primary and standby were destroyed; only one was recreated (standby NOT restored by `scale count 1`).

### Caveats

- **`fly scale count 0` destroys BOTH primary and standby machines.** This is the runbook's "rollback" command but operators should know it's a teardown, not a pause. To pause without destroying, use `fly machine stop <id>`.
- **`fly scale count N` for N ≥ 1 after a destroy creates N ACTIVE machines, NOT 1-primary-plus-(N-1)-standby.** Multiple active detector machines introduce a duplicate-sweep race (both detectors call `findOpenDrift` then `emitDetection`; in the window between, both can insert duplicate detection rows). To restore the original standby topology, redeploy.
- **Fly's default log retention is too short for institutional audit.** After ~24 hours, older sweep records age out of `fly logs` output. The substrate has been running continuously; the visible-window evidence is incomplete. External log sink needed for long-horizon retention (Datadog, BetterStack, Axiom, Logtail).

### Cleanup if rolling back

```bash
fly scale count 0 --app payflux-drift-detector
```

The detector is read-only. Stopping it has no data effect — no rows removed, no projections affected. Safe to scale down at any time.

---

## Versioning

| Date | Version | Change |
|---|---|---|
| 2026-05-16 | v1 | Initial codification of five earned procedures: webhook secret rotation, reducer replay, restore drill, reducer deployment, detector deployment + on-call drill. Each section captured from actual execution, not speculative process design. |
