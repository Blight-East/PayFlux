#!/usr/bin/env bash
set -euo pipefail

echo "=== PAYFLUX PRODUCTION DEPLOY START ==="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_NAME="payflux"
BINARY="payflux-prod"
CONFIG_FILE="config/tier_entitlements.runtime.json"
export COMPOSE_FILE="deploy/docker-compose.yml"
REQUIRED_LOGS=(
  "tier_registry_loaded"
  "entitlements_registry_loaded"
  "enforcement_layer_ready"
)

function fail() {
  echo "❌ DEPLOY FAILED: $1"
  exit 1
}

function step() {
  echo ""
  echo "▶ $1"
}

############################################
step "1. Preflight Checks"

command -v go >/dev/null || fail "Go not installed"
command -v docker >/dev/null || fail "Docker not installed"
command -v curl >/dev/null || fail "curl not installed"

[ -f "go.mod" ] || fail "go.mod not found"
[ -f "$CONFIG_FILE" ] || fail "$CONFIG_FILE missing"

echo "✔ Environment OK"

############################################
step "2. Static Build Validation"

go vet ./... || fail "go vet failed"
go test ./... || fail "tests failed"

echo "✔ Code validated"

############################################
step "3. Build Binary"

go build -trimpath -ldflags="-s -w" -o "$BINARY" .
[ -f "$BINARY" ] || fail "binary build failed"

SHA=$(shasum -a 256 "$BINARY" | awk '{print $1}')
echo "✔ Binary built"
echo "Checksum: $SHA"

############################################
step "4. Docker Build"

docker compose build --no-cache || fail "docker build failed"
echo "✔ Container built"

############################################
step "5. Restart Containers"

docker compose down
docker compose up -d || fail "container startup failed"

sleep 3

docker compose ps

############################################
step "6. Runtime Log Verification"

LOGS=$(docker compose logs "$APP_NAME" 2>&1 || true)

for STR in "${REQUIRED_LOGS[@]}"; do
  echo "$LOGS" | grep -q "$STR" || fail "missing boot log: $STR"
done

echo "✔ Boot logs verified"

############################################
step "7. Health Check"

HEALTH=$(curl -s http://localhost:8080/health || true)
[ "$HEALTH" = "ok" ] || fail "health endpoint not OK"

echo "✔ Health endpoint OK"

############################################
step "8. Metrics Verification"

METRICS=$(curl -s http://localhost:8080/metrics || true)

echo "$METRICS" | grep -q "payflux_retention_block_total" || fail "missing retention metric"
echo "$METRICS" | grep -q "alerts_suppressed_total" || fail "missing alert metric"
echo "$METRICS" | grep -q "payflux_active_requests" || fail "missing concurrency metric"

echo "✔ Metrics verified"

############################################
step "9. Config Presence Inside Container"

docker exec $(docker compose ps -q "$APP_NAME") test -f "$CONFIG_FILE" \
  || fail "runtime config missing inside container"

echo "✔ Runtime config present"

############################################
step "10. Final Status"

echo ""
echo "======================================"
echo "✅ DEPLOYMENT SUCCESSFUL"
echo "Binary SHA256: $SHA"
echo "Service: http://localhost:8080"
echo "======================================"
echo ""
