#!/bin/bash
set -euo pipefail

# Default to production if not set
TARGET_URL="${TARGET_URL:-https://app.payflux.dev}"
API_KEY="${2:-dev-secret-key}" # Optionally pass key as 2nd arg
CACHE_BUST="$(date +%s)"
NO_CACHE_HEADERS=(-H "Cache-Control: no-cache" -H "Pragma: no-cache")

echo "🔎 Verifying provenance at: $TARGET_URL"

PROVENANCE_URL="$TARGET_URL/api/debug/build?v=$CACHE_BUST"

# 1. Check Unauthenticated (Should fail if prod, might pass if dev)
# We expect 401 in prod
HTTP_CODE_UNAUTH="$(curl -sS -o /dev/null -w "%{http_code}" "${NO_CACHE_HEADERS[@]}" "$PROVENANCE_URL" || true)"

if [ "$HTTP_CODE_UNAUTH" = "401" ]; then
    echo "✅ PASS: Provenance endpoint is guarded (401 without key)."
elif [ "$HTTP_CODE_UNAUTH" = "200" ]; then
     # This is acceptable ONLY if we are hitting localhost dev
     if [[ "$TARGET_URL" == *"localhost"* ]]; then
        echo "⚠️  WARN: Provenance endpoint is open (Acceptable for localhost dev)."
     else
        echo "❌ FAIL: Provenance endpoint is OPEN in production!"
        exit 1
     fi
else
    echo "⚠️  WARN: Unexpected status for unauth provenance: $HTTP_CODE_UNAUTH"
fi

# 2. Check Authenticated
HTTP_CODE_AUTH="$(curl -sS -o /tmp/provenance.json -w "%{http_code}" "${NO_CACHE_HEADERS[@]}" -H "Authorization: Bearer $API_KEY" "$PROVENANCE_URL" || true)"
BODY="$(cat /tmp/provenance.json 2>/dev/null || true)"

if [ "$HTTP_CODE_AUTH" = "200" ]; then
    echo "✅ PASS: Provenance endpoint accessible with key."
    echo "   Receipt: $BODY"
    
    # Check for gitSha key
    if echo "$BODY" | grep -q "gitSha"; then
         echo "✅ PASS: Receipt contains gitSha."
    else
         echo "❌ FAIL: Receipt missing gitSha."
         exit 1
    fi
else
    echo "❌ FAIL: Could not access provenance with key. Status: $HTTP_CODE_AUTH"
    echo "$BODY"
    exit 1
fi
