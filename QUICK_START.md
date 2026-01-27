# PayFlux Internal System Test — Quick Reference

## What Was Built

A comprehensive test harness that simulates **20 merchants** across **14 days** to validate whether PayFlux produces credible, usable artifacts for processor/bank review.

### Key Numbers
- **1.75M events** generated
- **20 merchants** (8 Stable, 7 Growth, 5 Messy)
- **8 controlled anomalies** (Day 3-12)
- **3 critical tests**: Interpretation consistency, artifact quality, historical memory

---

## Quick Start

### 1. Prerequisites
```bash
# Start PayFlux with Tier 2 enabled
cd deploy
# Edit docker-compose.yml:
#   PAYFLUX_PILOT_MODE=true
#   PAYFLUX_TIER=tier2
#   PAYFLUX_EXPORT_MODE=stdout
#   PAYFLUX_API_KEY=test-harness-key
docker compose up --build
```

### 2. Run Test (Automated)
```bash
cd /Users/ct/payment-node
./run_test.sh
```

**Duration**: ~6-10 minutes

### 3. Review Results
```bash
cat test-outputs/analysis_summary.txt
```

---

## Manual Execution

```bash
# Dry run (verify telemetry)
go run cmd/test-runner/main.go --key=test-harness-key --dry-run

# Capture export
docker logs -f payflux-payflux-1 > payflux_export.jsonl &

# Run full test
go run cmd/test-runner/main.go --key=test-harness-key --speed=3600

# Analyze
go run cmd/test-analysis/main.go --export=payflux_export.jsonl
```

---

## Critical Tests

### Test 1: Interpretation Consistency (Day 3)
**Anomaly**: +40% retry spike  
**Merchants**: stable_001, growth_003, messy_001  
**Expected**: Different interpretations based on merchant context  
**FAIL if**: Outputs are templated or identical

### Test 2: Artifact Quality (All Tier 2 Events)
**Validation**: No forbidden phrases  
**Forbidden**: "will be throttled", "guaranteed", "Stripe requires", "you should"  
**Required**: Probabilistic language ("typically", "commonly")  
**FAIL if**: Manual rewriting required

### Test 3: Historical Memory (Day 3 → Day 9)
**Merchant**: growth_003  
**Anomalies**: Day 3 retry spike, Day 9 soft decline surge  
**Expected**: Day 9 interpretation references Day 3 context  
**FAIL if**: System treats Day 9 as stateless

---

## Files Created

### Test Harness
- `internal/testharness/merchant.go` — Merchant simulation
- `internal/testharness/anomaly.go` — Anomaly injection
- `internal/testharness/telemetry.go` — Event generation
- `cmd/test-runner/main.go` — Test orchestration
- `cmd/test-analysis/main.go` — Output validation

### Documentation
- `TEST_HARNESS_README.md` — Full execution guide
- `INTERNAL_TRUTH_REPORT.md` — Report template
- `run_test.sh` — Automated execution

### Outputs (Dry Run Verified)
- `test-outputs/merchant_profiles.json` — 20 merchants
- `test-outputs/anomaly_schedule.json` — 8 anomalies
- `test-outputs/sample_telemetry_*.json` — Sample events

---

## Verification Status

✓ **Dry Run Complete**
- 1,756,548 events generated
- Schema compliance verified
- Merchant archetypes validated
- Anomaly schedule confirmed

⏳ **Full Test Pending**
- Awaiting PayFlux Tier 2 execution
- Analysis tool ready
- Internal truth report template ready

---

## Stop Conditions

If any of these occur, **STOP and document**:
1. Templated interpretations across archetypes
2. Outcome guarantees in Tier 2 output
3. Silent failures or hallucinated confidence

---

## Next Steps

1. **Execute**: Run `./run_test.sh` against live PayFlux
2. **Analyze**: Review `test-outputs/analysis_summary.txt`
3. **Document**: Complete `INTERNAL_TRUTH_REPORT.md`
4. **Decide**: Production readiness assessment

---

## Contact

Internal use only (founders)
