#!/bin/bash
# PayFlux System Test - Deterministic Rerun
# Non-negotiable: explicit env vars, no defaults hiding in code

set -e

echo "=== PayFlux Internal System Test - Deterministic Rerun ==="
echo ""

# Clean previous run
rm -f payflux_rerun.log payflux_export.jsonl
mkdir -p test-outputs-rerun

# Step 1: Start PayFlux with deterministic config
echo "--- Step 1: Starting PayFlux with Tier 2 + Observability ---"

export PAYFLUX_API_KEY=test-harness-key
export STRIPE_API_KEY=sk_test_51234567890
export PAYFLUX_TIER=tier2
export PAYFLUX_PILOT_MODE=true
export PAYFLUX_TIER2_ENABLED=true
export PAYFLUX_INGEST_RPS=1000
export PAYFLUX_INGEST_BURST=5000
export PAYFLUX_EXPORT_MODE=stdout
export REDIS_ADDR=localhost:6379

echo "Configuration:"
echo "  PAYFLUX_TIER=$PAYFLUX_TIER"
echo "  PAYFLUX_PILOT_MODE=$PAYFLUX_PILOT_MODE"
echo "  PAYFLUX_TIER2_ENABLED=$PAYFLUX_TIER2_ENABLED"
echo "  PAYFLUX_INGEST_RPS=$PAYFLUX_INGEST_RPS"
echo "  PAYFLUX_INGEST_BURST=$PAYFLUX_INGEST_BURST"
echo ""

# Start PayFlux and split streams
./payflux 2>&1 | tee payflux_rerun.log | grep -E '^\{.*"event_id".*\}$' > payflux_export.jsonl &
PAYFLUX_PID=$!

echo "PayFlux started (PID: $PAYFLUX_PID)"
echo "Waiting for startup..."
sleep 5

# Verify health
if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "❌ PayFlux health check failed"
    kill $PAYFLUX_PID 2>/dev/null
    exit 1
fi
echo "✓ PayFlux is healthy"
echo ""

# Verify Tier 2 activation
echo "Checking Tier 2 activation logs..."
if grep -q "TIER2_ACTIVE" payflux_rerun.log && grep -q "TIER2_PIPELINE_READY" payflux_rerun.log; then
    echo "✓ Tier 2 activated successfully"
else
    echo "❌ Tier 2 activation not detected in logs"
    kill $PAYFLUX_PID 2>/dev/null
    exit 1
fi
echo ""

# Step 2: Run test harness
echo "--- Step 2: Running Test Harness (14 days compressed) ---"
echo "This will take ~3-5 minutes..."
echo ""

go run cmd/test-runner/main.go \
  --key=test-harness-key \
  --speed=7200 \
  --output=./test-outputs-rerun

TEST_EXIT=$?

if [ $TEST_EXIT -ne 0 ]; then
    echo "❌ Test harness failed with exit code $TEST_EXIT"
    kill $PAYFLUX_PID 2>/dev/null
    exit 1
fi

echo ""
echo "✓ Test harness complete"
echo ""

# Step 3: Wait for processing
echo "--- Step 3: Waiting for PayFlux Processing ---"
sleep 30
echo "✓ Processing window complete"
echo ""

# Step 4: Stop PayFlux
echo "--- Step 4: Stopping PayFlux ---"
kill $PAYFLUX_PID 2>/dev/null
sleep 2
echo "✓ PayFlux stopped"
echo ""

# Step 5: Verify outputs
echo "--- Step 5: Verifying Outputs ---"

if [ ! -f payflux_rerun.log ]; then
    echo "❌ Missing: payflux_rerun.log"
    exit 1
fi
echo "✓ payflux_rerun.log ($(wc -l < payflux_rerun.log) lines)"

if [ ! -f payflux_export.jsonl ]; then
    echo "❌ Missing: payflux_export.jsonl"
    exit 1
fi
EXPORT_LINES=$(wc -l < payflux_export.jsonl)
echo "✓ payflux_export.jsonl ($EXPORT_LINES events)"

if [ ! -f test-outputs-rerun/ingestion_stats.json ]; then
    echo "❌ Missing: test-outputs-rerun/ingestion_stats.json"
    exit 1
fi
echo "✓ test-outputs-rerun/ingestion_stats.json"

echo ""
echo "=== RERUN COMPLETE ==="
echo ""
echo "Chain of custody files:"
echo "  1. payflux_rerun.log"
echo "  2. payflux_export.jsonl ($EXPORT_LINES events)"
echo "  3. test-outputs-rerun/ingestion_stats.json"
echo "  4. test-outputs-rerun/merchant_profiles.json"
echo "  5. test-outputs-rerun/anomaly_schedule.json"
echo ""
echo "Next: Run analysis"
echo "  go run cmd/test-analysis/main.go --export=payflux_export.jsonl --output=./test-outputs-rerun"
echo ""
