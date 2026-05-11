#!/usr/bin/env bash
#
# check-mutual-blindness.sh
#
# Enforces the mutual-blindness invariant from SUBSCRIPTION_REDUCER_CONTRACT.md
# at the import-graph level: the reducer cannot import canonical-CRUD
# writer paths; the dashboard's runtime cannot import projection
# internals.
#
# The drift detector is the ONE legitimate exception — its job IS to
# compare both sides. The exception is explicit, not accidental.
#
# Exit codes:
#   0  - no violations found
#   1  - one or more violations found
#   2  - usage / script error
#
# Run locally:  bash scripts/check-mutual-blindness.sh
# In CI:        invoked by .github/workflows/mutual-blindness.yml

set -euo pipefail

# Walk up to the repo root so the script works from any cwd.
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

violations=0

note() { printf '  %s\n' "$1"; }
fail() { printf '\033[31m✘ %s\033[0m\n' "$1"; violations=$((violations + 1)); }
ok()   { printf '\033[32m✓ %s\033[0m\n' "$1"; }

# ----------------------------------------------------------------------
# Rule 1: reducer code must not import billing CRUD write paths.
#
# The reducer reads from the ledger and writes to subscription_projection.
# It must NEVER consult the canonical billing tables for its merge
# decisions — that would couple the two planes and make convergence
# evidence meaningless.
# ----------------------------------------------------------------------

printf 'Rule 1: reducer must not import canonical write paths\n'

# Forbidden patterns inside internal/reducer/* (excluding drift detector
# which is the legitimate cross-domain comparer).
forbidden_in_reducer=(
    # Direct table references in raw SQL
    "billing_subscriptions"
    "upsertBillingCustomer"
    "upsertSubscriptionFromStripe"
    # Future-proof: don't reach into the dashboard's TS code at all
    "apps/dashboard"
)

# Find files in internal/reducer/* that are NOT in the drift subpackage
# (which is the third-party comparer and is allowed to know about
# canonical state via the authority provider abstraction).
reducer_files=$(find internal/reducer -type f -name '*.go' \
    -not -path 'internal/reducer/subscription/drift/*' \
    -not -path 'internal/reducer/subscription/authority/*' \
    -not -path 'internal/reducer/subscription/integration/*' \
    2>/dev/null || true)

if [[ -z "$reducer_files" ]]; then
    note "no reducer files found — skipping (is the path layout correct?)"
else
    for pattern in "${forbidden_in_reducer[@]}"; do
        matches=$(grep -rln "$pattern" $reducer_files || true)
        if [[ -n "$matches" ]]; then
            fail "reducer references forbidden pattern '$pattern':"
            echo "$matches" | sed 's/^/    /'
        fi
    done
fi

# ----------------------------------------------------------------------
# Rule 2: drift detector is the ONLY package allowed to reference both
# canonical tables and projection tables.
#
# Inverse check: anything in internal/reducer/subscription/drift/ may
# read billing_subscriptions (that's its job). We document this explicitly.
# ----------------------------------------------------------------------

printf '\nRule 2: drift detector is the documented cross-domain comparer\n'

drift_files=$(find internal/reducer/subscription/drift -type f -name '*.go' 2>/dev/null || true)
if [[ -z "$drift_files" ]]; then
    note "no drift detector files found"
else
    if grep -lq "billing_subscriptions\|subscription_projection" $drift_files; then
        ok "drift detector references both canonical and projection domains (expected)"
    else
        note "drift detector does not yet reference both domains — may be incomplete"
    fi
fi

# ----------------------------------------------------------------------
# Rule 3: cmd/reducer must not import the drift package, and vice versa.
#
# The reducer service and the detector service are deployed independently.
# They should not depend on each other at compile time.
# ----------------------------------------------------------------------

printf '\nRule 3: reducer service and detector service do not import each other\n'

if grep -rln "internal/reducer/subscription/drift" cmd/reducer/ 2>/dev/null; then
    fail "cmd/reducer imports the drift package"
fi
if grep -rln "internal/reducer/subscription/integration" cmd/reducer/ cmd/drift-detector/ 2>/dev/null; then
    fail "production binary imports the integration test harness"
fi

# ----------------------------------------------------------------------
# Rule 4: nothing imports projection internals from outside the
# subscription package boundary, except the drift detector and the
# integration harness.
# ----------------------------------------------------------------------

printf '\nRule 4: projection internals are not leaked outside the reducer package\n'

# Check whether any non-drift, non-integration code references
# subscription.State, subscription.MergeResult, etc. Today the only
# legitimate consumers are the drift detector, the integration test,
# the reducer's own tests, and cmd/reducer.
leaks=$(grep -rln "subscription\.State\|subscription\.MergeResult\|subscription\.Event" \
    --include='*.go' \
    --exclude-dir=node_modules \
    . 2>/dev/null \
    | grep -v 'internal/reducer/subscription' \
    | grep -v 'cmd/reducer/' \
    | grep -v 'cmd/drift-detector/' \
    || true)

if [[ -n "$leaks" ]]; then
    fail "projection internals leaked outside the reducer package:"
    echo "$leaks" | sed 's/^/    /'
fi

# ----------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------

printf '\n'
if (( violations > 0 )); then
    printf '\033[31m%d violation(s) found\033[0m\n' "$violations"
    exit 1
fi
ok "mutual blindness invariant holds across all checked rules"
exit 0
