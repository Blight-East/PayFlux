REGISTRY_VALIDATION: PASS

# TIER SUMMARY TABLE

| Tier       | Signal Count  | Categories                               | Max Risk Level  | Evidence Capability       | Positioning Label                                  |
|------------|---------------|------------------------------------------|-----------------|---------------------------|--------------------------------------------------|
| baseline   | 2             | rejection, validation                    | none            | basic_export              | Authentication validation and basic event ingestion |
| proof      | 31            | anomaly, contract, integrity, rejection, telemetry, threshold, transformation, validation | critical        | canonical_export          | Adds anomaly detection and risk classification     |
| shield     | 31            | anomaly, contract, integrity, rejection, telemetry, threshold, transformation, validation | critical        | canonical_export          | Adds anomaly detection and risk classification     |
| fortress   | 31            | anomaly, contract, integrity, rejection, telemetry, threshold, transformation, validation | critical        | canonical_export          | Full signal access including all telemetry and transformations |

# SIGNAL → TIER MATRIX

[
  {
    "signal_id": "sig_014_anomaly_high_failure_rate",
    "name": "Anomaly High Failure Rate",
    "category": "anomaly",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_015_anomaly_retry_pressure",
    "name": "Anomaly Retry Pressure",
    "category": "anomaly",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_016_anomaly_timeout_clustering",
    "name": "Anomaly Timeout Clustering",
    "category": "anomaly",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_017_anomaly_traffic_spike",
    "name": "Anomaly Traffic Spike",
    "category": "anomaly",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_018_anomaly_geo_entropy",
    "name": "Anomaly Geo Entropy",
    "category": "anomaly",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_031_contract_forbidden_key",
    "name": "Contract Forbidden Key",
    "category": "contract",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_008_deduplication_detected",
    "name": "Deduplication Detected",
    "category": "integrity",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_002_auth_revoked_key",
    "name": "Auth Revoked Key",
    "category": "rejection",
    "deterministic": true,
    "allowed_tiers": [
      "baseline",
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "baseline"
  },
  {
    "signal_id": "sig_003_auth_invalid_key",
    "name": "Auth Invalid Key",
    "category": "rejection",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_025_telemetry_stream_length",
    "name": "Telemetry Stream Length",
    "category": "telemetry",
    "deterministic": false,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_026_telemetry_pending_count",
    "name": "Telemetry Pending Count",
    "category": "telemetry",
    "deterministic": false,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_027_telemetry_backpressure_warning",
    "name": "Telemetry Backpressure Warning",
    "category": "telemetry",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_028_telemetry_export_success",
    "name": "Telemetry Export Success",
    "category": "telemetry",
    "deterministic": false,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_029_telemetry_degraded_count",
    "name": "Telemetry Degraded Count",
    "category": "telemetry",
    "deterministic": false,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_030_telemetry_last_good_at",
    "name": "Telemetry Last Good At",
    "category": "telemetry",
    "deterministic": false,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_004_rate_limit_exceeded_atomic",
    "name": "Rate Limit Exceeded Atomic",
    "category": "threshold",
    "deterministic": false,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_009_risk_insufficient_data",
    "name": "Risk Insufficient Data",
    "category": "threshold",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_010_risk_cardinality_limit",
    "name": "Risk Cardinality Limit",
    "category": "threshold",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_011_risk_band_elevated",
    "name": "Risk Band Elevated",
    "category": "threshold",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_012_risk_band_high",
    "name": "Risk Band High",
    "category": "threshold",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_013_risk_band_critical",
    "name": "Risk Band Critical",
    "category": "threshold",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_019_transform_forbidden_key_strip",
    "name": "Transform Forbidden Key Strip",
    "category": "transformation",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_020_transform_key_sort",
    "name": "Transform Key Sort",
    "category": "transformation",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_021_transform_severity_coerce",
    "name": "Transform Severity Coerce",
    "category": "transformation",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_022_transform_merchant_sort",
    "name": "Transform Merchant Sort",
    "category": "transformation",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_023_transform_artifact_sort",
    "name": "Transform Artifact Sort",
    "category": "transformation",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_024_transform_canonicalize",
    "name": "Transform Canonicalize",
    "category": "transformation",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_001_auth_missing_bearer",
    "name": "Auth Missing Bearer",
    "category": "validation",
    "deterministic": true,
    "allowed_tiers": [
      "baseline",
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "baseline"
  },
  {
    "signal_id": "sig_005_event_uuid_invalid",
    "name": "Event Uuid Invalid",
    "category": "validation",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_006_event_timestamp_invalid",
    "name": "Event Timestamp Invalid",
    "category": "validation",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  },
  {
    "signal_id": "sig_007_processor_invalid",
    "name": "Processor Invalid",
    "category": "validation",
    "deterministic": true,
    "allowed_tiers": [
      "proof",
      "shield",
      "fortress"
    ],
    "highest_required_tier": "proof",
    "restricted_reason": "tier_restricted"
  }
]

# TIER VALUE EXPLANATIONS

## Tier: baseline

**Purpose**: Provides authentication validation and basic event ingestion capabilities

**Designed For**: Development and testing environments

**Unlocks**:
• rejection signals
• validation signals

**Limitations**:
• No risk band classification
• No system telemetry visibility
• No canonical evidence transformation

## Tier: proof

**Purpose**: Adds anomaly detection and risk scoring for operational visibility

**Designed For**: Production environments requiring risk monitoring

**Unlocks**:
• anomaly signals
• contract signals
• integrity signals
• rejection signals
• telemetry signals
• threshold signals
• transformation signals
• validation signals

**Limitations**:
• None

## Tier: shield

**Purpose**: Adds anomaly detection and risk scoring for operational visibility

**Designed For**: Production environments requiring risk monitoring

**Unlocks**:
• anomaly signals
• contract signals
• integrity signals
• rejection signals
• telemetry signals
• threshold signals
• transformation signals
• validation signals

**Limitations**:
• None

## Tier: fortress

**Purpose**: Provides unrestricted access to all signals including telemetry and evidence transformation

**Designed For**: Enterprise operations requiring full observability and compliance

**Unlocks**:
• anomaly signals
• contract signals
• integrity signals
• rejection signals
• telemetry signals
• threshold signals
• transformation signals
• validation signals

**Limitations**:
• None

# DIFFERENTIAL VALUE ANALYSIS

## baseline → proof

**New Signals Gained**: 29

**New Categories Gained**: anomaly, contract, integrity, rejection, telemetry, threshold, transformation, validation

**New Operational Visibility**: Anomaly pattern detection, System health monitoring, Risk threshold classification

**New Incident Prevention Capability**: Early detection of payment failures, Backpressure and lag detection, Risk band escalation visibility

## proof → shield

**New Signals Gained**: 0

**New Categories Gained**: 

**New Operational Visibility**: None

**New Incident Prevention Capability**: None

## shield → fortress

**New Signals Gained**: 0

**New Categories Gained**: 

**New Operational Visibility**: None

**New Incident Prevention Capability**: None

# PRICING JUSTIFICATION DATASET

{
  "baseline": {
    "signal_count": 2,
    "value_density": "low",
    "recommended_price_anchor": "entry_tier"
  },
  "proof": {
    "signal_count": 31,
    "value_density": "maximum",
    "recommended_price_anchor": "enterprise_tier"
  },
  "shield": {
    "signal_count": 31,
    "value_density": "maximum",
    "recommended_price_anchor": "enterprise_tier"
  },
  "fortress": {
    "signal_count": 31,
    "value_density": "maximum",
    "recommended_price_anchor": "enterprise_tier"
  }
}
