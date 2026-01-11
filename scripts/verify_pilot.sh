#!/bin/bash
# PayFlux Pilot Verification Suite
# Run from repository root: ./scripts/verify_pilot.sh
# Generates: verification-report-<timestamp>.json on success

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Checkpoint results for report (individual vars for compatibility)
CHECKPOINT_A="skipped"
CHECKPOINT_B="skipped"
CHECKPOINT_C="skipped"
CHECKPOINT_D="skipped"
CHECKPOINT_E="skipped"
CHECKPOINT_F="skipped"
CHECKPOINT_G="skipped"

REPORT_TIMESTAMP=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
REPORT_DIR="./verification-reports"

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

# Explicit teardown - runs on exit (success or failure)
cleanup() {
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "  TEARDOWN: Cleaning up Docker environment..."
    echo "════════════════════════════════════════════════════════════════"
    cd deploy 2>/dev/null && docker compose down -v 2>/dev/null || true
    cd .. 2>/dev/null || true
    echo "  ✓ Containers stopped"
    echo "  ✓ Volumes removed"
    echo "  ✓ Environment clean for next run"
}

trap cleanup EXIT

# ============================================================================
# CHECKPOINT A: FALSE-NEGATIVE TEST (Must emit warning on bad pattern)
# ============================================================================
test_checkpoint_a() {
    section "A. FALSE-NEGATIVE TEST (Must Emit Warning)"
    
    cd deploy
    PAYFLUX_API_KEY=test-key PAYFLUX_PILOT_MODE=true PAYFLUX_TIER=tier2 docker compose up --build -d 2>/dev/null
    sleep 12  # Longer wait for consumer to be fully ready
    cd ..
    
    # Verify server is responding
    echo "Verifying server health..."
    for health_attempt in {1..10}; do
        HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/healthz 2>/dev/null || echo "000")
        if [ "$HEALTH_STATUS" = "200" ]; then
            echo "Server healthy"
            break
        fi
        sleep 1
    done
    
    echo "Sending 10 payment_failed events with retry_count=3..."
    SUCCESS_COUNT=0
    for i in {1..10}; do
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/v1/events/payment_exhaust \
            -H "Authorization: Bearer test-key" \
            -H "Content-Type: application/json" \
            -d "{\"event_type\":\"payment_failed\",\"event_timestamp\":\"2026-01-11T12:00:0${i}Z\",\"event_id\":\"990e8400-0000-0000-0000-00000000000${i}\",\"processor\":\"stripe\",\"merchant_id_hash\":\"false-neg-test\",\"payment_intent_id_hash\":\"pi_test\",\"failure_category\":\"card_declined\",\"retry_count\":3,\"geo_bucket\":\"US\"}")
        if [ "$HTTP_CODE" = "202" ]; then
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        fi
        sleep 0.3
    done
    echo "Events ingested: $SUCCESS_COUNT/10"
    
    echo "Waiting for consumer to process events..."
    WARNING_COUNT=0
    for attempt in {1..20}; do
        WARNING_COUNT=$(docker logs deploy-payflux-1 2>&1 | grep -E "processor_risk_band.*(elevated|high|critical)" | wc -l | tr -d ' ')
        if [ "$WARNING_COUNT" -ge 1 ]; then
            break
        fi
        sleep 1
    done
    
    if [ "$WARNING_COUNT" -ge 1 ]; then
        pass "Checkpoint A: $WARNING_COUNT warnings emitted for bad pattern"
        CHECKPOINT_A="pass"
    else
        fail "Checkpoint A: No warnings emitted for known bad pattern (ingested $SUCCESS_COUNT events)"
        CHECKPOINT_A="fail"
    fi
    
    cd deploy && docker compose down -v 2>/dev/null
    cd ..
}

# ============================================================================
# CHECKPOINT B: TIER 1 SCHEMA CLEANLINESS (No gated keys)
# ============================================================================
test_checkpoint_b() {
    section "B. TIER 1 SCHEMA CLEANLINESS"
    
    cd deploy
    PAYFLUX_API_KEY=test-key PAYFLUX_PILOT_MODE=false PAYFLUX_TIER=tier1 docker compose up --build -d 2>/dev/null
    sleep 8
    cd ..
    
    for i in {1..10}; do
        curl -s -o /dev/null -X POST http://localhost:8080/v1/events/payment_exhaust \
            -H "Authorization: Bearer test-key" \
            -H "Content-Type: application/json" \
            -d "{\"event_type\":\"payment_failed\",\"event_timestamp\":\"2026-01-11T13:00:0${i}Z\",\"event_id\":\"aa0e8400-0000-0000-0000-00000000000${i}\",\"processor\":\"stripe\",\"merchant_id_hash\":\"tier1-test\",\"payment_intent_id_hash\":\"pi_tier1\",\"failure_category\":\"card_declined\",\"retry_count\":3,\"geo_bucket\":\"US\"}"
        sleep 0.2
    done
    
    sleep 8
    
    CONTEXT_COUNT=$(docker logs deploy-payflux-1 2>&1 | grep -c "processor_playbook_context" || true)
    TRAJECTORY_COUNT=$(docker logs deploy-payflux-1 2>&1 | grep -c "risk_trajectory" || true)
    
    local checkpoint_pass=true
    
    if [ "$CONTEXT_COUNT" -eq 0 ]; then
        pass "Checkpoint B: No processor_playbook_context found"
    else
        fail "Checkpoint B: processor_playbook_context found $CONTEXT_COUNT times"
        checkpoint_pass=false
    fi
    
    if [ "$TRAJECTORY_COUNT" -eq 0 ]; then
        pass "Checkpoint B: No risk_trajectory found"
    else
        fail "Checkpoint B: risk_trajectory found $TRAJECTORY_COUNT times"
        checkpoint_pass=false
    fi
    
    if [ "$checkpoint_pass" = true ]; then
        CHECKPOINT_B="pass"
    else
        CHECKPOINT_B="fail"
    fi
    
    cd deploy && docker compose down -v 2>/dev/null
    cd ..
}

# ============================================================================
# CHECKPOINT C: METRICS STABILITY ACROSS RESTART
# ============================================================================
test_checkpoint_c() {
    section "C. METRICS STABILITY ACROSS RESTART"
    
    cd deploy
    PAYFLUX_API_KEY=test-key PAYFLUX_PILOT_MODE=true PAYFLUX_TIER=tier2 docker compose up --build -d 2>/dev/null
    sleep 5
    cd ..
    
    curl -s http://localhost:8080/metrics | grep -E "^payflux_" | sed 's/{.*}/{}/' | cut -d'{' -f1 | sort -u > /tmp/metrics_before.txt
    
    cd deploy
    docker compose restart payflux 2>/dev/null
    sleep 5
    cd ..
    
    curl -s http://localhost:8080/metrics | grep -E "^payflux_" | sed 's/{.*}/{}/' | cut -d'{' -f1 | sort -u > /tmp/metrics_after.txt
    
    if diff -q /tmp/metrics_before.txt /tmp/metrics_after.txt > /dev/null; then
        METRIC_COUNT=$(wc -l < /tmp/metrics_before.txt | tr -d ' ')
        pass "Checkpoint C: $METRIC_COUNT metric names unchanged after restart"
        CHECKPOINT_C="pass"
    else
        fail "Checkpoint C: Metric names changed after restart"
        echo "  Diff:"
        diff /tmp/metrics_before.txt /tmp/metrics_after.txt | head -10
        CHECKPOINT_C="fail"
    fi
    
    cd deploy && docker compose down -v 2>/dev/null
    cd ..
}

# ============================================================================
# CHECKPOINT D: PILOT MODE CONTAINMENT
# ============================================================================
test_checkpoint_d() {
    section "D. PILOT MODE CONTAINMENT"
    
    local checkpoint_pass=true
    
    # Test with pilot mode OFF
    cd deploy
    PAYFLUX_API_KEY=test-key PAYFLUX_PILOT_MODE=false PAYFLUX_TIER=tier1 docker compose up --build -d 2>/dev/null
    sleep 5
    cd ..
    
    STATUS_WARNINGS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/pilot/warnings)
    STATUS_DASHBOARD=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/pilot/dashboard)
    
    if [ "$STATUS_WARNINGS" = "404" ]; then
        pass "Checkpoint D: /pilot/warnings returns 404 when pilot mode OFF"
    else
        fail "Checkpoint D: /pilot/warnings returns $STATUS_WARNINGS (expected 404)"
        checkpoint_pass=false
    fi
    
    if [ "$STATUS_DASHBOARD" = "404" ]; then
        pass "Checkpoint D: /pilot/dashboard returns 404 when pilot mode OFF"
    else
        fail "Checkpoint D: /pilot/dashboard returns $STATUS_DASHBOARD (expected 404)"
        checkpoint_pass=false
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
        pass "Checkpoint D: /pilot/warnings accessible when pilot mode ON"
    else
        fail "Checkpoint D: /pilot/warnings returns $STATUS_WARNINGS_ON when ON (expected 200)"
        checkpoint_pass=false
    fi
    
    if [ "$STATUS_DASHBOARD_ON" = "200" ]; then
        pass "Checkpoint D: /pilot/dashboard accessible when pilot mode ON"
    else
        fail "Checkpoint D: /pilot/dashboard returns $STATUS_DASHBOARD_ON when ON (expected 200)"
        checkpoint_pass=false
    fi
    
    if [ "$checkpoint_pass" = true ]; then
        CHECKPOINT_D="pass"
    else
        CHECKPOINT_D="fail"
    fi
    
    cd deploy && docker compose down -v 2>/dev/null
    cd ..
}

# ============================================================================
# CHECKPOINT E: LOG REDACTION (No secrets or raw payloads)
# ============================================================================
test_checkpoint_e() {
    section "E. LOG REDACTION"
    
    cd deploy
    PAYFLUX_API_KEY=test-key PAYFLUX_PILOT_MODE=true PAYFLUX_TIER=tier2 docker compose up --build -d 2>/dev/null
    sleep 5
    cd ..
    
    for i in {1..5}; do
        curl -s -o /dev/null -X POST http://localhost:8080/v1/events/payment_exhaust \
            -H "Authorization: Bearer test-key" \
            -H "Content-Type: application/json" \
            -d "{\"event_type\":\"payment_failed\",\"event_timestamp\":\"2026-01-11T14:00:0${i}Z\",\"event_id\":\"bb0e8400-0000-0000-0000-00000000000${i}\",\"processor\":\"stripe\",\"merchant_id_hash\":\"redact-test\",\"payment_intent_id_hash\":\"pi_redact\",\"failure_category\":\"card_declined\",\"retry_count\":1,\"geo_bucket\":\"US\"}"
    done
    
    sleep 2
    
    LOGS=$(docker logs deploy-payflux-1 2>&1)
    
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
            fail "Checkpoint E: Found sensitive pattern '$pattern' in logs"
            REDACTION_PASS=false
        fi
    done
    
    LONG_JSON=$(echo "$LOGS" | grep -E '^\{.*\}$' | awk 'length > 1000' | wc -l | tr -d ' ')
    if [ "$LONG_JSON" -gt 0 ]; then
        warn "Checkpoint E: Found $LONG_JSON log lines > 1000 chars (potential raw payloads)"
    fi
    
    if [ "$REDACTION_PASS" = true ]; then
        pass "Checkpoint E: No sensitive patterns found in logs"
        CHECKPOINT_E="pass"
    else
        CHECKPOINT_E="fail"
    fi
    
    cd deploy && docker compose down -v 2>/dev/null
    cd ..
}

# ============================================================================
# CHECKPOINT F: LANGUAGE & CLAIMS AUDIT
# ============================================================================
test_checkpoint_f() {
    section "F. LANGUAGE & CLAIMS AUDIT"
    
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
                    fail "Checkpoint F: Found '$term' in $path ($MATCHES occurrences)"
                    grep -ri "$term" "$path" --include="*.md" 2>/dev/null | head -2
                    AUDIT_PASS=false
                fi
            fi
        done
    done
    
    if [ "$AUDIT_PASS" = true ]; then
        pass "Checkpoint F: No banned terms found in documentation"
    fi
    
    if grep -q "correlates\|may indicate\|often associated\|probabilistic" README.md 2>/dev/null; then
        pass "Checkpoint F: Probabilistic language confirmed in README"
    else
        warn "Checkpoint F: Consider adding more probabilistic qualifiers"
    fi
    
    if [ "$AUDIT_PASS" = true ]; then
        CHECKPOINT_F="pass"
    else
        CHECKPOINT_F="fail"
    fi
}

# ============================================================================
# CHECKPOINT G: FALSE POSITIVE GUARD (Normal traffic must NOT generate warnings)
# ============================================================================
test_checkpoint_g() {
    section "G. FALSE POSITIVE GUARD (No Warnings on Normal Traffic)"
    
    cd deploy
    PAYFLUX_API_KEY=test-key PAYFLUX_PILOT_MODE=true PAYFLUX_TIER=tier2 docker compose up --build -d 2>/dev/null
    sleep 8
    cd ..
    
    # Capture initial warning count
    INITIAL_WARNING_COUNT=$(docker logs deploy-payflux-1 2>&1 | grep -E "processor_risk_band.*(elevated|high|critical)" | wc -l | tr -d ' ')
    echo "Initial warning count: $INITIAL_WARNING_COUNT"
    
    # Send burst of NORMAL / SUCCESSFUL traffic (no retries, successful payments)
    echo "Sending 20 successful payment events (normal traffic)..."
    for i in {1..20}; do
        # Using unique merchant per event to avoid pattern accumulation
        curl -s -o /dev/null -X POST http://localhost:8080/v1/events/payment_exhaust \
            -H "Authorization: Bearer test-key" \
            -H "Content-Type: application/json" \
            -d "{\"event_type\":\"payment_succeeded\",\"event_timestamp\":\"2026-01-11T15:00:${i}Z\",\"event_id\":\"cc0e8400-0000-0000-0000-0000000000$(printf '%02d' $i)\",\"processor\":\"stripe\",\"merchant_id_hash\":\"normal-merchant-$i\",\"payment_intent_id_hash\":\"pi_success_$i\",\"failure_category\":\"\",\"retry_count\":0,\"geo_bucket\":\"US\"}"
        sleep 0.1
    done
    
    # Wait for processing
    echo "Waiting for consumer to process events..."
    sleep 10
    
    # Check for new warnings
    FINAL_WARNING_COUNT=$(docker logs deploy-payflux-1 2>&1 | grep -E "processor_risk_band.*(elevated|high|critical)" | wc -l | tr -d ' ')
    NEW_WARNINGS=$((FINAL_WARNING_COUNT - INITIAL_WARNING_COUNT))
    
    echo "Final warning count: $FINAL_WARNING_COUNT (new: $NEW_WARNINGS)"
    
    if [ "$NEW_WARNINGS" -eq 0 ]; then
        pass "Checkpoint G: No warnings generated for normal traffic ($NEW_WARNINGS new)"
        CHECKPOINT_G="pass"
    else
        fail "Checkpoint G: $NEW_WARNINGS warnings generated for normal traffic (expected 0)"
        CHECKPOINT_G="fail"
    fi
    
    cd deploy && docker compose down -v 2>/dev/null
    cd ..
}

# ============================================================================
# GENERATE VERIFICATION REPORT
# ============================================================================
generate_report() {
    mkdir -p "$REPORT_DIR"
    
    local report_file="${REPORT_DIR}/verification-report-$(date '+%Y%m%d-%H%M%S').json"
    
    # Build JSON report
    cat > "$report_file" << EOF
{
  "timestamp": "$REPORT_TIMESTAMP",
  "git_commit": "$GIT_COMMIT",
  "summary": {
    "total_pass": $PASS_COUNT,
    "total_warn": $WARN_COUNT,
    "total_fail": $FAIL_COUNT,
    "result": "$([ "$FAIL_COUNT" -eq 0 ] && echo "PASS" || echo "FAIL")"
  },
  "checkpoints": {
    "A_false_negative": "$CHECKPOINT_A",
    "B_tier1_schema": "$CHECKPOINT_B",
    "C_metrics_stability": "$CHECKPOINT_C",
    "D_pilot_containment": "$CHECKPOINT_D",
    "E_log_redaction": "$CHECKPOINT_E",
    "F_language_audit": "$CHECKPOINT_F",
    "G_false_positive": "$CHECKPOINT_G"
  }
}
EOF
    
    echo ""
    echo "  📄 Report generated: $report_file"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================
main() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║       PayFlux Pilot Verification Suite v2                    ║"
    echo "║       $(date '+%Y-%m-%d %H:%M:%S')                                    ║"
    echo "║       Commit: $GIT_COMMIT                                         ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    
    test_checkpoint_a
    test_checkpoint_b
    test_checkpoint_c
    test_checkpoint_d
    test_checkpoint_e
    test_checkpoint_f
    test_checkpoint_g
    
    section "SUMMARY"
    echo ""
    echo -e "  ${GREEN}PASS${NC}: $PASS_COUNT"
    echo -e "  ${YELLOW}WARN${NC}: $WARN_COUNT"
    echo -e "  ${RED}FAIL${NC}: $FAIL_COUNT"
    echo ""
    
    # Generate report on success
    if [ "$FAIL_COUNT" -eq 0 ]; then
        generate_report
        echo ""
        echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}  ALL CHECKPOINTS PASSED. System verified for pilots.           ${NC}"
        echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
        exit 0
    else
        echo -e "${RED}════════════════════════════════════════════════════════════════${NC}"
        echo -e "${RED}  $FAIL_COUNT CHECKPOINT(S) FAILED. Review above for details.    ${NC}"
        echo -e "${RED}════════════════════════════════════════════════════════════════${NC}"
        exit 1
    fi
}

main "$@"
