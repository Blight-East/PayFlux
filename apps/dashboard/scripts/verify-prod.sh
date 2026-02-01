#!/bin/bash

BASE_URL="https://app.payflux.dev/api/v1/risk"

echo "Target: $BASE_URL"

# 1. 200 OK Check
echo "--- 1. Happy Path ---"
curl -s -D - --max-time 20 --connect-timeout 5 -X POST "$BASE_URL" \
  -H "content-type: application/json" \
  -d '{"url":"https://example.com","industry":"SaaS / Software","processor":"Stripe"}' \
  | grep -iE 'HTTP/|x-trace-id|aiProvider'

# 2. SSRF Check
echo -e "\n--- 2. SSRF Check ---"
curl -s -D - --max-time 10 --connect-timeout 5 -X POST "$BASE_URL" \
  -H "content-type: application/json" \
  -d '{"url":"http://127.0.0.1","industry":"SaaS / Software","processor":"Stripe"}' \
  | grep -iE 'HTTP/|x-trace-id'

# 3. Rate Limit Check
echo -e "\n--- 3. Rate Limit Check ---"
for i in {1..4}; do
  curl -s -o /dev/null --max-time 5 --connect-timeout 2 -w "%{http_code} " \
    -X POST "$BASE_URL" \
    -H "content-type: application/json" \
    -d '{"url":"https://stripe.com","industry":"SaaS / Software","processor":"Stripe"}'
done
echo ""

# Inspect 429
echo -e "\n--- 429 Header Inspection ---"
curl -s -D - --max-time 10 --connect-timeout 5 -X POST "$BASE_URL" \
  -H "content-type: application/json" \
  -d '{"url":"https://stripe.com","industry":"SaaS / Software","processor":"Stripe"}' \
  | grep -iE 'HTTP/|x-trace-id|x-rate-limit-reset'

