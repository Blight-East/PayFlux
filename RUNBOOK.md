# PayFlux Operational Runbook

This guide provides concise procedures for common operational scenarios. PayFlux is an **observability buffer**, not an audit system; prioritize system health and throughput.

## Common Scenarios

### 1. High Lag / Stuck Messages (XPENDING > 0)
**Symptoms:** `payflux_consumer_pending_messages` metrics > 0 for extended periods.
- **Cause:** Consumers are crashing, slow, or Redis connection is flaky.
- **Action:**
  1. Check consumer logs: `journalctl -u payflux -f`
  2. Verify Redis health: `redis-cli PING`
  3. Restart consumers to trigger `XAutoClaim` of stuck messages.
  4. Check for "poison pills" in logs (unmarshal errors).

### 2. Redis Unavailable
**Symptoms:** `redis_connect_failed` in logs; HTTP 500s on ingest.
- **Action:** 
  - PayFlux handlers will return error when Redis is down.
  - Consumers will use **exponential backoff** (100ms -> 2s) and automatically resume when Redis returns.
  - No manual intervention needed for recovery once Redis is back.

### 3. Export Failures
**Symptoms:** `export_error` metrics or `export_file_error` in logs.
- **File Mode:** Check permissions on `PAYFLUX_EXPORT_FILE`. Ensure disk is not full.
- **Stdout Mode:** Confirm log shipper (Vector/Fluent Bit) is alive and consuming stdout.
- **Action:** Fix destination. Events are still ACKed in Redis to prevent head-of-line blocking (best-effort export).

## Performance Tuning

### Throttled Traffic
If seeing `ingest_rejected` (429 Too Many Requests):
1. Increase `PAYFLUX_RATELIMIT_RPS`.
2. Check if a single `merchant_id` is flooding the system.

### Memory Pressure
If Redis memory is high:
1. Decrease `PAYFLUX_STREAM_MAXLEN` (default 200,000).
2. Use `redis-cli XTRIM events_stream MAXLEN 100000` for emergency cleanup.

## Processor Risk Score (High/Critical)

If `processor_risk_band` hits `high` or `critical`:

1. **Check Drivers**: Look at the `processor_risk_drivers` array in the logs to see what's triggering the signal (e.g., `timeout_clustering`).
2. **Compare Baselines**: Check `/metrics` for `payflux_processor_risk_score_last` across all processors. If only one is high, it's likely an upstream provider issue.
3. **Action**: Notify the processor or shift traffic if using a router.

---
*Runbook v0.2.2*
