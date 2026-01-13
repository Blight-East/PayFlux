#!/bin/bash
# Smoke test for ops-observability stack
# Verifies Prometheus, Grafana, and PayFlux scraping are working
#
# This script is "no-touch" - it does not modify any files.
# Cleanup runs automatically via trap on exit.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

pass() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }

# Cleanup function - always runs on exit
cleanup() {
    echo ""
    echo "Tearing down..."
    docker compose down -v 2>/dev/null || true
    echo "Done."
}
trap cleanup EXIT

# ============================================================================
# PREFLIGHT: Port Conflict Detection
# ============================================================================
echo "═════════════════════════════════════════════════════════"
echo "  Ops Observability Smoke Test"
echo "═════════════════════════════════════════════════════════"
echo ""
echo "Checking for port conflicts..."

check_port() {
    local port=$1
    local service=$2
    if lsof -i ":$port" >/dev/null 2>&1; then
        fail "Port $port is already in use (needed for $service)"
        echo "  Run: lsof -i :$port   to see what's using it"
        exit 1
    fi
    pass "Port $port available for $service"
}

check_port 19090 "Prometheus"
check_port 3000 "Grafana"
check_port 8080 "PayFlux"
echo ""

# ============================================================================
# START: Bring up the stack
# ============================================================================
echo "Starting ops-observability stack..."
if ! docker compose up -d --build 2>&1 | grep -v "^#" | head -10; then
    fail "docker compose up failed"
    exit 1
fi
echo ""

# ============================================================================
# WAIT: Prometheus healthcheck
# ============================================================================
echo "Waiting for Prometheus to become healthy..."
PROM_HEALTHY=false
for i in {1..60}; do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$(docker compose ps -q prometheus 2>/dev/null)" 2>/dev/null || echo "unknown")
    if [ "$STATUS" = "healthy" ]; then
        pass "Prometheus healthy (took ${i}s)"
        PROM_HEALTHY=true
        break
    fi
    if [ "$STATUS" = "unhealthy" ]; then
        fail "Prometheus unhealthy"
        echo "  Container logs:"
        docker compose logs --tail=20 prometheus 2>&1 | sed 's/^/    /'
        exit 1
    fi
    sleep 1
done

if [ "$PROM_HEALTHY" = false ]; then
    fail "Prometheus did not become healthy within 60s (status: $STATUS)"
    echo "  Container logs:"
    docker compose logs --tail=30 prometheus 2>&1 | sed 's/^/    /'
    exit 1
fi

# ============================================================================
# WAIT: Grafana healthcheck
# ============================================================================
echo "Waiting for Grafana to become healthy..."
GRAF_HEALTHY=false
for i in {1..60}; do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$(docker compose ps -q grafana 2>/dev/null)" 2>/dev/null || echo "unknown")
    if [ "$STATUS" = "healthy" ]; then
        pass "Grafana healthy (took ${i}s)"
        GRAF_HEALTHY=true
        break
    fi
    if [ "$STATUS" = "unhealthy" ]; then
        fail "Grafana unhealthy"
        echo "  Container logs:"
        docker compose logs --tail=20 grafana 2>&1 | sed 's/^/    /'
        exit 1
    fi
    sleep 1
done

if [ "$GRAF_HEALTHY" = false ]; then
    fail "Grafana did not become healthy within 60s (status: $STATUS)"
    echo "  Container logs:"
    docker compose logs --tail=30 grafana 2>&1 | sed 's/^/    /'
    exit 1
fi

# ============================================================================
# CHECK: PayFlux scrape target via Prometheus targets API
# ============================================================================
echo ""
echo "Checking PayFlux scrape target..."

PAYFLUX_STATUS="UNKNOWN"
for attempt in {1..15}; do
    # Query Prometheus targets API
    TARGETS_RESPONSE=$(curl -s "http://127.0.0.1:19090/api/v1/targets" 2>/dev/null)
    
    # Check if payflux job exists and its health status
    # Look for: "job":"payflux" ... "health":"up" or "health":"down"
    if echo "$TARGETS_RESPONSE" | grep -q '"job":"payflux"'; then
        # Job exists, check health
        if echo "$TARGETS_RESPONSE" | grep -q '"job":"payflux".*"health":"up"'; then
            pass "PayFlux target UP"
            PAYFLUX_STATUS="PASS"
            break
        elif echo "$TARGETS_RESPONSE" | grep -q '"job":"payflux".*"health":"down"'; then
            # Wait and retry - target might be transitioning
            if [ $attempt -eq 15 ]; then
                fail "PayFlux target DOWN"
                PAYFLUX_STATUS="FAIL"
                echo ""
                echo "  PayFlux container status:"
                docker compose ps payflux 2>&1 | sed 's/^/    /'
                echo ""
                echo "  PayFlux last 30 log lines:"
                docker compose logs --tail=30 payflux 2>&1 | sed 's/^/    /'
            fi
        fi
    else
        # Job not found yet
        if [ $attempt -eq 15 ]; then
            fail "PayFlux target MISSING"
            PAYFLUX_STATUS="FAIL"
            echo "  No 'payflux' job found in Prometheus targets"
        fi
    fi
    
    sleep 1
done

# ============================================================================
# RESULT SUMMARY
# ============================================================================
echo ""
echo "═════════════════════════════════════════════════════════"
if [ "$PAYFLUX_STATUS" = "PASS" ]; then
    pass "Smoke test: PASS"
    echo "═════════════════════════════════════════════════════════"
    echo ""
    echo "  Grafana:    http://127.0.0.1:3000"
    echo "  Prometheus: http://127.0.0.1:19090"
    echo ""
    exit 0
else
    fail "Smoke test: FAIL"
    echo "═════════════════════════════════════════════════════════"
    echo ""
    echo "  Grafana:    http://127.0.0.1:3000"
    echo "  Prometheus: http://127.0.0.1:19090"
    echo ""
    exit 1
fi
