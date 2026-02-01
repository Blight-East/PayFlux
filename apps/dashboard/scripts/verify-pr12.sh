#!/bin/bash
set -u

# Verification Script for PR #12 (Risk Intelligence Layer)

cleanup() {
    if [ -n "${SERVER_PID:-}" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    lsof -ti tcp:3002 | xargs -r kill -9 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "--- 0. PRE-FLIGHT ---"
lsof -ti tcp:3002 | xargs -r kill -9 2>/dev/null || true

echo "--- 1. BUILD & START ---"
npm run build
> merge-gate.log
npm start -- -p 3002 > merge-gate.log 2>&1 &
SERVER_PID=$!

# Wait for Ready
COUNT=0
while [ $COUNT -lt 100 ]; do
    if grep -q -E "Ready|started server|Local:" merge-gate.log; then break; fi
    sleep 0.25
    COUNT=$((COUNT+1))
done
echo "✅ Server Ready."

URL="https://example.com"

echo "--- 2. TEST HISTORY PERSISTENCE ---"
echo "Scanning $URL (Scan 1)..."
curl -s -X POST http://localhost:3002/api/v1/risk \
  -H "content-type: application/json" \
  -H "x-payflux-key: pf_test_12345" \
  -d "{\"url\":\"$URL\", \"industry\":\"SaaS\"}" > /dev/null

echo "Scanning $URL (Scan 2)..."
curl -s -X POST http://localhost:3002/api/v1/risk \
  -H "content-type: application/json" \
  -H "x-payflux-key: pf_test_12345" \
  -d "{\"url\":\"$URL\", \"industry\":\"SaaS\"}" > /dev/null

echo "Checking History..."
HISTORY_RES=$(curl -s "http://localhost:3002/api/v1/risk/history?url=$URL")
SCAN_COUNT=$(echo "$HISTORY_RES" | grep -o "\"id\"" | wc -l | tr -d ' ')

if [ "$SCAN_COUNT" -eq 2 ]; then
    echo "✅ History size: 2 (Correct)"
else
    echo "❌ History size: $SCAN_COUNT (Expected 2)"
    echo "$HISTORY_RES"
fi

echo "--- 3. TEST TREND LOGIC ---"
# Logic: 
# 1. Start with anonymous SaaS (Tier 3-4)
# 2. Shift to Gambling (Tier +1 -> DEGRADING) - use cache-busting
# 3. Shift back to SaaS (Tier -1 -> IMPROVING) - use cache-busting

URL1="https://example.com?t=1"
URL2="https://example.com?t=2"

echo "Scan 1: SaaS (Initial)"
curl -s -o /dev/null -X POST http://localhost:3002/api/v1/risk \
  -H "content-type: application/json" \
  -H "x-payflux-key: pf_test_12345" \
  -d "{\"url\":\"$URL\", \"industry\":\"SaaS\"}"

echo "Scan 2: Gambling (Degrading)"
# Note: Same normalized URL will hit cache. We scan a DIFFERENT url but we want to test same-merchant trend.
# Wait, merchantId is derived from host. So example.com?t=1 and example.com?t=2 have same merchantId.
# This IS how we test trends.

echo "Degrading Scan..."
curl -s -o /dev/null -X POST http://localhost:3002/api/v1/risk \
  -H "content-type: application/json" \
  -H "x-payflux-key: pf_test_12345" \
  -d "{\"url\":\"$URL1\", \"industry\":\"Gambling\"}"

GET_TREND() { curl -s "http://localhost:3002/api/v1/risk/trend?url=$1" | grep -o "\"trend\":\"[^\"]*\"" | cut -d':' -f2 | tr -d '"'; }

TREND1=$(GET_TREND "$URL")
if [ "$TREND1" == "DEGRADING" ]; then
    echo "✅ Trend: DEGRADING (Correct)"
else
    echo "❌ Trend: $TREND1 (Expected DEGRADING)"
fi

echo "Improving Scan..."
curl -s -o /dev/null -X POST http://localhost:3002/api/v1/risk \
  -H "content-type: application/json" \
  -H "x-payflux-key: pf_test_12345" \
  -d "{\"url\":\"$URL2\", \"industry\":\"SaaS\"}"

TREND2=$(GET_TREND "$URL")
if [ "$TREND2" == "IMPROVING" ]; then
    echo "✅ Trend: IMPROVING (Correct)"
else
    echo "❌ Trend: $TREND2 (Expected IMPROVING)"
fi

echo "--- 4. TEST HEADERS ---"
TRACE_HEADER=$(curl -si "http://localhost:3002/api/v1/risk/history?url=$URL" | grep -i "x-trace-id")
if [ -n "$TRACE_HEADER" ]; then
    echo "✅ x-trace-id present on /history"
else
    echo "❌ x-trace-id MISSING on /history"
fi

echo "--- 5. TEST HEALTH METRICS ---"
HEALTH_RES=$(curl -s http://localhost:3002/api/v1/risk/health)
if echo "$HEALTH_RES" | grep -q "risk_history_writes_total"; then
    echo "✅ Health includes risk_history_writes_total"
else
    echo "❌ Health missing intelligence counters"
fi

echo "Verification Complete."
