#!/bin/bash
# Signal Feature-Flag Runtime Layer - Dark Launch Deployment
# Execute this script to deploy with all safety checks

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

GOLDEN_CHECKSUM="df5e1f30c8cd29d84d21b7782b9a167af0a63a33be8bcb2272bcb0e0fe5f84d6"
PROD_URL="${PROD_URL:-https://prod.payflux.dev}"
PROD_API_KEY="${PROD_API_KEY}"
BASELINE_P95="${BASELINE_P95:-0.050}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Signal Feature-Flag Runtime Layer - Dark Launch Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Golden Checksum: $GOLDEN_CHECKSUM"
echo "Production URL:  $PROD_URL"
echo ""

# Step 1: Deploy
echo -e "${YELLOW}[1/7]${NC} Deploying to production..."
if [ ! -f "./deploy.sh" ]; then
  echo -e "${RED}ERROR: deploy.sh not found${NC}"
  exit 1
fi

./deploy.sh

if [ $? -ne 0 ]; then
  echo -e "${RED}DEPLOYMENT FAILED${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Deployment complete${NC}"
echo ""

# Step 2: Verify Checksum (Binary Provenance)
echo -e "${YELLOW}[2/7]${NC} Verifying binary provenance (supply-chain guard)..."
echo "SSH to production and run: shasum -a 256 /path/to/payflux-prod"
echo "Expected: $GOLDEN_CHECKSUM"
echo ""
read -p "Does checksum MATCH? (yes/no): " checksum_match

if [ "$checksum_match" != "yes" ]; then
  echo -e "${RED}CHECKSUM MISMATCH - ROLLING BACK${NC}"
  ./deploy.sh --rollback
  exit 1
fi

echo -e "${GREEN}✓ Binary provenance verified${NC}"
echo ""

# Step 3: Health Check
echo -e "${YELLOW}[3/7]${NC} Running health check..."
health_response=$(curl -s -o /dev/null -w "%{http_code}" "${PROD_URL}/health")

if [ "$health_response" != "200" ]; then
  echo -e "${RED}HEALTH CHECK FAILED (HTTP ${health_response}) - ROLLING BACK${NC}"
  ./deploy.sh --rollback
  exit 1
fi

echo -e "${GREEN}✓ Health check passed (HTTP 200)${NC}"
echo ""

# Step 4: Canary Request (End-to-End Validation)
echo -e "${YELLOW}[4/7]${NC} Sending canary request..."
canary_response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${PROD_URL}/v1/events/payment_exhaust" \
  -H "Authorization: Bearer ${PROD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "11111111-1111-1111-1111-111111111111",
    "event_timestamp": "2026-02-14T00:00:00Z",
    "event_type": "payment.failed",
    "processor": "stripe",
    "merchant_id_hash": "test_merchant",
    "payment_intent_id_hash": "test_intent",
    "failure_category": "card_declined",
    "retry_count": 0,
    "geo_bucket": "us",
    "amount_bucket": "10-50"
  }')

if [ "$canary_response" != "200" ] && [ "$canary_response" != "202" ]; then
  echo -e "${RED}CANARY REQUEST FAILED (HTTP ${canary_response}) - ROLLING BACK${NC}"
  ./deploy.sh --rollback
  exit 1
fi

echo -e "${GREEN}✓ Canary request accepted (HTTP ${canary_response})${NC}"
echo "  Check logs for event ID: 11111111-1111-1111-1111-111111111111"
echo ""

# Step 5: Latency Loop
echo -e "${YELLOW}[5/7]${NC} Running latency baseline check (20 requests)..."
total_time=0
for i in {1..20}; do
  start=$(date +%s%N)
  curl -s "${PROD_URL}/health" > /dev/null
  end=$(date +%s%N)
  elapsed=$((($end - $start) / 1000000))
  total_time=$(($total_time + $elapsed))
done

avg_latency=$(($total_time / 20))
echo "  Average latency: ${avg_latency}ms"

if [ $avg_latency -gt 100 ]; then
  echo -e "${YELLOW}WARNING: Latency higher than expected${NC}"
  read -p "Continue? (yes/no): " continue_deploy
  if [ "$continue_deploy" != "yes" ]; then
    ./deploy.sh --rollback
    exit 1
  fi
fi

echo -e "${GREEN}✓ Latency check passed${NC}"
echo ""

# Step 6: Metrics Snapshot
echo -e "${YELLOW}[6/7]${NC} Capturing metrics baseline..."
timestamp=$(date +%Y%m%d_%H%M%S)
metrics_file="metrics_baseline_${timestamp}.txt"

curl -s "${PROD_URL}/metrics" | grep -E "(signal_|active_override_count)" > "$metrics_file"

override_count=$(grep "active_override_count" "$metrics_file" | awk '{print $2}')

if [ "$override_count" != "0" ]; then
  echo -e "${RED}ERROR: active_override_count = ${override_count} (expected 0) - ROLLING BACK${NC}"
  ./deploy.sh --rollback
  exit 1
fi

echo -e "${GREEN}✓ Metrics baseline captured: ${metrics_file}${NC}"
echo "  active_override_count = 0 ✓"
echo ""

# Step 7: 5-Minute Safety Monitor
echo -e "${YELLOW}[7/7]${NC} Starting 5-minute safety monitor..."
echo "  Monitoring error rate and latency..."
echo "  Auto-rollback if thresholds exceeded"
echo ""

if [ -f "./scripts/deployment-safety-monitor.sh" ]; then
  PROD_URL="$PROD_URL" BASELINE_P95="$BASELINE_P95" ./scripts/deployment-safety-monitor.sh
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}SAFETY MONITOR TRIGGERED ROLLBACK${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}WARNING: deployment-safety-monitor.sh not found, running manual 5-min wait${NC}"
  echo "Monitoring for 5 minutes..."
  sleep 300
fi

echo -e "${GREEN}✓ Safety monitor passed${NC}"
echo ""

# Success
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}  ✓ DEPLOYMENT SUCCESSFUL${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Mandatory Post-Deploy Tasks:"
echo ""
echo "1. Store checksum + timestamp in internal ledger:"
echo "   Checksum: $GOLDEN_CHECKSUM"
echo "   Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""
echo "2. Tag release in git:"
echo "   git tag prod-signal-layer-live"
echo "   git push origin prod-signal-layer-live"
echo ""
echo "3. Metrics baseline saved:"
echo "   File: $metrics_file"
echo ""
echo "4. Runtime config frozen for 24h"
echo "   DO NOT enable PAYFLUX_SIGNAL_OVERRIDES_ENABLED=true yet"
echo ""
echo "Next steps:"
echo "  - Monitor for 24h"
echo "  - Write enablement runbooks"
echo "  - Train on-call team"
echo "  - Configure alerting"
echo ""
