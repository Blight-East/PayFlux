#!/bin/bash
# TPV Coverage Runtime Verification Script

set -e

echo "=== TPV Coverage Runtime Verification ==="
echo

# Config
PAYFLUX_API_KEY=${PAYFLUX_API_KEY:-"test-key"}
PAYFLUX_URL=${PAYFLUX_URL:-"http://localhost:8080"}
TEST_MERCHANT_HASH="abc123def456"  # Test merchant hash
TEST_MONTH=$(date +%Y-%m)

echo "1. Starting PayFlux with test configuration..."
echo "   (Assumes PayFlux is running with PAYFLUX_MONTHLY_TPV_LIMIT_CENTS=100000)"
echo

# Receipt A: Check Stripe forwarder payload structure
echo "=== RECEIPT A: Forwarder Payload Structure ==="#
echo "Checking PayFluxEvent struct includes amount_cents and currency..."
grep -A 2 "AmountCents.*int64" examples/stripe-webhook-forwarder/main.go
grep -A 2 "Currency.*string" examples/stripe-webhook-forwarder/main.go
echo "✓ Forwarder struct includes raw amount fields"
echo

# Receipt B: Redis TPV Increment Test
echo "=== RECEIPT B: Redis TPV Increment Test ==="#
echo "Sending two test events: 50,000 + 25,000 cents"
echo

# Event 1: 50,000 cents
curl -s -X POST "$PAYFLUX_URL/v1/events/payment_exhaust" \
  -H "Authorization: Bearer $PAYFLUX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "payment_intent.payment_failed",
    "event_timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "event_id": "'$(uuidgen)'",
    "merchant_id_hash": "'"$TEST_MERCHANT_HASH"'",
    "payment_intent_id_hash": "pi_test_001",
    "processor": "stripe",
    "failure_category": "card_declined",
    "retry_count": 0,
    "geo_bucket": "US",
    "amount_bucket": "medium",
    "amount_cents": 50000,
    "currency": "USD",
    "system_source": "test_script",
    "payment_method_bucket": "card",
    "channel": "web",
    "retry_result": "fail",
    "failure_origin": "processor"
  }' || echo "Event 1 failed"

sleep 1

# Event 2: 25,000 cents  
curl -s -X POST "$PAYFLUX_URL/v1/events/payment_exhaust" \
  -H "Authorization: Bearer $PAYFLUX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "payment_intent.payment_failed",
    "event_timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "event_id": "'$(uuidgen)'",
    "merchant_id_hash": "'"$TEST_MERCHANT_HASH"'",
    "payment_intent_id_hash": "pi_test_002",
    "processor": "stripe",
    "failure_category": "insufficient_funds",
    "retry_count": 0,
    "geo_bucket": "US",
    "amount_bucket": "low",
    "amount_cents": 25000,
    "currency": "USD",
    "system_source": "test_script",
    "payment_method_bucket": "card",
    "channel": "web",
    "retry_result": "fail",
    "failure_origin": "processor"
  }' || echo "Event 2 failed"

echo
echo "Checking Redis key: merchant:$TEST_MERCHANT_HASH:tpv:$TEST_MONTH"
redis-cli GET "merchant:$TEST_MERCHANT_HASH:tpv:$TEST_MONTH" || echo "(Redis not accessible locally)"
echo

# Receipt C: Latch Behavior Test
echo "=== RECEIPT C: Warning Latch Behavior ===#"
echo "Note: This requires PAYFLUX_MONTHLY_TPV_LIMIT_CENTS=100000 and PAYFLUX_PILOT_MODE=true"
echo
echo "With limit=100,000:"
echo "  - 75,000 cents = 75% (no warning)"
echo "  - Need 80,000+ cents for 80% warning"
echo "  - Need 100,000+ cents for 100% warning"
echo
echo "Checking latch keys:"
redis-cli GET "merchant:$TEST_MERCHANT_HASH:tpvwarn80:$TEST_MONTH" || echo "80% latch not set (expected if <80%)"
redis-cli GET "merchant:$TEST_MERCHANT_HASH:tpvwarn100:$TEST_MONTH" || echo "100% latch not set (expected if <100%)"
echo

# Receipt D: Coverage Endpoint Test
echo "=== RECEIPT D: Coverage Endpoint Test ==="#
echo
echo "Test 1: Missing merchant_id_hash (should return 400)"
curl -s -w "\nHTTP Status: %{http_code}\n" "$PAYFLUX_URL/v1/coverage" \
  -H "Authorization: Bearer $PAYFLUX_API_KEY"
echo

echo "Test 2: With merchant_id_hash (should return usage data)"
curl -s -w "\nHTTP Status: %{http_code}\n" "$PAYFLUX_URL/v1/coverage?merchant_id_hash=$TEST_MERCHANT_HASH" \
  -H "Authorization: Bearer $PAYFLUX_API_KEY" | jq '.' || cat
echo

echo "=== Verification Complete ==="
