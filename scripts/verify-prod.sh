#!/bin/bash
set -euo pipefail

TARGET_URL="${TARGET_URL:-https://app.payflux.dev}"
CACHE_BUST="$(date +%s)"
NO_CACHE_HEADERS=(-H "Cache-Control: no-cache" -H "Pragma: no-cache")

echo "🔎 Verifying production at: $TARGET_URL"

# ----------------------------
# Test 1: /api/health/evidence must NEVER serve mock data in staging.
# It should:
#   - return 200 with real/degraded payload, OR
#   - return 500 with FIXTURE_PATH_VIOLATION ONLY if staging is misconfigured to load dev-fixtures
# Anything else is suspicious.
# ----------------------------
EVIDENCE_URL="$TARGET_URL/api/health/evidence?v=$CACHE_BUST"

HTTP_CODE="$(curl -sS -o /tmp/evidence_body.json -w "%{http_code}" "${NO_CACHE_HEADERS[@]}" "$EVIDENCE_URL" || true)"
BODY="$(cat /tmp/evidence_body.json 2>/dev/null || true)"

echo "→ /api/health/evidence status: $HTTP_CODE"

# If the poison pill ever triggers, it should be explicit
if [ "$HTTP_CODE" = "500" ]; then
  if echo "$BODY" | grep -q "FIXTURE_PATH_VIOLATION"; then
    echo "✅ PASS (Misconfig caught): poison pill fired (FIXTURE_PATH_VIOLATION)."
  else
    echo "❌ FAIL: 500 returned but not FIXTURE_PATH_VIOLATION. Body:"
    echo "$BODY"
    exit 1
  fi

elif [ "$HTTP_CODE" = "200" ]; then
  # Strong signals that mock/dev fixtures leaked (tune these to your fixture fingerprints)
  if echo "$BODY" | grep -Eqi "DEV_FIXTURE|fixture|mockData|\"system\"\s*:\s*\"fixture\""; then
    echo "❌ FAIL: Staging appears to be serving dev fixture data. Body:"
    echo "$BODY"
    exit 1
  fi

  # Basic sanity that it looks like the expected health shape
  if ! echo "$BODY" | grep -Eq "\"status\"|\"lastGoodAt\"|\"errorCounts\""; then
    echo "⚠️  WARN: /api/health/evidence returned 200 but payload doesn't look like health JSON. Body:"
    echo "$BODY"
    # not exiting, because some stacks wrap/transform; but this should trigger inspection
  else
    echo "✅ PASS: /api/health/evidence returned non-mock payload."
  fi

else
  echo "❌ FAIL: Unexpected HTTP status for /api/health/evidence: $HTTP_CODE"
  echo "$BODY"
  exit 1
fi

# ----------------------------
# Test 2: /dashboard-v2 gating behavior
#   200 => flag ON
#   404 => flag OFF (acceptable if you’re dark-launching)
# ----------------------------
DASH_URL="$TARGET_URL/dashboard-v2?v=$CACHE_BUST"
DASH_CODE="$(curl -sS -o /dev/null -w "%{http_code}" "${NO_CACHE_HEADERS[@]}" "$DASH_URL" || true)"

echo "→ /dashboard-v2 status: $DASH_CODE"

if [ "$DASH_CODE" = "200" ]; then
  echo "✅ PASS: /dashboard-v2 accessible (flag enabled)."
elif [ "$DASH_CODE" = "404" ]; then
  echo "✅ PASS: /dashboard-v2 gated (flag disabled / dark launch)."
else
  echo "❌ FAIL: Unexpected status $DASH_CODE on /dashboard-v2"
  exit 1
fi

echo "✅ All checks complete."
