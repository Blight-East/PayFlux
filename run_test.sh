#!/bin/bash
set -e

echo "=== PayFlux Internal System Test - Quick Start ==="
echo ""

# Check if PayFlux is running
echo "Checking PayFlux health..."
if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "❌ PayFlux is not running"
    echo ""
    echo "Start PayFlux first:"
    echo "  cd deploy"
    echo "  docker compose up --build"
    exit 1
fi
echo "✓ PayFlux is healthy"
echo ""

# Get API key
API_KEY="${PAYFLUX_API_KEY:-test-harness-key}"
echo "Using API key: ${API_KEY:0:8}..."
echo ""

# Create output directory
mkdir -p test-outputs

# Step 1: Dry run (generate telemetry)
echo "--- Step 1: Generating Telemetry (Dry Run) ---"
go run cmd/test-runner/main.go \
  --key="$API_KEY" \
  --dry-run \
  --output=./test-outputs

echo ""
echo "✓ Telemetry generated"
echo ""
read -p "Review merchant_profiles.json and anomaly_schedule.json. Press Enter to continue..."

# Step 2: Start export capture
echo ""
echo "--- Step 2: Starting Export Capture ---"
echo "Capturing PayFlux export to payflux_export.jsonl..."
docker logs -f payflux-payflux-1 > payflux_export.jsonl 2>&1 &
CAPTURE_PID=$!
echo "Capture PID: $CAPTURE_PID"
sleep 2

# Step 3: Run full test
echo ""
echo "--- Step 3: Running Full Test (Live Ingestion) ---"
echo "This will take ~6-10 minutes (14 days compressed)..."
echo ""

go run cmd/test-runner/main.go \
  --key="$API_KEY" \
  --speed=3600 \
  --output=./test-outputs

echo ""
echo "✓ Ingestion complete"
echo ""

# Wait for processing
echo "Waiting 30 seconds for PayFlux to process events..."
sleep 30

# Stop export capture
echo "Stopping export capture..."
kill $CAPTURE_PID 2>/dev/null || true
sleep 2

# Step 4: Analyze results
echo ""
echo "--- Step 4: Analyzing Results ---"
go run cmd/test-analysis/main.go \
  --export=payflux_export.jsonl \
  --output=./test-outputs

echo ""
echo "=== TEST COMPLETE ==="
echo ""
echo "Results:"
echo "  - Analysis report: test-outputs/analysis_report.json"
echo "  - Summary: test-outputs/analysis_summary.txt"
echo "  - Export capture: payflux_export.jsonl"
echo ""
echo "View summary:"
echo "  cat test-outputs/analysis_summary.txt"
echo ""
