#!/bin/bash

BASE_URL="http://localhost:3000/api/v1/risk"

echo "=================================================="
echo "TEST 1: SSRF doesn't burn tokens (IP: 10.0.0.1)"
echo "Expected: Always 403. Rate headers should NOT decrement tokens."
echo "=================================================="

for i in {1..5}; do
  # Use a blocked IP directly in the body to trigger SSRF check
  # We use x-forwarded-for to separate this test's rate limit bucket
  output=$(curl -s -D - -o /dev/null "$BASE_URL" \
    -H "content-type: application/json" \
    -H "x-forwarded-for: 10.0.0.1" \
    -d '{"url":"http://127.0.0.1","industry":"SaaS / Software","processor":"Stripe"}')
  
  echo "req $i:"
  echo "$output" | egrep -i 'HTTP/|x-rate-limit-|x-cache|x-risk-inflight'
  echo "-----"
done

echo ""
echo "=================================================="
echo "TEST 2: Token bucket behavior (Cap=3) (IP: 10.0.0.2)"
echo "Expected: 3x 200, 4th 429. Reset ~60s on 429."
echo "=================================================="

for i in {1..5}; do
  output=$(curl -s -D - -o /dev/null "$BASE_URL" \
    -H "content-type: application/json" \
    -H "x-forwarded-for: 10.0.0.2" \
    -d '{"url":"https://stripe.com","industry":"SaaS / Software","processor":"Stripe"}')
    
  echo "req $i:"
  echo "$output" | egrep -i 'HTTP/|x-rate-limit-|x-cache|x-risk-inflight'
  echo "-----"
done

echo ""
echo "=================================================="
echo "TEST 3: Cache hit proves 'no fetch' (IP: 10.0.0.3)"
echo "Expected: 1st Miss, 2nd Hit."
echo "=================================================="

# Req 1
echo "Req 1 (Warmup):"
curl -s -D - -o /dev/null "$BASE_URL" \
  -H "content-type: application/json" \
  -H "x-forwarded-for: 10.0.0.3" \
  -d '{"url":"https://example.com","industry":"SaaS","processor":"Stripe"}' \
| egrep -i 'HTTP/|x-cache|x-risk-inflight|x-rate-limit-'

# Req 2
echo "Req 2 (Hit):"
curl -s -D - -o /dev/null "$BASE_URL" \
  -H "content-type: application/json" \
  -H "x-forwarded-for: 10.0.0.3" \
  -d '{"url":"https://example.com","industry":"SaaS","processor":"Stripe"}' \
| egrep -i 'HTTP/|x-cache|x-risk-inflight|x-rate-limit-'

echo ""
echo "=================================================="
echo "TEST 4: Concurrency dedupe (IP: 10.0.0.4)"
echo "Expected: 1 x-risk-inflight: new, others deduped."
echo "=================================================="

# Use a fresh URL/IP to ensure no cache hits interfere?
# We need to hit a slow-ish endpoint or just rely on concurrency. 
# Stripe.com takes a bit.
# We'll use xargs for parallel requests.

seq 1 8 | xargs -n1 -P8 -I{} curl -s -D - -o /dev/null "$BASE_URL" \
  -H "content-type: application/json" \
  -H "x-forwarded-for: 10.0.0.4" \
  -d '{"url":"https://paypal.com","industry":"SaaS","processor":"Paypal"}' \
| egrep -i 'HTTP/|x-risk-inflight|x-cache' | sort | uniq -c

echo ""
echo "Done."
