#!/bin/bash
# PayFlux Smoke Load Check
# Purpose: High-level sanity check for performance and stream processing.
# Requirements: hey (https://github.com/rakyll/hey), redis-cli

set -e

# Try to find 'hey' in common paths if not in PATH
if ! command -v hey &> /dev/null; then
    if [[ -f "/opt/homebrew/bin/hey" ]]; then
        PATH="/opt/homebrew/bin:$PATH"
    elif [[ -f "/usr/local/bin/hey" ]]; then
        PATH="/usr/local/bin:$PATH"
    fi
fi

if ! command -v hey &> /dev/null; then
  echo "❌ Error: 'hey' not found. Please install it: brew install hey"
  exit 1
fi

API_KEY=${PAYFLUX_API_KEY:-"test-key"}
ADDR=${PAYFLUX_ADDR:-"http://localhost:8080"}
STREAM=${PAYFLUX_STREAM:-"events_stream"}
GROUP=${PAYFLUX_GROUP:-"payment_consumers"}

echo "--- PayFlux Smoke Load Check ---"
echo "Target: $ADDR"
echo "Concurrent: 50, Total: 10000"

# 1. Warm up metadata (Stripe intent etc)
echo "Warming up..."
curl -s -X POST "$ADDR/v1/events/payment_exhaust" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"warmup","event_id":"warmup-001","processor":"stripe"}' > /dev/null

# 2. Run load with 'hey'
echo "Firing 10k events..."
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
hey -n 10000 -c 50 -m POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"event_type\":\"smoke_test\",\"processor\":\"stripe\",\"event_id\":\"550e8400-e29b-41d4-a716-446655440027\",\"event_timestamp\":\"$NOW\"}" \
  "$ADDR/v1/events/payment_exhaust"

echo "Load complete. Waiting for drain..."
sleep 2

# 3. Verify Redis Stream state
PENDING=$(redis-cli XPENDING "$STREAM" "$GROUP" | awk 'NR==1{print $1}')

echo "--- Results ---"
if [[ "$PENDING" == "0" ]]; then
  echo "✅ SUCCESS: All 10k events processed (Pending = 0)"
  exit 0
else
  echo "❌ FAILURE: $PENDING messages still pending in stream!"
  exit 1
fi
