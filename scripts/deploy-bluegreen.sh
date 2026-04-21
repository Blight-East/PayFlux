#!/usr/bin/env bash
set -euo pipefail

APP=payflux
BLUE=8081
GREEN=8082
HEALTH=/health
ACTIVE_FILE=/etc/nginx/upstreams/payflux_active.conf

fail(){ echo "❌ $1"; exit 1; }
step(){ echo -e "\n▶ $1"; }

# 4. Safety Lock
LOCK=/tmp/payflux.deploy.lock
[ -f "$LOCK" ] && fail "deploy already running"
touch "$LOCK"
trap 'rm -f "$LOCK"' EXIT

################################
step "Detect current active"
if [ ! -f "$ACTIVE_FILE" ]; then
    echo "Active file not found at $ACTIVE_FILE"
    echo "Defaulting to BLUE (8081) as current, assuming initial setup."
    ACTIVE_PORT=$BLUE
else
    ACTIVE_PORT=$(grep -o '[0-9]\+' "$ACTIVE_FILE" || echo "$BLUE")
fi

if [ "$ACTIVE_PORT" = "$BLUE" ]; then
    NEW_PORT=$GREEN
    COLOR=green
else
    NEW_PORT=$BLUE
    COLOR=blue
fi

echo "Active=$ACTIVE_PORT → Deploying $COLOR on $NEW_PORT"

################################
step "Build image"
docker compose build --no-cache || fail "build failed"

IMAGE_NAME=$(docker compose config | grep "image:" | awk '{print $2}' | head -n1)
if [ -z "$IMAGE_NAME" ]; then
    IMAGE_NAME="payflux:latest"
fi

################################
step "Start new container"
docker rm -f ${APP}_${COLOR} >/dev/null 2>&1 || true

NETWORK=$(docker network ls --filter name=deploy_default --format "{{.Name}}" | head -n1)
if [ -z "$NETWORK" ]; then
   NETWORK="host"
fi

docker run -d \
  --name ${APP}_${COLOR} \
  --network "$NETWORK" \
  -p ${NEW_PORT}:8080 \
  --env-file deploy/.env \
  -e PAYFLUX_TIER_CONFIG_PATH=/app/config/tiers.runtime.json \
  "$IMAGE_NAME" \
  || fail "container failed"

################################
step "Health gate"
echo "Waiting for health check on port $NEW_PORT..."
START_TIME=$(date +%s)
TIMEOUT=30

while true; do
  if curl -fs "http://localhost:${NEW_PORT}${HEALTH}" >/dev/null; then
    echo "Health check passed!"
    break
  fi
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))
  if [ "$ELAPSED" -gt "$TIMEOUT" ]; then
    fail "health check timed out after ${TIMEOUT}s"
  fi
  sleep 2
done

################################
step "Promote"
# 1. Prevent Accidental Dual-Active Containers
docker inspect ${APP}_${COLOR} >/dev/null || fail "new container missing"

if [ ! -w "$ACTIVE_FILE" ] && [ ! -w "$(dirname "$ACTIVE_FILE")" ]; then
    echo "server 127.0.0.1:${NEW_PORT};" | sudo tee "$ACTIVE_FILE" >/dev/null || fail "failed to update active file"
else
    echo "server 127.0.0.1:${NEW_PORT};" > "$ACTIVE_FILE"
fi

# 2. Harden Nginx Reload Validation
sudo nginx -t && sudo nginx -s reload || fail "nginx reload failed"

# 3. Add Promotion Log Marker
if command -v logger >/dev/null; then
    logger "PAYFLUX DEPLOY → $COLOR live on $NEW_PORT"
fi

################################
step "Post-switch validation"
sleep 2
curl -fs "http://localhost${HEALTH}" >/dev/null || fail "live check failed (nginx proxy)"

################################
step "Shutdown old container"
OLD_COLOR=$([ "$COLOR" = blue ] && echo green || echo blue)
docker rm -f ${APP}_${OLD_COLOR} >/dev/null 2>&1 || true

################################
################################
echo ""
echo "=================================="
echo "✅ DEPLOY SUCCESS — $COLOR ACTIVE"
echo "=================================="

# Signal Guardian
sudo mkdir -p /var/run/payflux
echo "{\"deploy_time\":\"$(date -u +%FT%TZ)\"}" | sudo tee /var/run/payflux/deploy.json >/dev/null

