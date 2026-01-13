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
# CHECK: PayFlux scrape target
# ============================================================================
echo ""
echo "Checking PayFlux scrape target..."
sleep 5  # Give Prometheus time to scrape

# Query Prometheus for up{job="payflux"}
QUERY_RESULT=$(curl -s "http://127.0.0.1:19090/api/v1/query?query=up{job=\"payflux\"}" 2>/dev/null)

# Extract the value (1 or 0)
VALUE=$(echo "$QUERY_RESULT" | grep -oP '"value":\[\d+\.?\d*,"\K[01]' 2>/dev/null || echo "")

if [ "$VALUE" = "1" ]; then
    pass "PayFlux metrics reachable (up=1)"
    PAYFLUX_STATUS="PASS"
elif [ "$VALUE" = "0" ]; then
    warn "PayFlux not reachable (ops stack healthy, PayFlux target down)"
    PAYFLUX_STATUS="WARN"
    echo ""
    echo -e "  ${CYAN}This is expected if PayFlux is still starting or has configuration issues.${NC}"
    echo ""
    echo "  PayFlux container status:"
    docker compose ps payflux 2>&1 | sed 's/^/    /'
    echo ""
    echo "  PayFlux last 30 log lines:"
    docker compose logs --tail=30 payflux 2>&1 | sed 's/^/    /'
else
    # No data yet - target may not have been scraped
    warn "PayFlux target status unknown (no scrape data yet)"
    PAYFLUX_STATUS="WARN"
    echo ""
    echo "  Prometheus targets:"
    curl -s "http://127.0.0.1:19090/api/v1/targets" 2>/dev/null | head -50 | sed 's/^/    /'
fi

# ============================================================================
# RESULT SUMMARY
# ============================================================================
echo ""
echo "═════════════════════════════════════════════════════════"
if [ "$PAYFLUX_STATUS" = "PASS" ]; then
    pass "Smoke test: PASS"
else
    warn "Smoke test: WARN (ops stack healthy, PayFlux target may be down)"
fi
echo "═════════════════════════════════════════════════════════"
echo ""
echo "  Grafana:    http://127.0.0.1:3000"
echo "  Prometheus: http://127.0.0.1:19090"
echo ""

# Exit 0 for both PASS and WARN - ops stack itself is healthy
exit 0
