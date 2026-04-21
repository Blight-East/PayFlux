# Deployment Pipeline


Last Updated: 2026-02-17
## 1. Build Process
1.  **Source**: `main` branch of `payment-node`.
2.  **Tool**: `go build`.
3.  **Output**: Static binary `payflux`.

## 2. Verification Steps (CI)
Before any artifact is promoted:
1.  **Architecture Scan**: Verify code matches taxonomy.
2.  **Compliance Scan**: Verify all compliance docs exist.
3.  **Unit Tests**: Run all tests with coverage.
4.  **Launch Gate**: Run `scripts/launch_gate_runner.sh`.

## 3. Deployment Path
1.  **Staging**: Deploy to internal staging cluster.
    - Run integration tests.
    - Verify healthchecks.
2.  **Production**: Canary deploy to 5% of traffic.
    - Monitor `error_rate` and `latency_p95`.
    - Promote to 100% if stable.

## 4. Artifact Provenance
Docker images are signed and tagged with the git SHA.
`docker inspect <image> | grep "org.opencontainers.image.revision"` matches the source commit.
