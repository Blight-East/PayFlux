#!/usr/bin/env bash
set -euo pipefail

############################################
# PAYFLUX CANARY DEPLOY + AUTO ROLLBACK
############################################

APP="payflux"
CANARY="${APP}-canary"
COMPOSE="deploy/docker-compose.yml"
BINARY="payflux-prod"
PORT_MAIN=8080
PORT_CANARY=18080
HEALTH="/health"
METRICS="/metrics"
# Using snake_case keys as standardized in previous steps
APP="payflux"
CANARY="${APP}-canary"
COMPOSE="deploy/docker-compose.yml"
BINARY="payflux-prod"
PORT_MAIN=8080
PORT_CANARY=18080
HEALTH="/health"
METRICS="/metrics"
# Using snake_case keys as standardized in previous steps
LOG_KEYS=("tier_registry_loaded" "entitlements_registry_loaded" "enforcement_layer_ready")

############################################
rollback() {
  echo ""
  echo "⚠️ ROLLING BACK..."

  docker rm -f "$CANARY" >/dev/null 2>&1 || true

  if [[ -n "${PREVIOUS:-}" ]]; then
    # Check if it's running
    if ! docker ps -q --no-trunc | grep -q "$PREVIOUS"; then
         echo "Attempting to restart previous container $PREVIOUS..."
         docker start "$PREVIOUS" >/dev/null 2>&1 || true
         echo "↩ restored previous container"
    else
         echo "Previous container still running."
    fi
  else
    echo "no previous container found to restore"
  fi
}

fail() {
  echo "❌ DEPLOY FAILED: $1"
  if [ -n "${CANARY:-}" ]; then
    echo "📜 CANARY LOGS:"
    docker logs "$CANARY" 2>&1 | tail -n 20 || echo "No logs found"
  fi
  rollback
  exit 1
}

step(){ echo -e "\n▶ $1"; }

############################################
step "1. Preflight"
command -v docker >/dev/null || fail "docker missing"
command -v go >/dev/null || fail "go missing"
command -v curl >/dev/null || fail "curl missing"

############################################
step "2. Validate Code"
go vet ./... || fail "vet failed"
go test ./... || fail "tests failed"

############################################
step "3. Build Artifact"
go build -trimpath -ldflags="-s -w" -o "$BINARY" .
SHA=$(shasum -a 256 "$BINARY" | awk '{print $1}')
echo "Build SHA: $SHA"

############################################
step "4. Build Container"
docker compose -f "$COMPOSE" build --no-cache || fail "build failed"

############################################
step "5. Snapshot Current Running Container"
# Store the container ID of the currently running service, if any
PREVIOUS=$(docker compose -f "$COMPOSE" ps -q "$APP" || true)

############################################
step "6. Start Canary Instance"
# Start a separate container sharing the same network/db but on a different port
# We reuse the image built in step 4 (which is tagged latest by default)
# We need to ensure we use the image we just built.
IMAGE_NAME=$(docker compose -f "$COMPOSE" config | grep "image:" | awk '{print $2}' | head -n1)

# Run canary attached to the same network as the main service (usually deploy_default)
# We need to find the network name.
NETWORK=$(docker network ls --filter name=deploy_default --format "{{.Name}}" | head -n1)
if [ -z "$NETWORK" ]; then
    NETWORK="host" # Fallback if specific network not found, though deploy_default is expected
fi

# Ensure cleanup of any previous canary
docker rm -f "$CANARY" >/dev/null 2>&1 || true

docker run -d \
  --name "$CANARY" \
  --network "$NETWORK" \
  -p ${PORT_CANARY}:8080 \
  --env-file "deploy/.env" \
  -e REDIS_ADDR="redis:6379" \
  -e PAYFLUX_TIER_CONFIG_PATH=/app/config/tiers.runtime.json \
  "$IMAGE_NAME" \
  || fail "canary start failed"

# Wait for boot
echo "Waiting for canary boot..."
sleep 5

############################################
step "7. Canary Health Check"
# Retry loop
for i in {1..10}; do
  if curl -fs "http://localhost:${PORT_CANARY}${HEALTH}" >/dev/null; then
    echo "Canary healthy!"
    break
  fi
  echo "Waiting for health check ($i/10)..."
  sleep 2
done

# Final check
curl -fs "http://localhost:${PORT_CANARY}${HEALTH}" >/dev/null \
  || fail "canary health failed"

############################################
step "8. Canary Metrics Validation"
MET=$(curl -s "http://localhost:${PORT_CANARY}${METRICS}")
grep -q payflux_active_requests <<<"$MET" || fail "metric missing"
grep -q alerts_suppressed_total <<<"$MET" || fail "alert metric missing"

############################################
step "9. Canary Log Verification"
LOG=$(docker logs "$CANARY" 2>&1 || true)
for k in "${LOG_KEYS[@]}"; do
  grep -q "$k" <<<"$LOG" || fail "missing log: $k (Logs: $LOG)"
done

############################################
step "10. Promote Canary → Production"
# If we got here, canary is good.
# Scaledown/Update production service using the same image.
docker compose -f "$COMPOSE" down || fail "stop old failed"
docker compose -f "$COMPOSE" up -d || fail "start new failed"
sleep 3

############################################
step "11. Production Health Validation"
curl -fs "http://localhost:${PORT_MAIN}${HEALTH}" >/dev/null \
  || fail "production health failed"

############################################
step "12. Cleanup Canary"
docker rm -f "$CANARY" >/dev/null 2>&1 || true

############################################
step "SUCCESS"
echo "======================================"
echo "✅ DEPLOY COMPLETE"
echo "SHA: $SHA"
echo "Production: http://localhost:${PORT_MAIN}"
echo "======================================"
exit 0



