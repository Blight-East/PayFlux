# Signal Runtime Overrides

## Overview

The Signal Runtime Override system provides live control over signal behavior without modifying detection logic or requiring redeploys. This enables emergency mitigation, enterprise custom tuning, and safe experimentation.

## Precedence Model

Signal configuration is resolved in the following order (highest to lowest priority):

1. **Live Overrides** (in-memory, via admin API)
2. **Runtime Config** (`config/signals.runtime.json`)
3. **Canonical Spec** (`internal/specs/signal-registry.v1.json`)

### Field-Level Precedence

Overrides are applied at the field level, not the object level. This means:

- If you override `enabled`, other fields remain from runtime config
- If you override `severity`, `enabled` and `type` remain from runtime config
- Partial overrides are fully supported

**Example:**

```
Runtime Config:
  enabled: true
  severity: "warning"
  type: "threshold"

Override:
  enabled: false

Effective Config:
  enabled: false        ← from override
  severity: "warning"   ← from runtime config
  type: "threshold"     ← from runtime config
```

## Failure Behavior

The system is designed to fail safely:

| Condition | Behavior |
|-----------|----------|
| Override store fails | Ignore overrides, use runtime config |
| Invalid override | Reject write (HTTP 400), no change |
| Corrupt override | Ignore entry, use runtime config |
| Feature disabled | Fall back to `GetSignalConfig()` |

**Critical:** System never crashes due to override failures.

## API Contract

### Authentication

All admin API endpoints require the `X-Internal-Auth` header:

```bash
X-Internal-Auth: <PAYFLUX_INTERNAL_AUTH_TOKEN>
```

Missing or invalid token → HTTP 401

### Endpoints

#### List All Signals

```http
GET /internal/signals
```

**Response (HTTP 200):**
```json
[
  {
    "signal_id": "sig_001_auth_missing_bearer",
    "effective_config": {
      "severity": "missing_key",
      "deterministic": true,
      "type": "validation",
      "enabled": true
    },
    "override_active": false
  }
]
```

#### Get Single Signal

```http
GET /internal/signals/:id
```

**Response (HTTP 200):**
```json
{
  "signal_id": "sig_001_auth_missing_bearer",
  "effective_config": {
    "severity": "missing_key",
    "deterministic": true,
    "type": "validation",
    "enabled": false
  },
  "override_active": true,
  "override": {
    "enabled": false,
    "updated_at": 1707945600
  }
}
```

**Error (HTTP 404):**
```json
{
  "error": "not_found",
  "message": "Signal sig_999_unknown not found"
}
```

#### Update Signal Override

```http
PATCH /internal/signals/:id
Content-Type: application/json

{
  "enabled": false,
  "severity": "critical",
  "threshold": 0.9
}
```

**Validation Rules:**
- `enabled`: boolean (optional)
- `severity`: string, must be in allowed list (optional)
- `threshold`: float, must be in [0, 1] (optional)
- Unknown fields → HTTP 400

**Response (HTTP 200):**
```json
{
  "signal_id": "sig_013_risk_band_critical",
  "effective_config": {
    "severity": "critical",
    "deterministic": true,
    "type": "threshold",
    "enabled": false
  },
  "override_active": true,
  "override": {
    "enabled": false,
    "severity": "critical",
    "threshold": 0.9,
    "updated_at": 1707945600
  }
}
```

#### Clear Signal Override

```http
DELETE /internal/signals/:id
```

**Response (HTTP 200):**
```json
{
  "signal_id": "sig_001_auth_missing_bearer",
  "effective_config": {
    "severity": "missing_key",
    "deterministic": true,
    "type": "validation",
    "enabled": true
  },
  "override_active": false
}
```

## Example Requests

### Disable a Signal

```bash
curl -X PATCH \
  -H "X-Internal-Auth: $PAYFLUX_INTERNAL_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}' \
  http://localhost:8080/internal/signals/sig_001_auth_missing_bearer
```

### Change Severity

```bash
curl -X PATCH \
  -H "X-Internal-Auth: $PAYFLUX_INTERNAL_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"severity": "critical"}' \
  http://localhost:8080/internal/signals/sig_013_risk_band_critical
```

### Set Threshold

```bash
curl -X PATCH \
  -H "X-Internal-Auth: $PAYFLUX_INTERNAL_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"threshold": 0.9}' \
  http://localhost:8080/internal/signals/sig_013_risk_band_critical
```

### Clear Override

```bash
curl -X DELETE \
  -H "X-Internal-Auth: $PAYFLUX_INTERNAL_AUTH_TOKEN" \
  http://localhost:8080/internal/signals/sig_001_auth_missing_bearer
```

### List All Signals

```bash
curl -H "X-Internal-Auth: $PAYFLUX_INTERNAL_AUTH_TOKEN" \
  http://localhost:8080/internal/signals
```

## Rollback Strategy

### Emergency Rollback (Disable Feature)

```bash
# Set environment variable
export PAYFLUX_SIGNAL_OVERRIDES_ENABLED=false

# Restart service
systemctl restart payflux
```

All overrides immediately ignored, system uses runtime config.

### Clear Single Override

```bash
signalctl clear sig_001_auth_missing_bearer
```

### Clear All Overrides

Restart service (overrides are in-memory only):

```bash
systemctl restart payflux
```

### Restore Original Config

Delete override, effective config reverts to runtime config:

```bash
curl -X DELETE \
  -H "X-Internal-Auth: $PAYFLUX_INTERNAL_AUTH_TOKEN" \
  http://localhost:8080/internal/signals/sig_001_auth_missing_bearer
```

## Performance Characteristics

### Latency Guarantees

- `GetEffectiveSignalConfig()`: <50ns/op
- O(1) lookup time
- Zero allocations in hot path
- Lock-free reads

### Scalability

- Supports 1000+ signals
- Concurrent reads: unlimited
- Concurrent writes: atomic, safe

### Benchmark Results

```
BenchmarkGetEffectiveSignalConfig-8    50000000    30 ns/op    0 B/op    0 allocs/op
```

## Security Model

### Authentication

- All admin API endpoints require `X-Internal-Auth` header
- Token validated using constant-time comparison (prevents timing attacks)
- Token must match `PAYFLUX_INTERNAL_AUTH_TOKEN` environment variable

### Authorization

- No role-based access control (RBAC)
- Binary: valid token = full access
- Recommendation: Use network-level restrictions (firewall, VPC)

### Attack Surface

- Admin API only accessible if feature enabled
- Feature disabled by default (`PAYFLUX_SIGNAL_OVERRIDES_ENABLED=false`)
- No public-facing endpoints

## Monitoring

### Prometheus Metrics

```
# Signal enabled state (0=disabled, 1=enabled)
signal_enabled{signal_id="sig_001_auth_missing_bearer"} 1

# Override active (0=no override, 1=override active)
signal_override_active{signal_id="sig_001_auth_missing_bearer"} 0

# Last override timestamp (unix)
signal_last_override_timestamp{signal_id="sig_001_auth_missing_bearer"} 1707945600
```

### Recommended Alerts

```yaml
# Alert on unexpected override changes
- alert: UnexpectedSignalOverride
  expr: signal_override_active == 1
  for: 5m
  annotations:
    summary: "Signal {{ $labels.signal_id }} has an active override"

# Alert on disabled critical signals
- alert: CriticalSignalDisabled
  expr: signal_enabled{signal_id=~".*critical.*"} == 0
  for: 1m
  annotations:
    summary: "Critical signal {{ $labels.signal_id }} is disabled"
```

## CLI Tool Usage

### Installation

```bash
go build -o signalctl cmd/signalctl/main.go
```

### Configuration

```bash
export PAYFLUX_INTERNAL_AUTH_TOKEN=your-token-here
export PAYFLUX_BASE_URL=http://localhost:8080  # optional
```

### Commands

```bash
# List all signals
signalctl list

# Enable signal
signalctl enable sig_001_auth_missing_bearer

# Disable signal
signalctl disable sig_001_auth_missing_bearer

# Set threshold
signalctl set-threshold sig_013_risk_band_critical 0.9

# Clear override
signalctl clear sig_001_auth_missing_bearer
```

## Use Cases

### Emergency Mitigation

Disable misbehaving signal immediately:

```bash
signalctl disable sig_017_anomaly_traffic_spike
```

### Enterprise Custom Tuning

Adjust thresholds for specific customer requirements:

```bash
signalctl set-threshold sig_013_risk_band_critical 0.95
```

### Safe Experimentation

Test new severity levels without code changes:

```bash
signalctl set-severity sig_011_risk_band_elevated critical
```

### Tier Enforcement

Disable premium signals for free tier:

```bash
signalctl disable sig_018_anomaly_geo_entropy
```

## Operational Runbook

### Scenario: Signal Causing False Positives

1. Identify problematic signal from logs/metrics
2. Disable signal immediately:
   ```bash
   signalctl disable sig_XXX_problem_signal
   ```
3. Investigate root cause
4. Fix detection logic in code
5. Deploy fix
6. Re-enable signal:
   ```bash
   signalctl clear sig_XXX_problem_signal
   ```

### Scenario: Customer Requests Custom Threshold

1. Verify customer tier allows customization
2. Set override:
   ```bash
   signalctl set-threshold sig_013_risk_band_critical 0.95
   ```
3. Monitor metrics for impact
4. Document override in customer record

### Scenario: Rollback After Bad Override

1. Clear specific override:
   ```bash
   signalctl clear sig_XXX_bad_override
   ```
2. Or disable entire feature:
   ```bash
   export PAYFLUX_SIGNAL_OVERRIDES_ENABLED=false
   systemctl restart payflux
   ```

## Limitations

- Overrides are in-memory only (lost on restart)
- No persistence layer
- No audit log (use Prometheus metrics for tracking)
- No multi-tenancy support
- No gradual rollout capability

## Future Enhancements

- Persistent override storage (Redis/database)
- Audit log for compliance
- Multi-tenancy (per-customer overrides)
- Gradual rollout (percentage-based)
- Override expiration (time-based)
- Override scheduling (cron-like)
