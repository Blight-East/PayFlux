# System Boundary Definition


Last Updated: 2026-02-17
**System Name**: PayFlux
**Version**: 1.0.0
**Date**: 2026-02-16

## 1. System Scope
PayFlux is a deterministic payment risk orchestrator that sits between the merchant checkout flow and payment processors. It provides real-time risk scoring, adaptive baselining, and tier-based entitlement enforcement.

### In-Scope Components
The following domains constitute the PayFlux system boundary:

| Domain | Layer | Purpose |
|---|---|---|
| **Persistence** | foundation | PII redaction, Redis Streams, atomic file writes |
| **Config** | foundation | Signal resolution, runtime overrides, audit logging |
| **Observability** | foundation | Prometheus metrics for signals, tiers, enforcement |
| **Rate Limiting** | foundation | Atomic token-bucket rate limiter |
| **Runtime** | core | Decision engine, adaptive baseline, causal analysis |
| **Risk** | core | Sliding-window risk scoring, warning store |
| **Tiers** | core | Tier registry, tier-to-signal mapping |
| **Entitlements** | core | Tier entitlements registry, enforcement middleware |
| **Evidence** | core | Evidence envelope generation, canonicalization |
| **API** | interface | HTTP ingest, evidence export, pilot dashboard |
| **Admin** | interface | Internal signal override API handlers |
| **CLI** | interface | Binary entry points |
| **Specs** | support | Signal registry schema, registry validation |
| **Test Harness** | support | Anomaly detection testing, telemetry analysis |
| **Infrastructure** | support | Docker, k8s, deployment scripts |
| **Dashboard** | external | Trust dashboard (separate application) |
| **Architecture** | support | Static architecture contract enforcement |

## 2. Trust Boundaries

### External Boundary (Untrusted)
- **Public API**: Accepts traffic from authenticated merchants.
- **Dashboard**: Consumes read-only APIs from PayFlux.

### Internal Boundary (Trusted)
- **Core Runtime**: Processes events, maintains state.
- **Persistence Layer**: Redis and Local Filesystem.
- **Admin API**: Accessible only to system operators.

## 3. External Dependencies
- **Redis**: Primary persistence for streams and rate limiting state.
- **Prometheus**: Metrics collection (scrape target).
- **Stripe**: Payment processor (upstream signal source).
- **Merchant Systems**: Downstream consumers of risk decisions.

## 4. Out-of-Scope Systems
- **Payment Processing**: Actual money movement is handled by processors (e.g., Stripe).
- **Card Schemes**: Visa/Mastercard networks.
- **Identity Provider**: Authentication is handled via API keys; user management is external.
