# PayFlux Signal Registry - Customer Reference

**Total Signals**: 31

## Signal Categories

- **Anomaly**: 5 signals
- **Contract**: 1 signals
- **Integrity**: 1 signals
- **Rejection**: 2 signals
- **Telemetry**: 6 signals
- **Threshold**: 6 signals
- **Transformation**: 6 signals
- **Validation**: 4 signals

---

## Anomaly Signals

**Count**: 5

### High Failure Rate Anomaly

**Signal ID**: `sig_014_anomaly_high_failure_rate`

**What It Detects**: Payment failure rates exceeding 40%

**Why Processors Care**: High failure rates indicate integration issues, fraud, or service degradation

**Business Impact**: Revenue loss, customer experience degradation, processor relationship risk

**Risk Stage**: Anomaly detection

**Evidence Generated**: Failure rate metrics, failure type distribution, temporal patterns

---

### Retry Pressure Spike

**Signal ID**: `sig_015_anomaly_retry_pressure`

**What It Detects**: Retry activity exceeding 50% of traffic

**Why Processors Care**: Excessive retries indicate integration problems or retry storms

**Business Impact**: Increased processor costs, rate limit exhaustion, cascading failures

**Risk Stage**: Anomaly detection

**Evidence Generated**: Retry metrics, retry interval analysis, backoff compliance

---

### Timeout Clustering

**Signal ID**: `sig_016_anomaly_timeout_clustering`

**What It Detects**: Timeout events exceeding 50% of failures

**Why Processors Care**: Timeout clusters indicate network issues, processor latency, or integration problems

**Business Impact**: Transaction abandonment, poor user experience, integration debugging

**Risk Stage**: Anomaly detection

**Evidence Generated**: Timeout distribution, latency percentiles, affected endpoints

---

### Traffic Volatility

**Signal ID**: `sig_017_anomaly_traffic_spike`

**What It Detects**: Traffic volume spikes exceeding 50% deviation from baseline

**Why Processors Care**: Traffic spikes may indicate legitimate growth, campaigns, or abuse

**Business Impact**: Capacity planning, rate limit tuning, fraud detection

**Risk Stage**: Anomaly detection

**Evidence Generated**: Traffic volume metrics, spike timing, growth rate analysis

---

### Geographic Entropy Increase

**Signal ID**: `sig_018_anomaly_geo_entropy`

**What It Detects**: Geographic distribution entropy exceeding 50% increase

**Why Processors Care**: Geo entropy changes may indicate expansion, credential sharing, or fraud

**Business Impact**: Fraud detection, compliance monitoring, business expansion visibility

**Risk Stage**: Anomaly detection

**Evidence Generated**: Geographic distribution, entropy metrics, location diversity

---

## Contract Signals

**Count**: 1

### Forbidden Key Contract

**Signal ID**: `sig_031_contract_forbidden_key`

**What It Detects**: Identification of keys forbidden from evidence payloads

**Why Processors Care**: Enforces data privacy and compliance contracts

**Business Impact**: PCI compliance, data privacy protection, contractual obligations

**Risk Stage**: Contract enforcement

**Evidence Generated**: Forbidden key detection, compliance audit trail

---

## Integrity Signals

**Count**: 1

### Duplicate Event Detected

**Signal ID**: `sig_008_deduplication_detected`

**What It Detects**: Events with IDs that have already been processed

**Why Processors Care**: Duplicates indicate retry behavior, webhook replays, or integration issues

**Business Impact**: Idempotency protection, accurate event counting, retry pattern visibility

**Risk Stage**: Event ingestion

**Evidence Generated**: Deduplication metrics, duplicate event IDs, retry patterns

---

## Rejection Signals

**Count**: 2

### Revoked API Key Usage

**Signal ID**: `sig_002_auth_revoked_key`

**What It Detects**: Requests using API keys that have been explicitly revoked

**Why Processors Care**: Revoked keys may indicate compromised credentials or unauthorized access attempts

**Business Impact**: Service disruption, potential security incident, credential rotation required

**Risk Stage**: Pre-authorization

**Evidence Generated**: Revoked key denial metrics, security audit logs

---

### Invalid API Key

**Signal ID**: `sig_003_auth_invalid_key`

**What It Detects**: Requests with API keys that don't match any valid credentials

**Why Processors Care**: Invalid keys suggest misconfiguration, credential leakage, or brute-force attempts

**Business Impact**: Failed API calls, integration failures, potential security threat

**Risk Stage**: Pre-authorization

**Evidence Generated**: Invalid key denial metrics, failed authentication attempts

---

## Telemetry Signals

**Count**: 6

### Stream Depth Monitoring

**Signal ID**: `sig_025_telemetry_stream_length`

**What It Detects**: Redis stream length measurement every 10 seconds

**Why Processors Care**: Indicates event processing backlog and system health

**Business Impact**: Capacity planning, backpressure detection, SLA monitoring

**Risk Stage**: System telemetry

**Evidence Generated**: Stream depth metrics, backlog trends

---

### Consumer Lag Monitoring

**Signal ID**: `sig_026_telemetry_pending_count`

**What It Detects**: Pending message count in consumer group

**Why Processors Care**: Indicates processing lag and consumer health

**Business Impact**: Processing latency visibility, consumer scaling decisions

**Risk Stage**: System telemetry

**Evidence Generated**: Pending count metrics, consumer lag measurements

---

### Backpressure Alert

**Signal ID**: `sig_027_telemetry_backpressure_warning`

**What It Detects**: Stream depth exceeding configured backpressure threshold

**Why Processors Care**: Real-time detection of system overload that may precede service degradation

**Business Impact**: Proactive scaling, service degradation prevention

**Risk Stage**: System telemetry

**Evidence Generated**: Backpressure warnings, threshold breach logs

---

### Evidence Export Success

**Signal ID**: `sig_028_telemetry_export_success`

**What It Detects**: Successful evidence export to stdout

**Why Processors Care**: Confirms evidence delivery for compliance and auditing

**Business Impact**: Audit trail completeness, compliance verification

**Risk Stage**: System telemetry

**Evidence Generated**: Export success timestamps, delivery confirmation

---

### Degraded Export Counter

**Signal ID**: `sig_029_telemetry_degraded_count`

**What It Detects**: Incremental count of degraded evidence exports

**Why Processors Care**: Tracks evidence quality degradation for monitoring

**Business Impact**: Quality monitoring, degradation trend analysis

**Risk Stage**: System telemetry

**Evidence Generated**: Degraded export counts, quality metrics

---

### Last Successful Export Timestamp

**Signal ID**: `sig_030_telemetry_last_good_at`

**What It Detects**: Timestamp of most recent successful evidence export

**Why Processors Care**: Indicates evidence system health and freshness

**Business Impact**: Health monitoring, staleness detection, SLA tracking

**Risk Stage**: System telemetry

**Evidence Generated**: Last success timestamps, freshness metrics

---

## Threshold Signals

**Count**: 6

### Rate Limit Exceeded

**Signal ID**: `sig_004_rate_limit_exceeded_atomic`

**What It Detects**: Traffic exceeding configured rate limits per account

**Why Processors Care**: Rate limit violations indicate traffic spikes, retry storms, or abuse

**Business Impact**: Request throttling, degraded service, potential revenue loss

**Risk Stage**: Request admission

**Evidence Generated**: Rate limit metrics, HTTP 429 responses, account-level throttling data

---

### Insufficient Data for Risk Scoring

**Signal ID**: `sig_009_risk_insufficient_data`

**What It Detects**: Accounts with fewer than 5 events in history

**Why Processors Care**: Limited data prevents accurate risk assessment

**Business Impact**: Conservative risk posture, potential false positives, limited insights

**Risk Stage**: Risk calculation

**Evidence Generated**: Low-confidence risk scores, data volume metrics

---

### History Cardinality Limit Reached

**Signal ID**: `sig_010_risk_cardinality_limit`

**What It Detects**: Risk scorer history buffer at maximum capacity (100 events)

**Why Processors Care**: Memory-bounded risk calculation to prevent resource exhaustion

**Business Impact**: Bounded memory usage, sliding window risk assessment

**Risk Stage**: Risk calculation

**Evidence Generated**: Buffer capacity metrics, history truncation events

---

### Elevated Risk Band

**Signal ID**: `sig_011_risk_band_elevated`

**What It Detects**: Risk scores crossing the elevated threshold (default 0.3)

**Why Processors Care**: Elevated risk indicates emerging payment issues requiring attention

**Business Impact**: Increased monitoring, potential manual review, real-time detection that may precede processor escalation

**Risk Stage**: Risk classification

**Evidence Generated**: Risk band transitions, score thresholds, contributing factors

---

### High Risk Band

**Signal ID**: `sig_012_risk_band_high`

**What It Detects**: Risk scores crossing the high threshold (default 0.6)

**Why Processors Care**: High risk indicates significant payment problems requiring intervention

**Business Impact**: Manual review triggered, potential service restrictions, escalation

**Risk Stage**: Risk classification

**Evidence Generated**: High-risk alerts, detailed risk drivers, historical context

---

### Critical Risk Band

**Signal ID**: `sig_013_risk_band_critical`

**What It Detects**: Risk scores crossing the critical threshold (default 0.8)

**Why Processors Care**: Critical risk indicates severe payment failures requiring immediate action

**Business Impact**: Service suspension, immediate escalation, potential account freeze

**Risk Stage**: Risk classification

**Evidence Generated**: Critical risk alerts, comprehensive evidence package, audit trail

---

## Transformation Signals

**Count**: 6

### Sensitive Key Filtering

**Signal ID**: `sig_019_transform_forbidden_key_strip`

**What It Detects**: Removal of forbidden keys from evidence payloads

**Why Processors Care**: Prevents sensitive data leakage in evidence exports

**Business Impact**: PCI compliance, data privacy protection, audit readiness

**Risk Stage**: Evidence transformation

**Evidence Generated**: Filtered key counts, data sanitization audit trail

---

### Deterministic Key Ordering

**Signal ID**: `sig_020_transform_key_sort`

**What It Detects**: Alphabetical sorting of JSON keys for canonical representation

**Why Processors Care**: Ensures consistent evidence signatures and deduplication

**Business Impact**: Reliable evidence comparison, signature stability, audit integrity

**Risk Stage**: Evidence transformation

**Evidence Generated**: Canonicalized JSON structures

---

### Severity Normalization

**Signal ID**: `sig_021_transform_severity_coerce`

**What It Detects**: Coercion of severity values to allowed set (neutral, low, medium, high, critical)

**Why Processors Care**: Ensures consistent severity classification across evidence

**Business Impact**: Reliable alerting, consistent reporting, severity-based routing

**Risk Stage**: Evidence transformation

**Evidence Generated**: Normalized severity values, coercion audit trail

---

### Merchant Deterministic Ordering

**Signal ID**: `sig_022_transform_merchant_sort`

**What It Detects**: Stable sorting of merchant records by ID

**Why Processors Care**: Ensures consistent evidence structure for signature verification

**Business Impact**: Evidence integrity, reproducible exports, audit compliance

**Risk Stage**: Evidence transformation

**Evidence Generated**: Ordered merchant lists

---

### Artifact Temporal Ordering

**Signal ID**: `sig_023_transform_artifact_sort`

**What It Detects**: Sorting artifacts by timestamp (descending) then ID

**Why Processors Care**: Ensures chronological evidence presentation for investigations

**Business Impact**: Timeline reconstruction, audit readiness, investigation efficiency

**Risk Stage**: Evidence transformation

**Evidence Generated**: Temporally ordered artifact sequences

---

### Data Canonicalization

**Signal ID**: `sig_024_transform_canonicalize`

**What It Detects**: Transformation of artifact data into canonical JSON form

**Why Processors Care**: Ensures evidence integrity and reproducibility

**Business Impact**: Tamper detection, signature verification, audit compliance

**Risk Stage**: Evidence transformation

**Evidence Generated**: Canonical JSON representations

---

## Validation Signals

**Count**: 4

### Missing Authentication Header

**Signal ID**: `sig_001_auth_missing_bearer`

**What It Detects**: API requests without Bearer token authentication

**Why Processors Care**: Unauthenticated requests indicate integration errors or potential security probes

**Business Impact**: Blocked requests, failed transactions, integration debugging overhead

**Risk Stage**: Pre-authorization

**Evidence Generated**: Authentication denial metrics, HTTP 401 responses

---

### Invalid Event ID Format

**Signal ID**: `sig_005_event_uuid_invalid`

**What It Detects**: Event submissions with malformed or non-UUID event identifiers

**Why Processors Care**: Invalid IDs break deduplication and event tracking

**Business Impact**: Rejected events, data quality issues, debugging overhead

**Risk Stage**: Event validation

**Evidence Generated**: Validation rejection metrics, malformed event logs

---

### Invalid Event Timestamp

**Signal ID**: `sig_006_event_timestamp_invalid`

**What It Detects**: Events with timestamps not in RFC3339 format

**Why Processors Care**: Invalid timestamps break temporal ordering and analytics

**Business Impact**: Event rejection, inaccurate reporting, timeline reconstruction failures

**Risk Stage**: Event validation

**Evidence Generated**: Timestamp validation failures, rejected event counts

---

### Unknown Payment Processor

**Signal ID**: `sig_007_processor_invalid`

**What It Detects**: Events claiming to originate from unrecognized payment processors

**Why Processors Care**: Unknown processors indicate integration errors or data corruption

**Business Impact**: Event rejection, routing failures, analytics gaps

**Risk Stage**: Event validation

**Evidence Generated**: Processor validation failures, supported processor list

---

