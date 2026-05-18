# PayFlux Codebase Audit Report

**Date:** 2026-04-28
**Scope:** Full repository audit — security, architecture, code quality, testing, CI/CD, dependencies, frontend, operational readiness
**Commit:** f5d1553 (main)

---

## Executive Summary

PayFlux is a well-structured payment event observability buffer with solid fundamentals: constant-time auth, Redis Streams for durable ordering, proper graceful shutdown, and a clean interface-based exporter pipeline. However, there are several issues that should be addressed before production hardening, ranging from **committed secrets/artifacts** to **a 1,857-line main.go** to **missing auth on a sensitive API endpoint**.

### Severity Breakdown

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High | 6 |
| Medium | 10 |
| Low / Cleanup | 8 |

---

## Critical Issues

### C1. Placeholder Stripe Secret Key Committed in K8s Manifest

**File:** `deploy/k8s/payflux.yaml:32`
```yaml
stringData:
  PAYFLUX_API_KEY: "your-api-key-here"
  STRIPE_API_KEY: "sk_live_your_stripe_key_here"
```

The K8s Secret resource contains `sk_live_` prefixed placeholder text. If anyone applies this manifest without editing, they'll expose a deployment expecting a live key. Worse, if a real key is ever pasted here and committed, it's in Git history permanently. **Use `REPLACE_ME` with no `sk_live_` prefix**, or remove the Secret from the manifest entirely and document `kubectl create secret` instead.

### C2. Stripe Client Initialized with Fallback Placeholder

**File:** `apps/dashboard/src/lib/billing/stripeClient.ts:3`
```typescript
const stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder';
```

If `STRIPE_SECRET_KEY` is unset, the Stripe client initializes with a placeholder string rather than failing fast. This silently creates a broken Stripe client that will fail on every API call with confusing errors instead of a clear startup failure. **Throw an error if the env var is missing** (or guard at call sites).

### C3. Missing Authentication on `/api/v1/signals/evaluate`

**File:** `main.go:529`
```go
if pgDB != nil {
    mux.HandleFunc("/api/v1/signals/evaluate", api.EvaluateFailureVelocityHandler(pgDB))
}
```

This endpoint accepts POST requests with a `workspace_id` and queries the database — but it has **no auth middleware**. Every other data-mutating/querying endpoint uses `authMiddleware`. An unauthenticated attacker could enumerate workspace failure data. **Wrap with `authMiddleware`.**

---

## High Severity Issues

### H1. 18 Development Artifacts Committed to Repository

The following files are tracked in Git but should not be:

| File | Reason |
|------|--------|
| `main.go.bak`, `main.go.save` | Editor backup files |
| `core_log.txt` (102KB) | Application runtime log with hostnames |
| `events.log` | Sample event data |
| `smoke_on.out` | Load test output |
| `proof-running.png` (695KB) | Screenshot |
| `FINAL_CERTIFIED_DOSSIER_PF_20260122_0714.txt` | Internal dossier |
| `FINAL_PILOT_READY_DOSSIER.txt` | Internal dossier |
| `final_*.json` (10 files) | Test/proof artifacts |

These bloat the repo, leak internal process details, and the log file contains machine hostnames. **Remove from tracking and add patterns to `.gitignore`.**

### H2. CORS Hardcoded to localhost

**File:** `main.go:1029`
```go
w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
```

CORS origin is hardcoded to `http://localhost:3000`. In production, this either:
- Blocks the real dashboard from making requests (if it's on a different origin), or
- Forces operators to skip CORS entirely via a reverse proxy

**Make this configurable via `PAYFLUX_CORS_ORIGIN` env var** (or use the dashboard URL from config).

### H3. Monolithic main.go (1,857 lines)

`main.go` contains HTTP handlers, middleware, business logic, configuration loading, consumer loop, export logic, metrics registration, and utility functions — all in one file. This makes the code hard to navigate, test in isolation, and review. Key functions that should be extracted:

- `handleEvent`, `handleCheckout`, `handleHealth`, `handleExportHealth` → `internal/api/`
- `authMiddleware`, `corsMiddleware`, `rateLimitMiddleware` → `internal/httpmw/`
- `consumeEvents`, `safeHandleMessage`, `handleMessageWithDlq` → `internal/consumer/`
- `loadConfiguration`, `loadRiskScoringConfig`, etc. → `internal/config/`

### H4. `sendAlert` Makes Unauthenticated HTTP Call to Localhost

**File:** `internal/api/failure_velocity.go:112`
```go
resp, err := http.Post("http://localhost:3000/api/v1/alerts", "application/json", bytes.NewReader(body))
```

This fires an alert to a hardcoded `localhost:3000` URL with no authentication, no timeout, and in a goroutine with no error propagation. In production this silently fails. **Use a configurable URL, add a timeout context, and add auth headers.**

### H5. Path Traversal Risk in Fixture Endpoint

**File:** `evidence_handler.go:149-162`
```go
name := r.URL.Path[len("/api/evidence/fixtures/"):]
...
path := fmt.Sprintf("internal/evidence/fixtures/%s.json", name)
data, err := os.ReadFile(path)
```

The security check only blocks `.` and `..` but **does not block `../`** sequences embedded in the name (e.g., `../../etc/passwd`). While the `.json` suffix limits exploitation, a path like `../../../.env.example` would resolve. This endpoint is dev-only (`PAYFLUX_ENV=dev`), but still needs proper sanitization. **Use `filepath.Base()` to strip directory components.**

### H6. Webhook Signature Bypass in Non-Production

**File:** `apps/dashboard/src/app/api/webhooks/stripe/route.ts:66-68`
```typescript
if (isTestBypassAllowed() && sig === 'test_bypass') {
    return JSON.parse(payload) as Stripe.Event;
}
```

The test bypass parses raw JSON as a Stripe event without signature verification. While gated behind `NODE_ENV=development && DASHBOARD_WEBHOOK_TEST_BYPASS=true`, if either flag is accidentally set in production, anyone can forge Stripe webhook events by sending `Stripe-Signature: test_bypass`. **Add a startup warning and use a separate test endpoint instead of bypassing the real one.**

---

## Medium Severity Issues

### M1. Per-API-Key Rate Limiter Map Grows Unboundedly

**File:** `main.go:1046-1065`

`rateLimiters` and `outcomeLimiters` are maps keyed by API key string. If an attacker sends requests with many unique (invalid) Bearer tokens, each gets a new `rate.Limiter` allocated. The auth check happens *before* rate limiting in the middleware chain, but the `getRateLimiter` function is called inside `rateLimitMiddleware` which runs *after* auth — so this is mitigated. However, if the middleware order ever changes, this becomes a memory leak vector. **Add a max-size guard or use a sync.Map with TTL-based eviction.**

### M2. `min()` Function Shadows Go 1.21+ Builtin

**File:** `main.go:1263`
```go
func min(a, b int) int {
```

Go 1.21+ has a builtin `min()`. The `go.mod` specifies `go 1.25.5`. This custom `min` shadows the builtin and will cause confusion. **Remove it and use the builtin.**

### M3. Mixed Logging: `log.Printf` + `slog`

The codebase uses structured `slog` logging for startup and config, but `log.Printf` for runtime operations (consumer loop, metrics errors, DLQ operations). This creates inconsistent log formats — structured JSON from slog and unstructured text from log.Printf — making log aggregation and parsing harder. **Migrate all logging to slog.**

### M4. Stripe Key Required Even When Stripe Not Used

**File:** `main.go:442-444`
```go
stripeKey := os.Getenv("STRIPE_API_KEY")
if stripeKey == "" || !strings.HasPrefix(stripeKey, "sk_") {
    log.Fatal("STRIPE_API_KEY missing or invalid format")
}
```

PayFlux fatally exits if `STRIPE_API_KEY` is missing, even for deployments that only use the event ingest pipeline and never touch Stripe checkout. **Make Stripe configuration optional — only validate when checkout features are enabled.**

### M5. No Request Timeout on Checkout Handler

**File:** `main.go` — `handleCheckout` (referenced in route setup)

The Stripe checkout session creation has no explicit timeout. If the Stripe API hangs, the goroutine serving this request blocks until `WriteTimeout` (10s) kills it. **Add a `context.WithTimeout` around the Stripe API call.**

### M6. Consumer Watchdog Log But No Action

**File:** `main.go:911-913`
```go
if t := lastConsume.Load(); t != 0 && time.Now().Unix()-t > 30 {
    log.Printf("consumer_watchdog_triggered stall_seconds=%d", ...)
}
```

The consumer stall watchdog logs a warning but takes no corrective action (no metric increment, no alert, no restart attempt). **At minimum, increment a Prometheus counter. Ideally, trigger a re-read or consumer restart after sustained stalls.**

### M7. `handleEvidence` Hardcoded System State Values

**File:** `evidence_handler.go:126-131`
```go
sys := evidence.SystemState{
    IngestRate:   "850 req/s",   // Example value
    ActiveModels: 3,
    Cluster:      "payflux-main-01",
    NodeCount:    4,
}
```

These are hardcoded placeholder values, not real metrics. This could mislead operators viewing the evidence console. **Wire these to actual Prometheus metrics or remove the fields.**

### M8. `postgres-data` Volume Defined But Postgres Service Commented Out

**File:** `deploy/docker-compose.yml:82-83`
```yaml
volumes:
  redis-data:
  postgres-data:   # orphaned — postgres service is commented out
```

The `postgres-data` volume is declared but the postgres service is commented out. Docker Compose will still create this volume. **Remove or comment out the volume declaration too.**

### M9. No HTTPS/TLS Configuration for Go Server

The `http.Server` in `main.go` listens on plain HTTP. While the expectation is that TLS terminates at a reverse proxy (and Fly.io's `force_https` confirms this), there's no documentation about this requirement. The Redis TLS option exists (`REDIS_TLS=true`) but there's no equivalent for the HTTP server. **Document that TLS termination is expected at the proxy layer, or add optional TLS support.**

### M10. Dashboard `package.json` Has Wrong Name

**File:** `apps/dashboard/package.json:2`
```json
"name": "kinetic-crab"
```

The package name is `kinetic-crab` instead of something like `payflux-dashboard`. This is likely a leftover from project scaffolding. **Rename to `payflux-dashboard`.**

---

## Low Severity / Cleanup

### L1. `getRateLimiter` Uses Ingest Config for All Rate-Limited Endpoints

**File:** `main.go:1046-1065`

The legacy `getRateLimiter` (used in `rateLimitMiddleware` fallback) creates limiters with `ingestRPS`/`ingestBurst` for any endpoint, including `/checkout`. Checkout and ingest have different traffic profiles. This is acceptable now since per-account limiting is the primary path, but **consider separating if the legacy path persists.**

### L2. `.gitignore` Already Covers `*.bak` and `*.txt` But Files Are Tracked

The `.gitignore` has `*.bak` and `*.txt` entries, but the committed files predate these rules. Git continues tracking them. **Run `git rm --cached` on these files.**

### L3. `package.json` at Root Repo Level

**File:** `package.json` (root)
```json
{
  "scripts": {
    "postinstall": "git config core.hooksPath .githooks"
  }
}
```

This exists solely to auto-wire `.githooks` on `npm install`. While functional, it's surprising to find a `package.json` at the root of a Go project. **Document this in the README or move hook setup to a Makefile target.**

### L4. `getMerchantContext` Returns Stub Data

**File:** `main.go:1848-1857`
```go
func getMerchantContext(id string) *MerchantContext {
    return &MerchantContext{
        ID:               id,
        AnomalyType:      "",
        RecurrenceCount:  12,
        BaselineApproval: 0.9421,
    }
}
```

This always returns the same hardcoded data regardless of the merchant ID. It's marked as a stub but is used by the evidence handler in production. **Either implement real lookups or clearly label the feature as demo-only in the API response.**

### L5. `ScheduleEvaluations` Silently Swallows Errors

**File:** `internal/api/failure_velocity.go:147`
```go
EvaluateAndAlert(ctx, db, wid)  // return value ignored
```

The hourly scheduler calls `EvaluateAndAlert` but discards the error. If evaluation fails for a workspace, there's no logging, metric, or retry. **Log the error at minimum.**

### L6. Unused Import Suggestion: `database/sql` in `main.go`

`main.go` imports `database/sql` alongside `payment-node/pg`. The `pg` package handles the connection. The `sql.DB` type reference in the var block could use the pg package's return type instead. Minor cleanup.

### L7. No `go.sum` Verification in CI

Neither CI workflow runs `go mod verify` to check that dependencies haven't been tampered with. **Add `go mod verify` as a CI step.**

### L8. Export File Permissions Too Open

**File:** `main.go:1786`
```go
f, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
```

Export files are created with `0644` (world-readable). Payment event data, even hashed, should be more restrictive. **Use `0640` or `0600`.**

---

## Positive Observations

These are things done well that should be preserved:

1. **Constant-time auth comparison** (`crypto/subtle.ConstantTimeCompare`) — prevents timing attacks
2. **Body size limits** at both middleware level (10MB) and handler level (1MB) — defense in depth
3. **Deduplication via Redis `SetNX`** — proper idempotency handling
4. **ACK-after-export pattern** — events aren't lost on export failure
5. **Poison message detection** with DLQ routing — prevents infinite retry loops
6. **Per-IP connection limiting** (`connlimit.go`) — well-implemented with atomic counters
7. **Config fingerprinting** at startup — great for debugging config drift
8. **Pre-flight validation** (`startup.ValidateConfig`) — catches all misconfigurations before any connections
9. **Non-root Docker user** with read-only filesystem in K8s — good security posture
10. **Log redaction framework** (`logsafe` package) — proper PII/secret filtering
11. **Structured Prometheus metrics** with good naming conventions
12. **Architecture contract CI** with determinism check — enforces structural invariants
13. **Graceful shutdown** with context cancellation propagation

---

## Recommended Priority Order

1. **Immediate** (before any production traffic):
   - C1: Remove placeholder secrets from K8s manifest
   - C2: Fix Stripe client fallback
   - C3: Add auth to `/api/v1/signals/evaluate`
   - H5: Fix path traversal in fixture endpoint

2. **Short-term** (next sprint):
   - H1: Remove committed artifacts
   - H2: Make CORS configurable
   - H4: Fix hardcoded alert URL
   - H6: Harden webhook bypass
   - M4: Make Stripe optional

3. **Medium-term** (next 2-4 weeks):
   - H3: Break up main.go
   - M2: Remove shadowed `min()`
   - M3: Unify logging to slog
   - M7: Wire real system state values
   - L8: Tighten file permissions

4. **Ongoing hygiene:**
   - L3, L4, L5, L6, L7, M8, M10: Cleanup items
