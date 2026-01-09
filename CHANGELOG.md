# Changelog

All notable changes to PayFlux will be documented in this file.

## v0.2.0

- Added automated integration tests (auth, idempotency, DLQ, shutdown)
- Improved export health with atomic timestamps
- Added consumer backoff to prevent Redis tight-loop failures
- Documented external file rotation strategy

## v0.1.x

- Initial production hardening
- Auth, rate limiting, idempotency
- Redis Streams ingestion + crash recovery
- JSON export (stdout/file) and observability
