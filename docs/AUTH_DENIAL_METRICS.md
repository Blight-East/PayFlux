# Auth Denial Metrics Runbook

## Overview

The `payflux_auth_denied_total` metric tracks authentication failures at the PayFlux ingestion endpoints with reason-specific labels to help diagnose security issues and operational problems.

**Metric Type:** Counter (monotonically increasing)  
**Labels:** `reason` (missing_key | revoked_key | invalid_key)  
**Endpoint:** `/metrics` (unauthenticated)

---

## What Each Reason Means

### `missing_key`
**Cause:** No Authorization header OR malformed Bearer token  
**Common Scenarios:**
- Misconfigured client (forgot to set header)
- Wrong auth scheme (Basic instead of Bearer)
- Empty token after "Bearer " prefix

**Impact:** Low severity if infrequent; clients not configured correctly

---

### `revoked_key`
**Cause:** Token matches an entry in `PAYFLUX_REVOKED_KEYS` denylist  
**Common Scenarios:**
- Key was intentionally revoked after leak
- Client still using old key after rotation
- Attacker attempting to use known-revoked credential

**Impact:** Medium-high severity; indicates either slow client migration or potential security incident

---

### `invalid_key`
**Cause:** Token present but not in `PAYFLUX_API_KEYS` or `PAYFLUX_API_KEY` allowlist  
**Common Scenarios:**
- Typo in API key
- Using test key in production
- Unauthorized access attempt
- Key mismatch after deployment

**Impact:** Medium severity; could indicate attack, misconfiguration, or stale client config

---

## PromQL Queries

### Total Denials (5-minute rate)
```promql
sum(increase(payflux_auth_denied_total[5m]))
```

### Breakdown by Reason
```promql
sum by (reason) (increase(payflux_auth_denied_total[5m]))
```

### Per-Second Rate (1-minute average)
```promql
rate(payflux_auth_denied_total[1m])
```

### Spike Detection
```promql
sum(increase(payflux_auth_denied_total[5m])) > 50
```

### Top Reason (for dashboards)
```promql
topk(1, sum by (reason) (rate(payflux_auth_denied_total[5m])))
```

---

## Response Actions

### For `missing_key` Spikes
1. **Check recent deployments** - Did a client deploy with broken config?
2. **Review client logs** - Are they sending Authorization headers?
3. **Verify documentation** - Is auth example correct?
4. **No immediate security concern** - Usually config issue

### For `revoked_key` Spikes
1. **Expected after key rotation** - Monitor for 24-48h, should decline
2. **If persistent:**
   - Identify which clients (check IP logs externally if available)
   - Contact slow-to-migrate customers
   - Consider removing from `PAYFLUX_REVOKED_KEYS` if false alarm
3. **If unexpected spike with no recent rotation:**
   - **SECURITY INCIDENT** - Someone may have leaked key
   - Review when key was revoked and why
   - Check for correlated invalid_key attempts

### For `invalid_key` Spikes
1. **Check for brute-force pattern** - Repeated attempts from same source?
2. **Review recent key changes** - Did you forget to add new key to allowlist?
3. **Client misconfiguration** - Are they using wrong environment's keys?
4. **If sustained/distributed:**
   - Consider rate limiting at network layer
   - Review security posture
   - Rotate keys as precaution

---

## Key Rotation Procedure

**Zero-downtime rotation:**
1. Generate new API key: `openssl rand -hex 32`
2. Add to allowlist: `PAYFLUX_API_KEYS=<old_key>,<new_key>`
3. Restart PayFlux
4. Migrate clients to new key (coordinate with customers)
5. Monitor `revoked_key` metric after adding old key to `PAYFLUX_REVOKED_KEYS`
6. Once metric drops to zero, remove old key from both lists

**Emergency revocation (key compromised):**
1. Add compromised key to `PAYFLUX_REVOKED_KEYS=<leaked_key>`
2. Restart PayFlux immediately
3. Issue new keys to all affected clients
4. Monitor spike in `revoked_key` (expected)
5. Coordinate urgent client updates

---

## Rate Limit Tuning

If seeing high auth denial rates correlated with rate limit errors:

1. **Check current limits:**
   ```bash
   # In PayFlux env
   echo $PAYFLUX_INGEST_RPS    # default: 100
   echo $PAYFLUX_INGEST_BURST  # default: 500
   ```

2. **Temporarily increase (if legitimate traffic):**
   ```bash
   export PAYFLUX_INGEST_RPS=200
   export PAYFLUX_INGEST_BURST=1000
   ```

3. **Monitor impact** via `payflux_ingest_rate_limited_total` metric

4. **Permanent fix:** Update environment vars in deployment config

---

## Alert Recommendations

### Warning Alert (Actionable)
```yaml
alert: HighAuthDenialRate
expr: rate(payflux_auth_denied_total[5m]) > 0.1  # 6/min
for: 10m
severity: warning
```

### Critical Alert (Incident)
```yaml
alert: AuthDenialStorm
expr: sum(increase(payflux_auth_denied_total[1m])) > 100
for: 2m
severity: critical
```

### Revoked Key Alert (Post-Rotation)
```yaml
alert: RevokedKeyStillInUse
expr: increase(payflux_auth_denied_total{reason="revoked_key"}[15m]) > 10
for: 1h  # Grace period for client migration
severity: warning
```

---

## Metrics Endpoint Access

**URL:** `http://<payflux-host>:<port>/metrics`  
**Auth:** None (publicly exposed for Prometheus scraping)  
**Format:** Prometheus text format

Example scrape:
```bash
curl -s http://localhost:8080/metrics | grep payflux_auth_denied
```

---

## Related Metrics

- `payflux_ingest_rate_limited_total` - Rate limit rejections (429)
- `payflux_ingest_rejected_total` - All rejected events
- `payflux_ingest_accepted_total` - Successfully accepted events

**Cross-reference:** High auth denials + low rate limits = potential DDoS or config issue
