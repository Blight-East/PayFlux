#!/bin/bash
# PayFlux Pilot Verification Suite
# Run from repository root: ./scripts/verify_pilot.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    FAIL_COUNT=$((FAIL_COUNT + 1))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    WARN_COUNT=$((WARN_COUNT + 1))
}

section() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  $1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

cleanup() {
    echo ""
    echo "Cleaning up Docker environment..."
    cd deploy && docker compose down -v 2>/dev/null || true
    cd ..
}

trap cleanup EXIT

# ============================================================================
# SECTION 1: FALSE-NEGATIVE TEST (Must emit warning on bad pattern)
# ============================================================================
test_false_negative() {
    section "1. FALSE-NEGATIVE TEST (Must Emit Warning)"
    
    cd deploy
    PAYFLUX_API_KEY=test-key PAYFLUX_PILOT_MODE=true PAYFLUX_TIER=tier2 docker compose up --build -d 2>/dev/null
    sleep 8  # Wait for consumer to be ready
    cd ..
    
    # Send 10 high-risk events (retry storm pattern)
    echo "Sending 10 payment_failed events with retry_count=3..."
    for i in {1..10}; do
        curl -s -o /dev/null -X POST http://localhost:8080/v1/events/payment_exhaust \
            -H "Authorization: Bearer test-key" \
            -H "Content-Type: application/json" \
            -d "{\"event_type\":\"payment_failed\",\"event_timestamp\":\"2026-01-11T12:00:0${i}Z\",\"event_id\":\"990e8400-0000-0000-0000-00000000000${i}\",\"processor\":\"stripe\",\"merchant_id_hash\":\"false-neg-test\",\"payment_intent_id_hash\":\"pi_test\",\"failure_category\":\"card_declined\",\"retry_count\":3,\"geo_bucket\":\"US\"}"
        sleep 0.2  # Small delay between events
    done
    
    # Wait for consumer to process (up to 15 seconds)
    echo "Waiting for consumer to process events..."
    for attempt in {1..15}; do
        WARNING_COUNT=$(docker logs deploy-payflux-1 2>&1 | grep -E "processor_risk_band.*(elevated|high|critical)" | wc -l | tr -d ' ')
        if [ "$WARNING_COUNT" -ge 1 ]; then
            break
        fi
        sleep 1
    done
    
    if [ "$WARNING_COUNT" -ge 1 ]; then
        pass "False-negative test: $WARNING_COUNT warnings emitted for bad pattern"
    else
        fail "False-negative test: No warnings emitted for known bad pattern"
    fi
    
    cd deploy && docker compose down -v 2>/dev/null
    cd ..
}

# ============================================================================
# SECTION 2: TIER 1 SCHEMA CLEANLINESS (No gated keys)
# ============================================================================
test_tier1_schema() {
    section "2. TIER 1 SCHEMA CLEANLINESS"
    
    cd deploy
    PAYFLUX_API_KEY=test-key PAYFLUX_PILOT_MODE=false PAYFLUX_TIER=tier1 docker compose up --build -d 2>/dev/null
    sleep 8
    cd ..
    
    # Send events to generate output
    for i in {1..10}; do
        curl -s -o /dev/null -X POST http://localhost:8080/v1/events/payment_exhaust \
            -H "Authorization: Bearer test-key" \
            -H "Content-Type: application/json" \
            -d "{\"event_type\":\"payment_failed\",\"event_timestamp\":\"2026-01-11T13:00:0${i}Z\",\"event_id\":\"aa0e8400-0000-0000-0000-00000000000${i}\",\"processor\":\"stripe\",\"merchant_id_hash\":\"tier1-test\",\"payment_intent_id_hash\":\"pi_tier1\",\"failure_category\":\"card_declined\",\"retry_count\":3,\"geo_bucket\":\"US\"}"
        sleep 0.2
    done
    
    # Wait for processing
    sleep 8
    
    # Check for forbidden keys
    CONTEXT_COUNT=$(docker logs deploy-payflux-1 2>&1 | grep -c "processor_playbook_context" || true)
    TRAJECTORY_COUNT=$(docker logs deploy-payflux-1 2>&1 | grep -c "risk_trajectory" || true)
    
    if [ "$CONTEXT_COUNT" -eq 0 ]; then
        pass "Tier 1 schema: No processor_playbook_context found"
    else
        fail "Tier 1 schema: processor_playbook_context found $CONTEXT_COUNT times (MUST NOT appear)"
    fi
    
    if [ "$TRAJECTORY_COUNT" -eq 0 ]; then
        pass "Tier 1 schema: No risk_trajectory found"
    else
        fail "Tier 1 schema: risk_trajectory found $TRAJECTORY_COUNT times (MUST NOT appear)"
    fi
    
    cd deploy && docker compose down -v 2>/dev/null
    cd ..
}

# ============================================================================
# SECTION 3: METRICS STABILITY ACROSS RESTART
# ============================================================================
test_metrics_stability() {
    section "3. METRICS STABILITY ACROSS RESTART"
    
    cd deploy
    PAYFLUX_API_KEY=test-key PAYFLUX_PILOT_MODE=true PAYFLUX_TIER=tier2 docker compose up --build -d 2>/dev/null
    sleep 5
    cd ..
    
    # Scrape metrics before restart
    curl -s http://localhost:8080/metrics | grep -E "^payflux_" | sed 's/{.*}/{}/' | cut -d'{' -f1 | sort -u > /tmp/metrics_before.txt
    
    # Restart container
    cd deploy
    docker compose restart payflux 2>/dev/null
    sleep 5
    cd ..
    
    # Scrape metrics after restart
    curl -s http://localhost:8080/metrics | grep -E "^payflux_" | sed 's/{.*}/{}/' | cut -d'{' -f1 | sort -u > /tmp/metrics_after.txt
    
    # Compare
    if diff -q /tmp/metrics_before.txt /tmp/metrics_after.txt > /dev/null; then
        METRIC_COUNT=$(wc -l < /tmp/metrics_before.txt | tr -d ' ')
        pass "Metrics stability: $METRIC_COUNT metric names unchanged after restart"
    else
        fail "Metrics stability: Metric names changed after restart"
        echo "  Diff:"
        diff /tmp/metrics_before.txt /tmp/metrics_after.txt | head -10
    fi
    
    cd deploy && docker compose down -v 2>/dev/null
    cd ..
}

# ============================================================================
# SECTION 4: PILOT MODE CONTAINMENT
# ============================================================================
test_pilot_containment() {
    section "4. PILOT MODE CONTAINMENT"
    
    # Test with pilot mode OFF
    cd deploy
    PAYFLUX_API_KEY=test-key PAYFLUX_PILOT_MODE=false PAYFLUX_TIER=tier1 docker compose up --build -d 2>/dev/null
    sleep 5
    cd ..
    
    STATUS_WARNINGS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/pilot/warnings)
    STATUS_DASHBOARD=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/pilot/dashboard)
    
    if [ "$STATUS_WARNINGS" = "404" ]; then
        pass "Pilot containment: /pilot/warnings returns 404 when pilot mode OFF"
    else
        fail "Pilot containment: /pilot/warnings returns $STATUS_WARNINGS (expected 404)"
    fi
    
    if [ "$STATUS_DASHBOARD" = "404" ]; then
        pass "Pilot containment: /pilot/dashboard returns 404 when pilot mode OFF"
    else
        fail "Pilot containment: /pilot/dashboard returns $STATUS_DASHBOARD (expected 404)"
    fi
    
    cd deploy && docker compose down -v 2>/dev/null
    cd ..
    
    # Test with pilot mode ON
    cd deploy
    PAYFLUX_API_KEY=test-key PAYFLUX_PILOT_MODE=true PAYFLUX_TIER=tier2 docker compose up --build -d 2>/dev/null
    sleep 5
    cd ..
    
    STATUS_WARNINGS_ON=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/pilot/warnings -H "Authorization: Bearer test-key")
    STATUS_DASHBOARD_ON=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/pilot/dashboard -H "Authorization: Bearer test-key")
    
    if [ "$STATUS_WARNINGS_ON" = "200" ]; then
        pass "Pilot containment: /pilot/warnings accessible when pilot mode ON"
    else
        fail "Pilot containment: /pilot/warnings returns $STATUS_WARNINGS_ON when ON (expected 200)"
    fi
    
    if [ "$STATUS_DASHBOARD_ON" = "200" ]; then
        pass "Pilot containment: /pilot/dashboard accessible when pilot mode ON"
    else
        fail "Pilot containment: /pilot/dashboard returns $STATUS_DASHBOARD_ON when ON (expected 200)"
    fi
    
    cd deploy && docker compose down -v 2>/dev/null
    cd ..
}

# ============================================================================
# SECTION 5: LOG REDACTION (No secrets or raw payloads)
# ============================================================================
test_log_redaction() {
    section "5. LOG REDACTION"
    
    cd deploy
    PAYFLUX_API_KEY=test-key PAYFLUX_PILOT_MODE=true PAYFLUX_TIER=tier2 docker compose up --build -d 2>/dev/null
    sleep 5
    cd ..
    
    # Send some events
    for i in {1..5}; do
        curl -s -o /dev/null -X POST http://localhost:8080/v1/events/payment_exhaust \
            -H "Authorization: Bearer test-key" \
            -H "Content-Type: application/json" \
            -d "{\"event_type\":\"payment_failed\",\"event_timestamp\":\"2026-01-11T14:00:0${i}Z\",\"event_id\":\"bb0e8400-0000-0000-0000-00000000000${i}\",\"processor\":\"stripe\",\"merchant_id_hash\":\"redact-test\",\"payment_intent_id_hash\":\"pi_redact\",\"failure_category\":\"card_declined\",\"retry_count\":1,\"geo_bucket\":\"US\"}"
    done
    
    sleep 2
    
    LOGS=$(docker logs deploy-payflux-1 2>&1)
    
    # Check for sensitive markers
    SENSITIVE_PATTERNS=(
        "Stripe-Signature"
        "whsec_"
        "sk_live_"
        "sk_test_"
        "Bearer test-key"
    )
    
    REDACTION_PASS=true
    for pattern in "${SENSITIVE_PATTERNS[@]}"; do
        if echo "$LOGS" | grep -q "$pattern"; then
            fail "Log redaction: Found sensitive pattern '$pattern' in logs"
            REDACTION_PASS=false
        fi
    done
    
    # Check for overly long JSON lines (potential raw payloads)
    LONG_JSON=$(echo "$LOGS" | grep -E '^\{.*\}$' | awk 'length > 1000' | wc -l | tr -d ' ')
    if [ "$LONG_JSON" -gt 0 ]; then
        warn "Log redaction: Found $LONG_JSON log lines > 1000 chars (potential raw payloads)"
    fi
    
    if [ "$REDACTION_PASS" = true ]; then
        pass "Log redaction: No sensitive patterns found in logs"
    fi
    
    cd deploy && docker compose down -v 2>/dev/null
    cd ..
}

# ============================================================================
# SECTION 6: LANGUAGE & CLAIMS AUDIT
# ============================================================================
test_language_audit() {
    section "6. LANGUAGE & CLAIMS AUDIT"
    
    BANNED_TERMS=(
        "real-time"
        "will prevent"
        "will stop"
        "guarantees that"
        "insider knowledge"
    )
    
    SCAN_PATHS=(
        "README.md"
        "docs/"
        "examples/"
    )
    
    AUDIT_PASS=true
    
    for term in "${BANNED_TERMS[@]}"; do
        for path in "${SCAN_PATHS[@]}"; do
            if [ -e "$path" ]; then
                MATCHES=$(grep -ri "$term" "$path" --include="*.md" 2>/dev/null | wc -l | tr -d ' ')
                if [ "$MATCHES" -gt 0 ]; then
                    fail "Language audit: Found '$term' in $path ($MATCHES occurrences)"
                    grep -ri "$term" "$path" --include="*.md" 2>/dev/null | head -2
                    AUDIT_PASS=false
                fi
            fi
        done
    done
    
    if [ "$AUDIT_PASS" = true ]; then
        pass "Language audit: No banned terms found in documentation"
    fi
    
    # Check for probabilistic language in key files
    if grep -q "correlates\|may indicate\|often associated\|probabilistic" README.md 2>/dev/null; then
        pass "Language audit: Probabilistic language confirmed in README"
    else
        warn "Language audit: Consider adding more probabilistic qualifiers"
    fi
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================
main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║       PayFlux Pilot Verification Suite                       ║"
    echo "║       $(date '+%Y-%m-%d %H:%M:%S')                                    ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    
    test_false_negative
    test_tier1_schema
    test_metrics_stability
    test_pilot_containment
    test_log_redaction
    test_language_audit
    
    section "SUMMARY"
    echo ""
    echo -e "  ${GREEN}PASS${NC}: $PASS_COUNT"
    echo -e "  ${YELLOW}WARN${NC}: $WARN_COUNT"
    echo -e "  ${RED}FAIL${NC}: $FAIL_COUNT"
    echo ""
    
    if [ "$FAIL_COUNT" -eq 0 ]; then
        echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}  ALL TESTS PASSED. System verified for pilots.                 ${NC}"
        echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
        exit 0
    else
        echo -e "${RED}════════════════════════════════════════════════════════════════${NC}"
        echo -e "${RED}  $FAIL_COUNT TEST(S) FAILED. Review above for details.          ${NC}"
        echo -e "${RED}════════════════════════════════════════════════════════════════${NC}"
        exit 1
    fi
}

main "$@"
