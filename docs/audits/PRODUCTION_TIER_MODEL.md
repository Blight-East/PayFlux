# Production Tier Model - Final Configuration

## Validation Result

✅ **REGISTRY_VALIDATION: PASS**

All tier configurations validated successfully against canonical signal registry.

---

## Tier Architecture Summary

### Baseline (Internal Only)
- **Signal Count**: 2
- **Access Level**: Authentication only
- **Categories**: rejection, validation
- **Signals**:
  - `sig_001_auth_missing_bearer`
  - `sig_002_auth_revoked_key`
- **Purpose**: Internal development and testing only
- **Customer Exposure**: Not available for customer purchase

### Proof
- **Signal Count**: 18
- **Access Level**: Core signals (all non-advanced)
- **Categories**: anomaly, integrity, rejection, threshold, validation
- **Max Risk Level**: critical
- **Evidence Capability**: basic_export
- **Purpose**: Production environments requiring risk monitoring
- **Positioning**: Adds anomaly detection and risk classification

### Shield
- **Signal Count**: 18
- **Access Level**: Core signals (identical to Proof)
- **Categories**: anomaly, integrity, rejection, threshold, validation
- **Max Risk Level**: critical
- **Evidence Capability**: basic_export
- **Purpose**: Unlimited duration version of Proof
- **Positioning**: Adds anomaly detection and risk classification
- **Differentiation**: Duration-based pricing, not signal access

### Fortress
- **Signal Count**: 31
- **Access Level**: Full signal access (global wildcard)
- **Categories**: anomaly, contract, integrity, rejection, telemetry, threshold, transformation, validation
- **Max Risk Level**: critical
- **Evidence Capability**: canonical_export
- **Purpose**: Enterprise operations requiring full observability and compliance
- **Positioning**: Full signal access including all telemetry and transformations

---

## Signal Distribution by Tier

| Tier     | Signal Count | Categories | Advanced Signals |
|----------|--------------|------------|------------------|
| baseline | 2            | 2          | 0                |
| proof    | 18           | 5          | 0                |
| shield   | 18           | 5          | 0                |
| fortress | 31           | 8          | 13               |

---

## Configuration Changes

### Previous Configuration
```json
{
  "baseline": ["sig_001_auth_missing_bearer", "sig_002_auth_revoked_key"],
  "proof": ["sig_*"],
  "shield": ["sig_*"],
  "fortress": ["*"]
}
```

### New Configuration
```json
{
  "baseline": ["sig_001_auth_missing_bearer", "sig_002_auth_revoked_key"],
  "proof": [18 explicit core signals],
  "shield": [18 explicit core signals - identical to proof],
  "fortress": ["*"]
}
```

### Key Changes
1. **Proof**: Changed from wildcard `sig_*` to explicit 18 core signals
2. **Shield**: Changed from wildcard `sig_*` to explicit 18 core signals (identical to Proof)
3. **Fortress**: Unchanged - retains global wildcard `*`
4. **Baseline**: Unchanged - 2 signals only

---

## Advanced Signals (Fortress-Only)

The following 13 signals are exclusive to Fortress tier:

### Telemetry (6 signals)
- `sig_025_telemetry_stream_length`
- `sig_026_telemetry_pending_count`
- `sig_027_telemetry_backpressure_warning`
- `sig_028_telemetry_export_success`
- `sig_029_telemetry_degraded_count`
- `sig_030_telemetry_last_good_at`

### Transformation (6 signals)
- `sig_019_transform_forbidden_key_strip`
- `sig_020_transform_key_sort`
- `sig_021_transform_severity_coerce`
- `sig_022_transform_merchant_sort`
- `sig_023_transform_artifact_sort`
- `sig_024_transform_canonicalize`

### Contract (1 signal)
- `sig_031_contract_forbidden_key`

---

## Proof vs Shield Verification

✅ **IDENTICAL SIGNAL ACCESS CONFIRMED**

Both Proof and Shield tiers have:
- Same 18 signals
- Same 5 categories
- Same risk level access (critical)
- Same evidence capability (basic_export)

**Differentiation**: Duration-based pricing model, not feature gating.

---

## Validation Checks

✅ All signals mapped to tiers  
✅ No duplicate signal IDs  
✅ No nonexistent signals referenced  
✅ Proof and Shield have identical signal access  
✅ Fortress has full signal access (31/31)  
✅ Baseline restricted to 2 signals only  
✅ All tier patterns resolve correctly  

---

## Production Readiness

✅ **APPROVED FOR PRODUCTION**

- Configuration validated against canonical registry
- Tier access verified via `TierRegistry.ResolveSignalAccess()`
- All tests passing
- Zero signal access differences between Proof and Shield
- Fortress correctly grants full access via global wildcard
- Baseline correctly restricted to internal use only
