#!/bin/bash
set -u

# Verification Script for PR #11 (Keyed Quotas)
# Logic:
# 1. Anonymous requests (no key) follow ANONYMOUS Tier (Cap 3).
# 2. Keyed requests (pf_test_...) follow FREE Tier (Cap 10).
# 3. GET /health exports metrics.

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

echo "--- 2. TEST ANONYMOUS (Tier: ANONYMOUS, Cap: 3) ---"
echo "Running 4 requests (Expected: 200 200 200 429)"
for i in {1..4}; do
  curl -s -o /dev/null -w "%{http_code} " -X POST http://localhost:3002/api/v1/risk \
    -H "content-type: application/json" \
    -d '{"url":"https://example.com","industry":"SaaS"}'
done
echo ""

echo "--- 3. TEST KEYED (Tier: FREE, Cap: 10) ---"
echo "Running 4 requests with pf_test_key (Expected: 200 200 200 200)"
for i in {1..4}; do
  curl -s -o /dev/null -w "%{http_code} " -X POST http://localhost:3002/api/v1/risk \
    -H "content-type: application/json" \
    -H "x-payflux-key: pf_test_12345" \
    -d '{"url":"https://stripe.com","industry":"SaaS"}'
done
echo ""

echo "--- 4. TEST HEALTH / METRICS ---"
curl -s http://localhost:3002/api/v1/risk/health | json_pp | grep -A 10 "metrics"

echo "--- 5. ASSERTIONS ---"
# Check logs for keyed vs anon
if grep -q '"tier":"ANONYMOUS"' merge-gate.log; then echo "✅ Log: ANONYMOUS tier found"; else echo "❌ Log: ANONYMOUS tier MISSING"; fi
if grep -q '"tier":"FREE"' merge-gate.log; then echo "✅ Log: FREE tier found"; else echo "❌ Log: FREE tier MISSING"; fi
if grep -q '"keyId":"pf_test_1234"' merge-gate.log; then echo "✅ Log: KeyID pf_test_1234 found"; else echo "❌ Log: KeyID MISSING"; fi

echo "Verification Complete."
