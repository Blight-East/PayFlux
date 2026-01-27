# PayFlux Internal System Test

**Objective**: Validate whether PayFlux behaves like a credible observability system when running alongside 10–30 active merchants.

**Critical Question**: If PayFlux were live today, would it produce credible, usable artifacts for processor, bank, or compliance review?

---

## Test Architecture

### Merchant Simulation
- **20 merchants** across 3 archetypes:
  - **Stable (8)**: Flat volume, normal approval rates, low retry intensity
  - **Growth (7)**: Volume spikes, retry intensity increases, expanding geo diversity
  - **Messy (5)**: MCC inconsistencies, velocity bursts, elevated soft declines

### Telemetry Generation
- **14 days** of hourly snapshots (~336 hours)
- **~50,000-80,000 total events** (realistic merchant portfolio)
- Full PayFlux Event schema compliance

### Anomaly Injection
- **Day 3**: Retry spike (+40%) across all archetypes → **Interpretation consistency test**
- **Day 5**: Soft decline surge on growth merchants
- **Day 7**: Auth latency (timeout clustering)
- **Day 9-10**: MCC drift on messy merchants
- **Day 9**: Related anomaly on Day 3 merchant → **Historical memory test**
- **Day 12**: Velocity spike on growth merchants

---

## Prerequisites

1. **PayFlux running locally**:
   ```bash
   cd deploy
   docker compose up --build
   ```

2. **Environment configuration**:
   ```bash
   # In deploy/.env or docker-compose.yml
   PAYFLUX_PILOT_MODE=true
   PAYFLUX_TIER=tier2
   PAYFLUX_EXPORT_MODE=stdout
   PAYFLUX_API_KEY=test-harness-key
   ```

3. **Capture export output**:
   ```bash
   # In a separate terminal
   docker logs -f payflux-payflux-1 > payflux_export.jsonl
   ```

---

## Execution

### Step 1: Generate Telemetry (Dry Run)

```bash
go run cmd/test-runner/main.go \
  --key=test-harness-key \
  --dry-run \
  --output=./test-outputs
```

**Output**:
- `test-outputs/merchant_profiles.json` — Merchant portfolio
- `test-outputs/anomaly_schedule.json` — Injection schedule
- `test-outputs/sample_telemetry_*.json` — Sample events

**Verify**: Check merchant profiles and anomaly schedule before proceeding.

---

### Step 2: Run Full Test (Live Ingestion)

```bash
go run cmd/test-runner/main.go \
  --key=test-harness-key \
  --speed=3600 \
  --output=./test-outputs
```

**Parameters**:
- `--speed=3600`: Time compression (1 hour per second, 14 days in ~5.6 minutes)
- `--speed=1800`: Slower (1 hour per 2 seconds, 14 days in ~11 minutes)
- `--speed=7200`: Faster (1 hour per 0.5 seconds, 14 days in ~2.8 minutes)

**Duration**: ~5-10 minutes depending on speed multiplier

**Monitor**:
```bash
# Watch ingestion progress
tail -f test-outputs/ingestion_stats.json

# Watch PayFlux metrics
curl -s localhost:8080/metrics | grep payflux_ingest_accepted
```

---

### Step 3: Analyze Results

```bash
go run cmd/test-analysis/main.go \
  --export=payflux_export.jsonl \
  --output=./test-outputs
```

**Output**:
- `test-outputs/analysis_report.json` — Full analysis
- `test-outputs/analysis_summary.txt` — Text summary

---

## Validation Criteria

### Phase 4: Interpretation Consistency Test

**Test**: Same anomaly (retry spike) on Day 3 across different archetypes.

**Expected**:
- `merchant_stable_001`: "Isolated deviation from stable baseline"
- `merchant_growth_003`: "Expansion-linked pattern"
- `merchant_messy_001`: "Compounding risk signals"

**PASS**: Interpretations are contextually different  
**FAIL**: Outputs are templated or identical

---

### Phase 5: Artifact Quality Test

**Validation**:
- ✓ Timestamped narratives reference observed telemetry
- ✓ Historical context included when relevant
- ✗ No outcome guarantees ("will be throttled")
- ✗ No insider knowledge claims ("Stripe's internal threshold is X")
- ✓ Probabilistic language only ("typically", "commonly observed")

**PASS**: All artifacts are hand-off ready  
**FAIL**: Manual rewriting required

---

### Phase 6: Historical Memory Test

**Test**: `merchant_growth_003` has anomalies on Day 3 and Day 9.

**Expected**: Day 9 exports reference Day 3 context (cumulative pattern treatment).

**PASS**: Earlier context is referenced  
**FAIL**: System treats Day 9 as stateless

---

### Phase 7: Failure Mode Testing

**Test Cases**:
| Scenario | Expected Behavior |
|----------|-------------------|
| Missing `geo_bucket` | Accept event, use "unknown" |
| Partial telemetry (50% loss) | Lower confidence, report "insufficient_data" |
| Out-of-order timestamps | Process correctly via Redis Streams |
| Single merchant flooding | Rate limit or backpressure warning |

**PASS**: System degrades gracefully with clear error reporting  
**FAIL**: Silent failure or hallucinated confidence

---

## Deliverables

### 1. Test Harness Code
- ✓ `internal/testharness/merchant.go` — Merchant simulation
- ✓ `internal/testharness/anomaly.go` — Anomaly injection
- ✓ `internal/testharness/telemetry.go` — Event generation
- ✓ `cmd/test-runner/main.go` — Test orchestration
- ✓ `cmd/test-analysis/main.go` — Output analysis

### 2. Sample Outputs
- `test-outputs/merchant_profiles.json`
- `test-outputs/anomaly_schedule.json`
- `test-outputs/sample_telemetry_*.json`
- `test-outputs/ingestion_stats.json`

### 3. Analysis Results
- `test-outputs/analysis_report.json`
- `test-outputs/analysis_summary.txt`

### 4. Internal Truth Report
- `INTERNAL_TRUTH_REPORT.md` — Founder-only document (generated after analysis)

---

## Absolute Rules

1. **Do NOT change site copy**
2. **Do NOT adjust UI for this test**
3. **Do NOT optimize for "nice demo"**
4. **Do NOT add features to pass the test**

We are validating truth, not polish.

---

## Stop Condition

If any step reveals a mismatch between what PayFlux claims and what it actually produces, **STOP and document it**. Do not patch around it.

---

## Troubleshooting

### "Connection refused" error
- Verify PayFlux is running: `curl localhost:8080/health`
- Check Docker: `docker ps | grep payflux`

### "401 unauthorized" error
- Verify API key matches: `--key` must match `PAYFLUX_API_KEY` in docker-compose.yml

### No Tier 2 output in exports
- Verify: `PAYFLUX_TIER=tier2` in docker-compose.yml
- Restart PayFlux after changing env vars

### Export file is empty
- Verify export mode: `PAYFLUX_EXPORT_MODE=stdout`
- Check Docker logs: `docker logs payflux-payflux-1`

### Analysis shows "insufficient data"
- Increase speed multiplier (slower ingestion): `--speed=1800`
- Wait longer after ingestion: 60 seconds instead of 30

---

## Next Steps After Test

1. **Review analysis report**: `cat test-outputs/analysis_summary.txt`
2. **Examine failed tests**: Check `analysis_report.json` for details
3. **Manual artifact review**: Sample Tier 2 outputs for language compliance
4. **Generate internal truth report**: Document gaps between claims and reality
5. **Decision point**: Continue to production or address gaps first

---

## Contact

For questions about this test: Internal use only (founders)
