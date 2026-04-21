# Change Control Policy


Last Updated: 2026-02-17
## 1. Commit Verification
All changes to the PayFlux codebase must go through the following verification gates:

- **Linting**: Static code analysis.
- **Unit Tests**: `go test ./...` must pass.
- **Build**: `go build` must succeed.
- **Architecture Contract**: `archscanner` must return `VERIFIED`.

## 2. CI Gating
GitHub Actions workflows enforce all verification steps. Merging to `main` is blocked unless all checks pass.

### Workflow: Architecture Contract
1.  **Build Scanner**: Compiles the `archscanner` tool.
2.  **Scan**: Executes scanner against the codebase.
3.  **Validate**: Ensures output matches `ARCHITECTURE CONTRACT: VERIFIED`.
4.  **Determinism**: Runs scanner twice to ensure identical output.

## 3. Release Rules
- **Semantic Versioning**: All releases follow SemVer (Major.Minor.Patch).
- **Artifact Generation**: Release artifacts (binaries, Docker images) are generated only from the verified `main` branch.
- **Immutable Tags**: Docker tags for releases are immutable.

## 4. Rollback Policy
In the event of a critical failure:
1.  **Identify**: Alert triggers via Prometheus/PagerDuty.
2.  **Revert**: Revert the commit in git.
3.  **Redeploy**: CI/CD pipeline deploys the previous stable version.
4.  **Post-Mortem**: Incident analysis required within 24 hours.
