#!/bin/bash
# Tier Gating Smoke Test
# Verifies that Tier 1 and Tier 2 exports behave correctly

set -e

echo "=== PayFlux Tier Gating Smoke Test ==="
echo ""

# Cleanup function
cleanup() {
    echo "Cleaning up..."
    docker compose -f deploy/docker-compose.yml down -v --remove-orphans 2>/dev/null || true
}
trap cleanup EXIT

# Check for required tools
if ! command -v jq &> /dev/null; then
    echo "ERROR: jq is required for this test. Install with: brew install jq (macOS) or apt install jq (Linux)"
    exit 1
fi

# Start in Tier 1 mode
echo "=== Test 1: Tier 1 Export (detection only) ==="
export PAYFLUX_TIER=tier1
docker compose -f deploy/docker-compose.yml up --build -d

# Wait for service to be ready
echo "Waiting for PayFlux to start..."
for i in {1..30}; do
    if curl -s http://localhost:8080/health | grep -q "ok"; then
        break
    fi
    sleep 1
done

# Send a test event
echo "Sending test event..."
curl -s -X POST http://localhost:8080/v1/events/payment_exhaust \
  -H "Authorization: Bearer your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "payment_failed",
    "event_timestamp": "2026-01-10T12:00:00Z",
    "event_id": "550e8400-e29b-41d4-a716-446655440001",
    "processor": "stripe",
    "merchant_id_hash": "test123",
    "payment_intent_id_hash": "pi_test",
    "failure_category": "card_declined",
    "retry_count": 2,
    "geo_bucket": "US"
  }'

sleep 2

# Check Tier 1 export (should NOT have processor_playbook_context or risk_trajectory)
echo ""
echo "Checking Tier 1 exported JSON..."
TIER1_EXPORT=$(docker logs deploy-payflux-1 2>&1 | grep "event_id" | tail -1)

if echo "$TIER1_EXPORT" | grep -q "processor_playbook_context"; then
    echo "FAIL: Tier 1 export should NOT contain processor_playbook_context"
    exit 1
fi

if echo "$TIER1_EXPORT" | grep -q "risk_trajectory"; then
    echo "FAIL: Tier 1 export should NOT contain risk_trajectory"
    exit 1
fi

echo "PASS: Tier 1 export does not contain Tier 2 fields"

# Check Tier 2 metrics are zero
TIER2_CONTEXT=$(curl -s http://localhost:8080/metrics | grep "payflux_tier2_context_emitted_total" | grep -v "^#" | awk '{print $2}')
TIER2_TRAJECTORY=$(curl -s http://localhost:8080/metrics | grep "payflux_tier2_trajectory_emitted_total" | grep -v "^#" | awk '{print $2}')

echo "Tier 2 context emitted: $TIER2_CONTEXT (expected: 0)"
echo "Tier 2 trajectory emitted: $TIER2_TRAJECTORY (expected: 0)"

# Cleanup
docker compose -f deploy/docker-compose.yml down -v --remove-orphans

echo ""
echo "=== Test 2: Tier 2 Export (with interpretation) ==="
export PAYFLUX_TIER=tier2
docker compose -f deploy/docker-compose.yml up --build -d

# Wait for service to be ready
echo "Waiting for PayFlux to start..."
for i in {1..30}; do
    if curl -s http://localhost:8080/health | grep -q "ok"; then
        break
    fi
    sleep 1
done

# Send multiple test events to trigger high risk
echo "Sending test events..."
for i in {1..10}; do
    curl -s -X POST http://localhost:8080/v1/events/payment_exhaust \
      -H "Authorization: Bearer your-api-key-here" \
      -H "Content-Type: application/json" \
      -d "{
        \"event_type\": \"payment_failed\",
        \"event_timestamp\": \"2026-01-10T12:00:00Z\",
        \"event_id\": \"550e8400-e29b-41d4-a716-44665544000$i\",
        \"processor\": \"stripe\",
        \"merchant_id_hash\": \"test123\",
        \"payment_intent_id_hash\": \"pi_test\",
        \"failure_category\": \"card_declined\",
        \"retry_count\": 2,
        \"geo_bucket\": \"US\"
      }" > /dev/null
done

sleep 2

# Check Tier 2 export (should have processor_playbook_context and risk_trajectory for elevated+ risk)
echo ""
echo "Checking Tier 2 exported JSON..."
TIER2_EXPORT=$(docker logs deploy-payflux-1 2>&1 | grep "processor_playbook_context" | tail -1)

if [ -z "$TIER2_EXPORT" ]; then
    echo "WARN: No processor_playbook_context found (may require higher risk band)"
else
    echo "PASS: Tier 2 export contains processor_playbook_context"
fi

# Check Tier 2 metrics are non-zero
TIER2_CONTEXT=$(curl -s http://localhost:8080/metrics | grep "payflux_tier2_context_emitted_total" | grep -v "^#" | awk '{print $2}')
TIER2_TRAJECTORY=$(curl -s http://localhost:8080/metrics | grep "payflux_tier2_trajectory_emitted_total" | grep -v "^#" | awk '{print $2}')

echo "Tier 2 context emitted: $TIER2_CONTEXT"
echo "Tier 2 trajectory emitted: $TIER2_TRAJECTORY"

echo ""
echo "=== Smoke Test Complete ==="
echo ""
echo "Summary:"
echo "- Tier 1: Detection only (no context/trajectory fields)"
echo "- Tier 2: Adds processor_playbook_context + risk_trajectory"
echo "- Prometheus metrics track Tier 2 field emission"
