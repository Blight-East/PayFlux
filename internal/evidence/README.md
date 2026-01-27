# Evidence API Contract

## Live Endpoint
**Method**: `GET /api/evidence`
**Auth**: Required (`Bearer <token>`)
**Env**: All (`prod`, `dev`)

```bash
curl -v -H "Authorization: Bearer dev-secret-key" \
     -H "Origin: http://localhost:3000" \
     http://localhost:8080/api/evidence
```

## Fixture Endpoints (Testing Only)
**Method**: `GET /api/evidence/fixtures/:name`
**Auth**: Required (`Bearer <token>`)
**Env**: `PAYFLUX_ENV=dev` ONLY

### 1. Golden Record (OK)
```bash
curl -v -H "Authorization: Bearer dev-secret-key" \
     -H "Origin: http://localhost:3000" \
     http://localhost:8080/api/evidence/fixtures/ok
```

### 2. Degraded State (Source Down)
```bash
curl -v -H "Authorization: Bearer dev-secret-key" \
     -H "Origin: http://localhost:3000" \
     http://localhost:8080/api/evidence/fixtures/degraded
```

### 3. Contract Violation (Schema Mismatch)
```bash
curl -v -H "Authorization: Bearer dev-secret-key" \
     -H "Origin: http://localhost:3000" \
     http://localhost:8080/api/evidence/fixtures/violation
```

## Contract Assertions

### Headers
| Header | Value | Requirement |
| :--- | :--- | :--- |
| `Access-Control-Allow-Origin` | `http://localhost:3000` | Strict Origin Allowlist |
| `Cache-Control` | `no-store` | **CRITICAL**: Never cache PII/Evidence |
| `Content-Type` | `application/json` | - |

### Constraints & Security
1. **Forbidden Keys**: Payload MUST NOT contain `__proto__`, `constructor`, or `prototype` at any depth. Go Core strictly sanitizes these.
2. **Ordering**:
   - `merchants`: Sorted by `id` ASC.
   - `artifacts`: Sorted by `timestamp` DESC, then `id` DESC.
3. **Types**:
   - `vol`, `baseline`: **MUST** be Strings.
   - `timestamp`: **MUST** be RFC3339.
