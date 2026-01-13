#!/bin/bash
# PayFlux Dashboard Smoke Test
# Usage: ./scripts/smoke.sh [DASHBOARD_URL]

URL=${1:-"http://localhost:3000"}
echo "Running smoke tests against $URL"

# 1. Health check (via proxy)
echo "Testing PayFlux health proxy..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL/api/proxy/health")
if [ "$STATUS" == "200" ]; then
    echo "✅ Health proxy OK"
else
    echo "❌ Health proxy FAILED (HTTP $STATUS)"
fi

# 2. Auth check (Login)
echo "Testing Admin Login..."
LOGIN_STATUS=$(curl -s -X POST "$URL/api/login" \
    -H "Content-Type: application/json" \
    -d "{\"token\":\"payflux-admin-token\"}" \
    -o /dev/null -w "%{http_code}")

if [ "$LOGIN_STATUS" == "200" ]; then
    echo "✅ Admin login OK"
else
    echo "❌ Admin login FAILED (HTTP $LOGIN_STATUS)"
fi

# 3. Webhook forwarding
echo "Testing Webhook forwarding..."
WEBHOOK_STATUS=$(curl -s -X POST "$URL/api/webhooks/stripe/test" -o /dev/null -w "%{http_code}")
if [ "$WEBHOOK_STATUS" == "200" ]; then
    echo "✅ Webhook test trigger OK"
else
    echo "❌ Webhook test trigger FAILED (HTTP $WEBHOOK_STATUS)"
fi

# 4. Status API
echo "Testing Status API..."
STATUS_JSON=$(curl -s "$URL/api/status")
if [[ $STATUS_JSON == *"lastEventAt"* ]]; then
    echo "✅ Status API OK"
else
    echo "❌ Status API FAILED (Response: $STATUS_JSON)"
fi

echo "Smoke test complete."
