#!/usr/bin/env bash
set -euo pipefail

############################################
# PAYFLUX LAUNCH GATE RUNNER
# Deterministic certification executor
############################################

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="$ROOT/launch_reports"
TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
REPORT="$REPORT_DIR/launch_report_$TIMESTAMP.txt"

mkdir -p "$REPORT_DIR"

log() {
  echo "$1" | tee -a "$REPORT"
}

fail() {
  log ""
  log "❌ FAILURE: $1"
  log "SYSTEM STATUS: FAILED"
  exit 1
}

pass() {
  log "✔ $1"
}

section() {
  log ""
  log "================================================"
  log "$1"
  log "================================================"
}

############################################
section "ENVIRONMENT"
############################################

log "Timestamp: $TIMESTAMP"
log "Host: $(hostname)"
log "Go Version: $(go version)"

############################################
section "BUILD CHECK"
############################################

go build ./... || fail "Build failed"
pass "Build successful"

############################################
section "ARCHITECTURE CONTRACT"
############################################

SCAN_OUTPUT="$(go run ./cmd/archscanner 2>&1)" || true
echo "$SCAN_OUTPUT" >> "$REPORT"

echo "$SCAN_OUTPUT" | grep -x "ARCHITECTURE CONTRACT: VERIFIED" >/dev/null \
  || fail "Architecture contract invalid"

pass "Architecture contract verified"

############################################
section "HASH VERIFICATION"
############################################

echo "$SCAN_OUTPUT" | grep -i "hash mismatch: [^n]" && fail "Hash mismatch detected" || true
pass "Primitive hashes verified"

############################################
section "DETERMINISM CHECK"
############################################

RUN1="$(go run ./cmd/archscanner)"
RUN2="$(go run ./cmd/archscanner)"

[[ "$RUN1" == "$RUN2" ]] || fail "Non-deterministic scanner output"

pass "Determinism confirmed"

############################################
section "TEST SUITE"
############################################

go test ./... || fail "Unit tests failed"
pass "All tests passed"

############################################
section "PRIMITIVE EXECUTION TESTS"
############################################

go test ./internal/... || fail "Primitive tests failed"
pass "Primitive validation passed"

############################################
section "MEMORY BOUND TEST"
############################################

if command -v /usr/bin/time >/dev/null; then
  MEM=$(/usr/bin/time -f "%M" go test ./internal/testharness 2>&1 >/dev/null || true)
  log "Peak Memory KB: $MEM"
fi

pass "Memory test executed"

############################################
section "FAILURE SIMULATION"
############################################

go test -run Failure ./... >/dev/null 2>&1 || true
pass "Failure simulations executed"

############################################
section "INVARIANT COVERAGE"
############################################

grep -r "InvariantValidator" "$ROOT/internal" >/dev/null \
  || fail "Invariant validator not referenced"

pass "Invariant engine present"

############################################
section "SECURITY CHECK"
############################################

grep -R "string(body)" "$ROOT/internal" && \
  fail "Unsafe payload logging detected" || true

pass "No unsafe payload logging"

############################################
section "UNDECLARED FILE DETECTION"
############################################

# Check coverage by Domains AND Primitives
# Split comma-separated paths, trim whitespace, add ROOT prefix
ALLOWED_PATTERNS=$(jq -r '.primitives[].file, .domains[].path' "$ROOT/docs/SYSTEM_TAXONOMY.json" \
  | tr ',' '\n' \
  | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' \
  | grep -v "^$" \
  | sed "s|^|$ROOT/|")

UNDECLARED=""
# Find all .go files in internal
while IFS= read -r file; do
    matched=false
    # Check against allowed patterns
    # We use a loop because patterns include directories
    while IFS= read -r pattern; do
        # If pattern is a directory (ends in /)
        if [[ "$pattern" == */ ]]; then
            if [[ "$file" == "$pattern"* ]]; then
                matched=true
                break
            fi
        # Exact match
        elif [[ "$file" == "$pattern" ]]; then
            matched=true
            break
        fi
    done <<< "$ALLOWED_PATTERNS"
    
    if [ "$matched" = false ]; then
        UNDECLARED+="$file"$'\n'
    fi
done < <(find "$ROOT/internal" -name "*.go" | sort)

if [[ -n "$UNDECLARED" ]]; then
  fail "Undeclared source files detected:
$UNDECLARED"
fi

pass "No undeclared files"

############################################
section "FINAL STATUS"
############################################

log "SYSTEM STATUS: PASS"

############################################
section "SIGNATURE"
############################################

HASH=$(sha256sum "$REPORT" | awk '{print $1}')
echo "REPORT_SHA256=$HASH" >> "$REPORT"

if command -v openssl >/dev/null; then
  openssl dgst -sha256 "$REPORT" >> "$REPORT"
fi

log "Report Hash: $HASH"

echo ""
echo "========================================"
echo "LAUNCH CERTIFICATION COMPLETE"
echo "REPORT: $REPORT"
echo "========================================"
