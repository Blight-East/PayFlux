#!/bin/bash
# PayFlux Pilot Verification Suite v3
# Run from repository root: ./scripts/verify_pilot.sh
# Generates: verification-report-<timestamp>.json on success
#
# INFRASTRUCTURE vs PRODUCT FAILURES:
#   - HTTP 000 or unreachable = INFRASTRUCTURE failure (startup/network issue)
#   - HTTP 404/403/200 = PRODUCT behavior (test the expected codes)
#   - Script fails fast on infra issues to avoid false test failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0
INFRA_FAIL=false

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

# Standard API key used across all tests
API_KEY="test-key"

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

# Infrastructure failure - distinct from test failure
infra_fail() {
    echo -e "${RED}🔴 INFRA${NC}: $1"
    echo -e "${CYAN}   This is an infrastructure/connectivity issue, not a product bug.${NC}"
    INFRA_FAIL=true
    FAIL_COUNT=$((FAIL_COUNT + 1))
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
# INFRASTRUCTURE HELPERS
# ============================================================================

# Dump docker compose diagnostics (called on startup failure)
dump_compose_diagnostics() {
    echo ""
    echo "  ─── Docker Compose Status ───"
    docker compose ps 2>&1 | sed 's/^/    /'
    echo ""
    echo "  ─── PayFlux Logs (last 50 lines) ───"
    docker compose logs --tail=50 payflux 2>&1 | sed 's/^/    /'
    echo ""
    echo "  ─── Redis Logs (last 20 lines) ───"
    docker compose logs --tail=20 redis 2>&1 | sed 's/^/    /'
    echo ""
}

# Start PayFlux with given config and wait for healthy
# Usage: start_payflux <tier> <pilot_mode> [max_wait]
# Returns 0 if healthy, 1 if failed to start
start_payflux() {
    local tier=$1
    local pilot_mode=$2
    local max_wait=${3:-30}
    
    cd deploy
    
    # Build and start with env vars
    PAYFLUX_API_KEY="$API_KEY" \
    PAYFLUX_TIER="$tier" \
    PAYFLUX_PILOT_MODE="$pilot_mode" \
    docker compose up --build -d 2>&1 | grep -v "^#" | head -5
    
    # Verify containers are running
    local payflux_status
    payflux_status=$(docker compose ps --format "{{.State}}" payflux 2>/dev/null || echo "missing")
    
    if [ "$payflux_status" != "running" ]; then
        echo "  ✗ PayFlux container not running (state: $payflux_status)"
        dump_compose_diagnostics
        cd ..
        return 1
    fi
    
    echo "  PayFlux container started, waiting for health (max ${max_wait}s)..."
    
    cd ..
    
    local attempt=0
    while [ $attempt -lt $max_wait ]; do
        # Single curl call, capture just the HTTP code
        local status
        status=$(curl -sS -o /dev/null -w '%{http_code}' "http://localhost:8080/healthz" 2>/dev/null)
        
        if [ "$status" = "200" ]; then
            echo "  ✓ PayFlux healthy after ${attempt}s"
            return 0
        fi
        
        # Only print status every 5 seconds to reduce noise
        if [ $((attempt % 5)) -eq 0 ] && [ $attempt -gt 0 ]; then
            echo "  ... still waiting (attempt $attempt, last status: $status)"
        fi
        
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo "  ✗ PayFlux failed health check after ${max_wait}s (last status: $status)"
    cd deploy
    dump_compose_diagnostics
    cd ..
    return 1
}

# Stop PayFlux and clean up volumes
stop_payflux() {
    cd deploy && docker compose down -v 2>/dev/null
    cd ..
}

# Send event and return HTTP status code
# Usage: send_event <json_payload>
# Returns HTTP code (or 000 for connection failure)
send_event() {
    local payload=$1
    curl -s -o /dev/null -w "%{http_code}" \
        -X POST "http://localhost:8080/v1/events/payment_exhaust" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d "$payload" 2>/dev/null || echo "000"
}

# Check if HTTP code indicates infra failure
is_infra_failure() {
    local code=$1
    [ "$code" = "000" ] || [ -z "$code" ]
}

# Fetch metrics and validate non-empty
# Returns 0 if metrics available, 1 if not
fetch_metrics() {
    local output
    output=$(curl -s "http://localhost:8080/metrics" 2>/dev/null)
    
    if [ -z "$output" ]; then
        return 1
    fi
    
    # Check for actual payflux metrics
    if ! echo "$output" | grep -q "^payflux_"; then
        return 1
    fi
    
    echo "$output"
    return 0
}

# ============================================================================
# CHECKPOINT A: FALSE-NEGATIVE TEST (Must emit warning on bad pattern)
# ============================================================================
test_checkpoint_a() {
    section "A. FALSE-NEGATIVE TEST (Must Emit Warning)"
    
    if ! start_payflux "tier2" "true" 30; then
        infra_fail "Checkpoint A: PayFlux failed to start"
        CHECKPOINT_A="infra_fail"
        return
    fi
    
    echo "  Sending 10 payment_failed events with retry_count=3..."
    local success_count=0
    for i in {1..10}; do
        local payload="{\"event_type\":\"payment_failed\",\"event_timestamp\":\"2026-01-12T12:00:0${i}Z\",\"event_id\":\"990e8400-0000-0000-0000-00000000000${i}\",\"processor\":\"stripe\",\"merchant_id_hash\":\"false-neg-test\",\"payment_intent_id_hash\":\"pi_test\",\"failure_category\":\"card_declined\",\"retry_count\":3,\"geo_bucket\":\"US\"}"
        local http_code
        http_code=$(send_event "$payload")
        
        if is_infra_failure "$http_code"; then
            infra_fail "Checkpoint A: Connection failed during event send (HTTP $http_code)"
            CHECKPOINT_A="infra_fail"
            stop_payflux
            return
        elif [ "$http_code" = "202" ]; then
            success_count=$((success_count + 1))
        fi
        sleep 0.3
    done
    
    echo "  Events ingested: $success_count/10"
    
    if [ "$success_count" -eq 0 ]; then
        infra_fail "Checkpoint A: No events ingested (0/10) - check auth or endpoint"
        CHECKPOINT_A="infra_fail"
        stop_payflux
        return
    fi
    
    echo "  Waiting for consumer to process events..."
    local warning_count=0
    for attempt in {1..20}; do
        warning_count=$(docker logs deploy-payflux-1 2>&1 | grep -E "processor_risk_band.*(elevated|high|critical)" | wc -l | tr -d ' ')
        if [ "$warning_count" -ge 1 ]; then
            break
        fi
        sleep 1
    done
    
    if [ "$warning_count" -ge 1 ]; then
        pass "Checkpoint A: $warning_count warnings emitted for bad pattern"
        CHECKPOINT_A="pass"
    else
        fail "Checkpoint A: No warnings emitted for known bad pattern (ingested $success_count events)"
        CHECKPOINT_A="fail"
    fi
    
    stop_payflux
}

# ============================================================================
# CHECKPOINT B: TIER 1 SCHEMA CLEANLINESS (No gated keys)
# ============================================================================
test_checkpoint_b() {
    section "B. TIER 1 SCHEMA CLEANLINESS"
    
    if ! start_payflux "tier1" "false" 20; then
        infra_fail "Checkpoint B: PayFlux failed to start"
        CHECKPOINT_B="infra_fail"
        return
    fi
    
    # Send some events
    local success_count=0
    for i in {1..10}; do
        local payload="{\"event_type\":\"payment_failed\",\"event_timestamp\":\"2026-01-12T13:00:0${i}Z\",\"event_id\":\"aa0e8400-0000-0000-0000-00000000000${i}\",\"processor\":\"stripe\",\"merchant_id_hash\":\"tier1-test\",\"payment_intent_id_hash\":\"pi_tier1\",\"failure_category\":\"card_declined\",\"retry_count\":3,\"geo_bucket\":\"US\"}"
        local http_code
        http_code=$(send_event "$payload")
        
        if is_infra_failure "$http_code"; then
            infra_fail "Checkpoint B: Connection failed during event send"
            CHECKPOINT_B="infra_fail"
            stop_payflux
            return
        elif [ "$http_code" = "202" ]; then
            success_count=$((success_count + 1))
        fi
        sleep 0.2
    done
    
    if [ "$success_count" -eq 0 ]; then
        infra_fail "Checkpoint B: No events ingested (0/10)"
        CHECKPOINT_B="infra_fail"
        stop_payflux
        return
    fi
    
    sleep 5
    
    local context_count
    local trajectory_count
    context_count=$(docker logs deploy-payflux-1 2>&1 | grep -c "processor_playbook_context" || true)
    trajectory_count=$(docker logs deploy-payflux-1 2>&1 | grep -c "risk_trajectory" || true)
    
    local checkpoint_pass=true
    
    if [ "$context_count" -eq 0 ]; then
        pass "Checkpoint B: No processor_playbook_context found"
    else
        fail "Checkpoint B: processor_playbook_context found $context_count times"
        checkpoint_pass=false
    fi
    
    if [ "$trajectory_count" -eq 0 ]; then
        pass "Checkpoint B: No risk_trajectory found"
    else
        fail "Checkpoint B: risk_trajectory found $trajectory_count times"
        checkpoint_pass=false
    fi
    
    if [ "$checkpoint_pass" = true ]; then
        CHECKPOINT_B="pass"
    else
        CHECKPOINT_B="fail"
    fi
    
    stop_payflux
}

# ============================================================================
# CHECKPOINT C: METRICS STABILITY ACROSS RESTART
# ============================================================================
test_checkpoint_c() {
    section "C. METRICS STABILITY ACROSS RESTART"
    
    if ! start_payflux "tier2" "true" 20; then
        infra_fail "Checkpoint C: PayFlux failed to start"
        CHECKPOINT_C="infra_fail"
        return
    fi
    
    # Ingest at least one event to populate metrics
    local payload='{"event_type":"payment_failed","event_timestamp":"2026-01-12T13:30:00Z","event_id":"metrics-test-1","processor":"stripe","merchant_id_hash":"metrics-test","payment_intent_id_hash":"pi_metrics","failure_category":"card_declined","retry_count":1,"geo_bucket":"US"}'
    local http_code
    http_code=$(send_event "$payload")
    
    if is_infra_failure "$http_code"; then
        infra_fail "Checkpoint C: Cannot ingest event for metrics test"
        CHECKPOINT_C="infra_fail"
        stop_payflux
        return
    fi
    
    sleep 3
    
    # Fetch metrics before restart
    local metrics_before
    metrics_before=$(fetch_metrics)
    
    if [ -z "$metrics_before" ]; then
        infra_fail "Checkpoint C: Metrics endpoint unreachable or empty before restart"
        CHECKPOINT_C="infra_fail"
        stop_payflux
        return
    fi
    
    echo "$metrics_before" | grep -E "^payflux_" | sed 's/{.*}/{}/' | cut -d'{' -f1 | sort -u > /tmp/metrics_before.txt
    local before_count
    before_count=$(wc -l < /tmp/metrics_before.txt | tr -d ' ')
    
    if [ "$before_count" -eq 0 ]; then
        infra_fail "Checkpoint C: No payflux_ metrics found before restart"
        CHECKPOINT_C="infra_fail"
        stop_payflux
        return
    fi
    
    echo "  Found $before_count metrics before restart"
    
    # Restart PayFlux
    cd deploy
    docker compose restart payflux 2>/dev/null
    cd ..
    sleep 8
    
    # Fetch metrics after restart
    local metrics_after
    metrics_after=$(fetch_metrics)
    
    if [ -z "$metrics_after" ]; then
        infra_fail "Checkpoint C: Metrics endpoint unreachable after restart"
        CHECKPOINT_C="infra_fail"
        stop_payflux
        return
    fi
    
    echo "$metrics_after" | grep -E "^payflux_" | sed 's/{.*}/{}/' | cut -d'{' -f1 | sort -u > /tmp/metrics_after.txt
    
    if diff -q /tmp/metrics_before.txt /tmp/metrics_after.txt > /dev/null; then
        pass "Checkpoint C: $before_count metric names unchanged after restart"
        CHECKPOINT_C="pass"
    else
        fail "Checkpoint C: Metric names changed after restart"
        echo "  Diff:"
        diff /tmp/metrics_before.txt /tmp/metrics_after.txt | head -10
        CHECKPOINT_C="fail"
    fi
    
    stop_payflux
}

# ============================================================================
# CHECKPOINT D: PILOT MODE CONTAINMENT
# ============================================================================
test_checkpoint_d() {
    section "D. PILOT MODE CONTAINMENT"
    
    local checkpoint_pass=true
    
    # Test with pilot mode OFF
    echo "  Testing with PILOT_MODE=false..."
    if ! start_payflux "tier1" "false" 20; then
        infra_fail "Checkpoint D: PayFlux failed to start (pilot OFF)"
        CHECKPOINT_D="infra_fail"
        return
    fi
    
    local status_warnings
    local status_dashboard
    status_warnings=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/pilot/warnings" 2>/dev/null || echo "000")
    status_dashboard=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/pilot/dashboard" 2>/dev/null || echo "000")
    
    # Check for infra failure first
    if is_infra_failure "$status_warnings" || is_infra_failure "$status_dashboard"; then
        infra_fail "Checkpoint D: Connection failure checking pilot endpoints (warnings=$status_warnings, dashboard=$status_dashboard)"
        CHECKPOINT_D="infra_fail"
        stop_payflux
        return
    fi
    
    if [ "$status_warnings" = "404" ]; then
        pass "Checkpoint D: /pilot/warnings returns 404 when pilot mode OFF"
    else
        fail "Checkpoint D: /pilot/warnings returns $status_warnings (expected 404)"
        checkpoint_pass=false
    fi
    
    if [ "$status_dashboard" = "404" ]; then
        pass "Checkpoint D: /pilot/dashboard returns 404 when pilot mode OFF"
    else
        fail "Checkpoint D: /pilot/dashboard returns $status_dashboard (expected 404)"
        checkpoint_pass=false
    fi
    
    stop_payflux
    
    # Test with pilot mode ON
    echo "  Testing with PILOT_MODE=true..."
    if ! start_payflux "tier2" "true" 20; then
        infra_fail "Checkpoint D: PayFlux failed to start (pilot ON)"
        CHECKPOINT_D="infra_fail"
        return
    fi
    
    local status_warnings_on
    local status_dashboard_on
    status_warnings_on=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/pilot/warnings" -H "Authorization: Bearer $API_KEY" 2>/dev/null || echo "000")
    status_dashboard_on=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8080/pilot/dashboard" -H "Authorization: Bearer $API_KEY" 2>/dev/null || echo "000")
    
    if is_infra_failure "$status_warnings_on" || is_infra_failure "$status_dashboard_on"; then
        infra_fail "Checkpoint D: Connection failure checking pilot endpoints when ON"
        CHECKPOINT_D="infra_fail"
        stop_payflux
        return
    fi
    
    if [ "$status_warnings_on" = "200" ]; then
        pass "Checkpoint D: /pilot/warnings accessible when pilot mode ON"
    else
        fail "Checkpoint D: /pilot/warnings returns $status_warnings_on when ON (expected 200)"
        checkpoint_pass=false
    fi
    
    if [ "$status_dashboard_on" = "200" ]; then
        pass "Checkpoint D: /pilot/dashboard accessible when pilot mode ON"
    else
        fail "Checkpoint D: /pilot/dashboard returns $status_dashboard_on when ON (expected 200)"
        checkpoint_pass=false
    fi
    
    if [ "$checkpoint_pass" = true ]; then
        CHECKPOINT_D="pass"
    else
        CHECKPOINT_D="fail"
    fi
    
    stop_payflux
}

# ============================================================================
# CHECKPOINT E: LOG REDACTION (No secrets or raw payloads)
# ============================================================================
test_checkpoint_e() {
    section "E. LOG REDACTION"
    
    if ! start_payflux "tier2" "true" 20; then
        infra_fail "Checkpoint E: PayFlux failed to start"
        CHECKPOINT_E="infra_fail"
        return
    fi
    
    # Send some events
    local success_count=0
    for i in {1..5}; do
        local payload="{\"event_type\":\"payment_failed\",\"event_timestamp\":\"2026-01-12T14:00:0${i}Z\",\"event_id\":\"bb0e8400-0000-0000-0000-00000000000${i}\",\"processor\":\"stripe\",\"merchant_id_hash\":\"redact-test\",\"payment_intent_id_hash\":\"pi_redact\",\"failure_category\":\"card_declined\",\"retry_count\":1,\"geo_bucket\":\"US\"}"
        local http_code
        http_code=$(send_event "$payload")
        
        if [ "$http_code" = "202" ]; then
            success_count=$((success_count + 1))
        fi
    done
    
    if [ "$success_count" -eq 0 ]; then
        infra_fail "Checkpoint E: No events ingested for redaction test"
        CHECKPOINT_E="infra_fail"
        stop_payflux
        return
    fi
    
    sleep 2
    
    local logs
    logs=$(docker logs deploy-payflux-1 2>&1)
    
    local sensitive_patterns=(
        "Stripe-Signature"
        "whsec_"
        "sk_live_"
        "sk_test_"
        "Bearer test-key"
    )
    
    local redaction_pass=true
    for pattern in "${sensitive_patterns[@]}"; do
        if echo "$logs" | grep -q "$pattern"; then
            fail "Checkpoint E: Found sensitive pattern '$pattern' in logs"
            redaction_pass=false
        fi
    done
    
    local long_json
    long_json=$(echo "$logs" | grep -E '^\{.*\}$' | awk 'length > 1000' | wc -l | tr -d ' ')
    if [ "$long_json" -gt 0 ]; then
        warn "Checkpoint E: Found $long_json log lines > 1000 chars (potential raw payloads)"
    fi
    
    if [ "$redaction_pass" = true ]; then
        pass "Checkpoint E: No sensitive patterns found in logs"
        CHECKPOINT_E="pass"
    else
        CHECKPOINT_E="fail"
    fi
    
    stop_payflux
}

# ============================================================================
# CHECKPOINT F: LANGUAGE & CLAIMS AUDIT
# ============================================================================
test_checkpoint_f() {
    section "F. LANGUAGE & CLAIMS AUDIT"
    
    local banned_terms=(
        "real-time"
        "will prevent"
        "will stop"
        "guarantees that"
        "insider knowledge"
    )
    
    local scan_paths=(
        "README.md"
        "docs/"
        "examples/"
    )
    
    local audit_pass=true
    
    for term in "${banned_terms[@]}"; do
        for path in "${scan_paths[@]}"; do
            if [ -e "$path" ]; then
                local matches
                matches=$(grep -ri "$term" "$path" --include="*.md" 2>/dev/null | wc -l | tr -d ' ')
                if [ "$matches" -gt 0 ]; then
                    fail "Checkpoint F: Found '$term' in $path ($matches occurrences)"
                    grep -ri "$term" "$path" --include="*.md" 2>/dev/null | head -2
                    audit_pass=false
                fi
            fi
        done
    done
    
    if [ "$audit_pass" = true ]; then
        pass "Checkpoint F: No banned terms found in documentation"
    fi
    
    if grep -q "correlates\|may indicate\|often associated\|probabilistic" README.md 2>/dev/null; then
        pass "Checkpoint F: Probabilistic language confirmed in README"
    else
        warn "Checkpoint F: Consider adding more probabilistic qualifiers"
    fi
    
    if [ "$audit_pass" = true ]; then
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
    
    if ! start_payflux "tier2" "true" 20; then
        infra_fail "Checkpoint G: PayFlux failed to start"
        CHECKPOINT_G="infra_fail"
        return
    fi
    
    # Capture initial warning count
    local initial_warning_count
    initial_warning_count=$(docker logs deploy-payflux-1 2>&1 | grep -E "processor_risk_band.*(elevated|high|critical)" | wc -l | tr -d ' ')
    echo "  Initial warning count: $initial_warning_count"
    
    # Send burst of NORMAL / SUCCESSFUL traffic (no retries, successful payments)
    echo "  Sending 20 successful payment events (normal traffic)..."
    local success_count=0
    for i in {1..20}; do
        local payload="{\"event_type\":\"payment_succeeded\",\"event_timestamp\":\"2026-01-12T15:00:${i}Z\",\"event_id\":\"cc0e8400-0000-0000-0000-0000000000$(printf '%02d' $i)\",\"processor\":\"stripe\",\"merchant_id_hash\":\"normal-merchant-$i\",\"payment_intent_id_hash\":\"pi_success_$i\",\"failure_category\":\"\",\"retry_count\":0,\"geo_bucket\":\"US\"}"
        local http_code
        http_code=$(send_event "$payload")
        
        if is_infra_failure "$http_code"; then
            infra_fail "Checkpoint G: Connection failed during normal traffic test"
            CHECKPOINT_G="infra_fail"
            stop_payflux
            return
        elif [ "$http_code" = "202" ]; then
            success_count=$((success_count + 1))
        fi
        sleep 0.1
    done
    
    echo "  Events ingested: $success_count/20"
    
    if [ "$success_count" -eq 0 ]; then
        infra_fail "Checkpoint G: No events ingested for false positive test"
        CHECKPOINT_G="infra_fail"
        stop_payflux
        return
    fi
    
    # Wait for processing
    echo "  Waiting for consumer to process events..."
    sleep 8
    
    # Check for new warnings
    local final_warning_count
    final_warning_count=$(docker logs deploy-payflux-1 2>&1 | grep -E "processor_risk_band.*(elevated|high|critical)" | wc -l | tr -d ' ')
    local new_warnings=$((final_warning_count - initial_warning_count))
    
    echo "  Final warning count: $final_warning_count (new: $new_warnings)"
    
    if [ "$new_warnings" -eq 0 ]; then
        pass "Checkpoint G: No warnings generated for normal traffic ($new_warnings new)"
        CHECKPOINT_G="pass"
    else
        fail "Checkpoint G: $new_warnings warnings generated for normal traffic (expected 0)"
        CHECKPOINT_G="fail"
    fi
    
    stop_payflux
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
    "infra_issues": $INFRA_FAIL,
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
    echo "║       PayFlux Pilot Verification Suite v3                    ║"
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
    
    if [ "$INFRA_FAIL" = true ]; then
        echo ""
        echo -e "  ${CYAN}Note: Some failures were infrastructure-related (HTTP 000, startup issues)${NC}"
        echo -e "  ${CYAN}      These indicate test environment issues, not product bugs.${NC}"
    fi
    
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
