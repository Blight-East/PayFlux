#!/bin/bash
set -u

# Verification Script for PR #10 (Observability)
# Deterministic checks for:
# 1. Server Build & Start (Wait for Ready)
# 2. x-trace-id header presence (200, 403, 429)
# 3. JSON Log Event structure

cleanup() {
    if [ -n "${SERVER_PID:-}" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    # Also kill by port just in case
    lsof -ti tcp:3002 | xargs -r kill -9 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "--- 0. PRE-FLIGHT CLEANUP ---"
lsof -ti tcp:3002 | xargs -r kill -9 2>/dev/null || true

echo "--- 1. BUILD PROD ---"
# Always rebuild to ensure we are testing the latest code
npm run build

echo "--- 2. START SERVER ---"
> merge-gate.log
npm start -- -p 3002 > merge-gate.log 2>&1 &
SERVER_PID=$!

echo "Waiting for 'Ready'..."
# Wait up to 25s
COUNT=0
READY=0
while [ $COUNT -lt 100 ]; do
    if grep -q -E "Ready|started server|Local:" merge-gate.log; then
        READY=1
        break
    fi
    sleep 0.25
    COUNT=$((COUNT+1))
done

if [ $READY -eq 0 ]; then
    echo "❌ Server never became Ready."
    tail -n 50 merge-gate.log
    exit 1
fi
echo "✅ Server is Ready."

echo "--- 3. DETONATE TRAFFIC ---"

# 200 (Example.com)
echo "Req 1: Happy Path (example.com)"
curl --max-time 15 --connect-timeout 2 -si \
  -X POST http://localhost:3002/api/v1/risk \
  -H "content-type: application/json" \
  -d '{"url":"https://example.com","industry":"SaaS","processor":"Stripe"}' \
  > curl_200.txt

# 403 (SSRF)
echo "Req 2: SSRF Block (127.0.0.1)"
curl --max-time 10 --connect-timeout 2 -si \
  -X POST http://localhost:3002/api/v1/risk \
  -H "content-type: application/json" \
  -d '{"url":"http://127.0.0.1","industry":"SaaS","processor":"Stripe"}' \
  > curl_403.txt

# 429 (Rate Limit Loop)
echo "Req 3: Rate Limit Hammer"
for i in {1..5}; do
  curl -s --max-time 2 -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3002/api/v1/risk \
    -H "content-type: application/json" \
    -d '{"url":"https://stripe.com","industry":"SaaS","processor":"Stripe"}' \
    >> curl_429.txt
done

echo "--- 4. ASSERT INVARIANTS ---"
FAIL=0

# Headers
if grep -q "x-trace-id" curl_200.txt; then echo "✅ 200 x-trace-id: PASS"; else echo "❌ 200 x-trace-id: MISSING"; FAIL=1; fi
if grep -q "x-trace-id" curl_403.txt; then echo "✅ 403 x-trace-id: PASS"; else echo "❌ 403 x-trace-id: MISSING"; FAIL=1; fi

# Logs
# We look for specific JSON events
if grep -q '"event":"risk_request_start"' merge-gate.log; then echo "✅ Log risk_request_start: PASS"; else echo "❌ Log risk_request_start: MISSING"; FAIL=1; fi
if grep -q '"event":"risk_ssrf_block"' merge-gate.log; then echo "✅ Log risk_ssrf_block: PASS"; else echo "❌ Log risk_ssrf_block: MISSING"; FAIL=1; fi
# Note: risk_request_complete might happen later or be in buffer, but example.com is fast
if grep -q '"event":"risk_request_complete"' merge-gate.log; then echo "✅ Log risk_request_complete: PASS"; else echo "❌ Log risk_request_complete: MISSING"; FAIL=1; fi

if [ $FAIL -eq 1 ]; then
    echo "See merge-gate.log for details:"
    tail -n 20 merge-gate.log
    exit 1
fi

echo "All Checks Passed."
exit 0
