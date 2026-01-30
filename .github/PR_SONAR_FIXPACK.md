# Sonar Fix Pack

**Branch**: `chore/sonar-fixpack-1` → `main`

## Summary
Mechanical, low-risk Sonar fixes to reduce noise without changing product behavior. All changes verified with build checks.

## Safety Verification ✅
- [x] Bash `[[` changes: `run_rerun.sh` has `#!/bin/bash` shebang, no CI `sh` invocations found
- [x] Ternary refactor equivalence: `getStatusColor` returns identical classes for all states
  - `OK` → `bg-green-500`
  - `DEGRADED` → `bg-amber-500`
  - `VIOLATION` → `bg-red-500 pulse`
- [x] Build verification: `npm run build` passes in `apps/dashboard`
- [x] Test verification: No test script present in `apps/dashboard`

## Commits (5)

1. **[3970186](https://github.com/user/repo/commit/3970186)** - `chore(sonar): convert node imports to node: specifiers`
   - Convert legacy Node.js imports to `node:` prefix (fs, path, url, crypto, fs/promises)
   - Files: `apps/dashboard/src/lib/*`, `apps/dashboard/src/app/api/**/*`, `apps/dashboard/scripts/*`

2. **[a434877](https://github.com/user/repo/commit/a434877)** - `chore(sonar): remove unused imports and variables`
   - Remove unused imports: `MetadataRoute`, `getBaseUrl`
   - Remove unused catch variables in `stripe/route.ts`, `stripe/test/route.ts`

3. **[fcde084](https://github.com/user/repo/commit/fcde084)** - `chore(sonar): modernize bash script tests to [[ ... ]]`
   - Update `run_rerun.sh` to use `[[ ... ]]` for test conditions
   - Verified: `bash -n` syntax check passes

4. **[9d2226e](https://github.com/user/repo/commit/9d2226e)** - `chore(sonar): fix react label a11y and wire htmlfor to id`
   - Wire `<label>` to controls using `htmlFor` and `id`
   - Files: `connectors/page.tsx`, `setup/connect/page.tsx`

5. **[d16b9bd](https://github.com/user/repo/commit/d16b9bd)** - `chore(sonar): refactor nested ternaries for readability`
   - Extract nested ternary in `EvidencePage` to `getStatusColor` helper
   - Zero logic change, improved readability

## Risk Assessment
- **Behavior Change**: None
- **Build Impact**: Verified clean
- **Deployment Risk**: Zero
