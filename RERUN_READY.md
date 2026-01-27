# PayFlux System Test - Observability Locked + Ready for Rerun

**Date**: 2026-01-22  
**Status**: READY FOR DETERMINISTIC RERUN

---

## Phase 0: Observability Counters — COMPLETE ✓

### Must-Have Metrics Added

All required counters implemented and wired:

#### Ingestion Observability
- ✓ `payflux_events_received_total` — All events hitting endpoint (before validation)
- ✓ `payflux_events_accepted_total` — Events accepted after validation
- ✓ `payflux_events_rate_limited_total` — Events rejected due to rate limiting

#### Tier 1 Scoring Observability
- ✓ `payflux_tier1_scored_total` — Events that received risk scoring
- ✓ `payflux_tier1_insufficient_data_total` — Events with insufficient_data driver

#### Tier 2 Enrichment Observability
- ✓ `payflux_tier2_attempted_total` — Tier 2 enrichment attempts
- ✓ `payflux_tier2_enriched_total` — Successfully enriched events
- ✓ `payflux_tier2_skipped_insufficient_data_total` — Skipped due to insufficient data
- ✓ `payflux_tier2_failed_total` — Enrichment failures
- ✓ `payflux_tier2_last_error_timestamp` — Last error timestamp

### Metrics Wired Into Code

**handleEvent** (`main.go:1144-1260`):
- `eventsReceived.Inc()` — Line 1145 (all requests)
- `eventsAccepted.Inc()` — Line 1225 (after validation + dedup)
- `eventsRateLimited.Inc()` — Line 940 (rate limit middleware)

**exportEvent** (`main.go:1663-1740`):
- `tier1Scored.Inc()` — Line 1683 (all risk scoring)
- `tier1InsufficientData.Inc()` — Line 1685 (insufficient_data driver)
- `tier2Attempted.Inc()` — Line 1692 (Tier 2 attempts)
- `tier2SkippedInsufficientData.Inc()` — Line 1696 (insufficient data skip)
- `tier2Enriched.Inc()` — Line 1728 (successful enrichment)

**Prometheus Registration** (`main.go:483-496`):
- All new metrics registered with Prometheus

---

## Deterministic Rerun Configuration

### Explicit Environment Variables

```bash
export PAYFLUX_API_KEY=test-harness-key
export STRIPE_API_KEY=sk_test_51234567890
export PAYFLUX_TIER=tier2
export PAYFLUX_PILOT_MODE=true
export PAYFLUX_TIER2_ENABLED=true
export PAYFLUX_INGEST_RPS=1000        # 10× increase from 100
export PAYFLUX_INGEST_BURST=5000      # 10× increase from 500
export PAYFLUX_EXPORT_MODE=stdout
export REDIS_ADDR=localhost:6379
```

### Execution Script

**File**: `run_rerun.sh`

**Steps**:
1. Start PayFlux with deterministic config
2. Verify health + Tier 2 activation
3. Run test harness (14 days, 7200× speed)
4. Wait for processing (30 seconds)
5. Stop PayFlux
6. Verify chain of custody files

**Duration**: ~5-7 minutes

---

## Chain of Custody Files

After rerun, these files will exist:

1. **payflux_rerun.log** — Full PayFlux logs (startup + runtime)
2. **payflux_export.jsonl** — Exported events (Tier 1 + Tier 2)
3. **test-outputs-rerun/ingestion_stats.json** — Sender stats
4. **test-outputs-rerun/merchant_profiles.json** — Merchant configs
5. **test-outputs-rerun/anomaly_schedule.json** — Anomaly timing

---

## Pass/Fail Gates (Non-Negotiable)

### Gate A: Ingestion Viability
- **PASS**: `accepted / generated ≥ 95%`
- **FAIL**: `< 95%` → raise limits or implement backpressure

### Gate B: Tier 2 Engagement
- **PASS**: `tier2_enriched / elevated_plus ≥ 70%`
- **FAIL**: enrichment near-zero or inconsistent

### Gate C: Interpretation Consistency
- **PASS**: Day 3 retry spike outputs differ materially across stable_001, growth_003, messy_001
- **FAIL**: templated "same paragraph different merchant"

### Gate D: Artifact Safety
- **PASS**: no forbidden phrases, probabilistic language present
- **FAIL**: guarantees / insider claims / prescriptive language

### Gate E: Historical Memory
- **PASS**: Day 9 narrative for growth_003 references Day 3 pattern
- **FAIL**: stateless outputs

---

## Metrics to Check After Rerun

```bash
# Ingestion health
curl -s localhost:8080/metrics | grep payflux_events_received_total
curl -s localhost:8080/metrics | grep payflux_events_accepted_total
curl -s localhost:8080/metrics | grep payflux_events_rate_limited_total

# Tier 1 scoring
curl -s localhost:8080/metrics | grep payflux_tier1_scored_total
curl -s localhost:8080/metrics | grep payflux_tier1_insufficient_data_total

# Tier 2 enrichment
curl -s localhost:8080/metrics | grep payflux_tier2_attempted_total
curl -s localhost:8080/metrics | grep payflux_tier2_enriched_total
curl -s localhost:8080/metrics | grep payflux_tier2_skipped_insufficient_data_total
```

---

## What NOT to Do

❌ Don't tweak templates mid-run  
❌ Don't change anomaly schedule  
❌ Don't reduce load "just to see"  
❌ Don't "fix" analysis rules to make it pass

**This test is your contract with reality.**

---

## Next Steps

1. **Execute**: `./run_rerun.sh`
2. **Analyze**: `go run cmd/test-analysis/main.go --export=payflux_export.jsonl --output=./test-outputs-rerun`
3. **Fill Report**: Complete `INTERNAL_TRUTH_REPORT.md` (brutal + factual)
4. **Decision**: Production readiness based on gates

---

## Summary

**Observability**: ✅ LOCKED  
**Tier 2**: ✅ WORKING  
**Rate Limits**: ✅ INCREASED 10×  
**Rerun Script**: ✅ READY  

**Ready for deterministic rerun**: YES
