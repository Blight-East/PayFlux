# Sonar Bash Test Modernization

**Branch**: `chore/sonar-bash-tests`  
**Commit**: `0394698`

## Summary
Mechanical upgrade of bash test conditions from `[ ... ]` to `[[ ... ]]` across 5 scripts to resolve Sonar issue "Use [[ instead of [ for conditional tests".

## Files Modified

| File | Changes | Syntax Check |
|:-----|:--------|:-------------|
| `apps/dashboard/scripts/smoke.sh` | 3 conditions | ✅ PASS |
| `examples/ops-observability/smoke_test.sh` | 9 conditions | ✅ PASS |
| `scripts/certify.sh` | 6 conditions | ✅ PASS |
| `scripts/tier_smoke_test.sh` | 1 condition | ✅ PASS |
| `scripts/verify_pilot.sh` | 36 conditions | ✅ PASS |

**Total**: 55 insertions(+), 55 deletions(-)

## Changes Applied

### Pattern Replacements
- `if [ condition ]; then` → `if [[ condition ]]; then`
- `elif [ condition ]; then` → `elif [[ condition ]]; then`
- `[ condition ] && action` → `[[ condition ]] && action`
- Compound conditions: `[ a ] && [ b ]` → `[[ a ]] && [[ b ]]`

### Safety Verification
- ✅ All scripts have `#!/bin/bash` shebang
- ✅ All scripts passed `bash -n` syntax check
- ✅ No logic changes - purely mechanical syntax upgrade
- ✅ Spacing preserved: `[[ condition ]]` (correct)
- ✅ No modifications to shebangs, variables, or command structure

## Excluded Files
- `run_rerun.sh` - Already modernized in previous PR (`chore/sonar-fixpack-1`)

## Verification Commands
```bash
bash -n apps/dashboard/scripts/smoke.sh
bash -n examples/ops-observability/smoke_test.sh
bash -n scripts/certify.sh
bash -n scripts/tier_smoke_test.sh
bash -n scripts/verify_pilot.sh
```

All checks: ✅ PASS
