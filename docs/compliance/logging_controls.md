# Logging Controls


Last Updated: 2026-02-17
## 1. PII Protection Strategy
PayFlux employs a "Logsafe" philosophy where all external input is considered toxic until sanitized.

### The `logsafe` Package
- **Responsibility**: Recursive traversal of JSON payloads.
- **Mechanism**: Denylist and Allowlist.
- **Enforcement**: All logging calls must pass payloads through `logsafe.RedactJSON` or `logsafe.SafeFieldsFromWebhook`.

## 2. Redaction Policy

### Forbidden Keys (Denylist)
Values associated with these keys are strictly redacted (replaced with `[REDACTED]`):
- `password`
- `secret`
- `api_key`
- `cvv`
- `pan` (Primary Account Number)
- `track_data`
- `ssn`

### Safe Keys (Allowlist)
Only structural metadata is allowed by default:
- `event_id`
- `timestamp`
- `type`
- `status`
- `merchant_id` (hashed)

## 3. Safe Logging Patterns
**Allowed**:
```go
log.Info("event_processed", logsafe.SafeFieldsFromWebhook(payload))
```

**Forbidden**:
```go
log.Info("raw_payload", string(body)) // FLAGGED BY CI
```

## 4. Audit capabilities
Every modification to system configuration (Overrides) is logged to the `audit.log` with:
- Timestamp
- Operator ID
- Action (Create/Update/Delete)
- Old Value / New Value
- Hash of the change
