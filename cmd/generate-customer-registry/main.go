package main

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
)

type Signal struct {
	ID                  string   `json:"id"`
	SourceFile          string   `json:"source_file"`
	LineNumber          string   `json:"line_number"`
	Type                string   `json:"type"`
	TriggerCondition    string   `json:"trigger_condition"`
	InputFields         []string `json:"input_fields"`
	OutputFields        []string `json:"output_fields"`
	SeverityLevels      []string `json:"severity_levels"`
	Deterministic       bool     `json:"deterministic"`
	DescriptionVerbatim string   `json:"description_verbatim_code"`
}

type Registry struct {
	Signals []Signal `json:"signals"`
}

type CustomerSignal struct {
	ID                string
	CustomerName      string
	WhatItDetects     string
	WhyProcessorsCare string
	BusinessImpact    string
	RiskStage         string
	EvidenceGenerated string
}

func main() {
	data, err := os.ReadFile("internal/specs/signal-registry.v1.json")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading registry: %v\n", err)
		os.Exit(1)
	}

	var registry Registry
	if err := json.Unmarshal(data, &registry); err != nil {
		fmt.Fprintf(os.Stderr, "Error parsing registry: %v\n", err)
		os.Exit(1)
	}

	// Group by type
	byType := make(map[string][]Signal)
	for _, sig := range registry.Signals {
		byType[sig.Type] = append(byType[sig.Type], sig)
	}

	// Sort types
	types := make([]string, 0, len(byType))
	for t := range byType {
		types = append(types, t)
	}
	sort.Strings(types)

	fmt.Printf("# PayFlux Signal Registry - Customer Reference\n\n")
	fmt.Printf("**Total Signals**: %d\n\n", len(registry.Signals))
	fmt.Printf("## Signal Categories\n\n")

	for _, t := range types {
		fmt.Printf("- **%s**: %d signals\n", strings.Title(t), len(byType[t]))
	}

	fmt.Printf("\n---\n\n")

	// Generate customer-facing documentation for each category
	for _, t := range types {
		fmt.Printf("## %s Signals\n\n", strings.Title(t))
		fmt.Printf("**Count**: %d\n\n", len(byType[t]))

		for _, sig := range byType[t] {
			cs := translateSignal(sig)
			fmt.Printf("### %s\n\n", cs.CustomerName)
			fmt.Printf("**Signal ID**: `%s`\n\n", cs.ID)
			fmt.Printf("**What It Detects**: %s\n\n", cs.WhatItDetects)
			fmt.Printf("**Why Processors Care**: %s\n\n", cs.WhyProcessorsCare)
			fmt.Printf("**Business Impact**: %s\n\n", cs.BusinessImpact)
			fmt.Printf("**Risk Stage**: %s\n\n", cs.RiskStage)
			fmt.Printf("**Evidence Generated**: %s\n\n", cs.EvidenceGenerated)
			fmt.Printf("---\n\n")
		}
	}
}

func translateSignal(sig Signal) CustomerSignal {
	cs := CustomerSignal{
		ID: sig.ID,
	}

	// Deterministic mapping based on signal ID and type
	switch sig.ID {
	case "sig_001_auth_missing_bearer":
		cs.CustomerName = "Missing Authentication Header"
		cs.WhatItDetects = "API requests without Bearer token authentication"
		cs.WhyProcessorsCare = "Unauthenticated requests indicate integration errors or potential security probes"
		cs.BusinessImpact = "Blocked requests, failed transactions, integration debugging overhead"
		cs.RiskStage = "Pre-authorization"
		cs.EvidenceGenerated = "Authentication denial metrics, HTTP 401 responses"

	case "sig_002_auth_revoked_key":
		cs.CustomerName = "Revoked API Key Usage"
		cs.WhatItDetects = "Requests using API keys that have been explicitly revoked"
		cs.WhyProcessorsCare = "Revoked keys may indicate compromised credentials or unauthorized access attempts"
		cs.BusinessImpact = "Service disruption, potential security incident, credential rotation required"
		cs.RiskStage = "Pre-authorization"
		cs.EvidenceGenerated = "Revoked key denial metrics, security audit logs"

	case "sig_003_auth_invalid_key":
		cs.CustomerName = "Invalid API Key"
		cs.WhatItDetects = "Requests with API keys that don't match any valid credentials"
		cs.WhyProcessorsCare = "Invalid keys suggest misconfiguration, credential leakage, or brute-force attempts"
		cs.BusinessImpact = "Failed API calls, integration failures, potential security threat"
		cs.RiskStage = "Pre-authorization"
		cs.EvidenceGenerated = "Invalid key denial metrics, failed authentication attempts"

	case "sig_004_rate_limit_exceeded_atomic":
		cs.CustomerName = "Rate Limit Exceeded"
		cs.WhatItDetects = "Traffic exceeding configured rate limits per account"
		cs.WhyProcessorsCare = "Rate limit violations indicate traffic spikes, retry storms, or abuse"
		cs.BusinessImpact = "Request throttling, degraded service, potential revenue loss"
		cs.RiskStage = "Request admission"
		cs.EvidenceGenerated = "Rate limit metrics, HTTP 429 responses, account-level throttling data"

	case "sig_005_event_uuid_invalid":
		cs.CustomerName = "Invalid Event ID Format"
		cs.WhatItDetects = "Event submissions with malformed or non-UUID event identifiers"
		cs.WhyProcessorsCare = "Invalid IDs break deduplication and event tracking"
		cs.BusinessImpact = "Rejected events, data quality issues, debugging overhead"
		cs.RiskStage = "Event validation"
		cs.EvidenceGenerated = "Validation rejection metrics, malformed event logs"

	case "sig_006_event_timestamp_invalid":
		cs.CustomerName = "Invalid Event Timestamp"
		cs.WhatItDetects = "Events with timestamps not in RFC3339 format"
		cs.WhyProcessorsCare = "Invalid timestamps break temporal ordering and analytics"
		cs.BusinessImpact = "Event rejection, inaccurate reporting, timeline reconstruction failures"
		cs.RiskStage = "Event validation"
		cs.EvidenceGenerated = "Timestamp validation failures, rejected event counts"

	case "sig_007_processor_invalid":
		cs.CustomerName = "Unknown Payment Processor"
		cs.WhatItDetects = "Events claiming to originate from unrecognized payment processors"
		cs.WhyProcessorsCare = "Unknown processors indicate integration errors or data corruption"
		cs.BusinessImpact = "Event rejection, routing failures, analytics gaps"
		cs.RiskStage = "Event validation"
		cs.EvidenceGenerated = "Processor validation failures, supported processor list"

	case "sig_008_deduplication_detected":
		cs.CustomerName = "Duplicate Event Detected"
		cs.WhatItDetects = "Events with IDs that have already been processed"
		cs.WhyProcessorsCare = "Duplicates indicate retry behavior, webhook replays, or integration issues"
		cs.BusinessImpact = "Idempotency protection, accurate event counting, retry pattern visibility"
		cs.RiskStage = "Event ingestion"
		cs.EvidenceGenerated = "Deduplication metrics, duplicate event IDs, retry patterns"

	case "sig_009_risk_insufficient_data":
		cs.CustomerName = "Insufficient Data for Risk Scoring"
		cs.WhatItDetects = "Accounts with fewer than 5 events in history"
		cs.WhyProcessorsCare = "Limited data prevents accurate risk assessment"
		cs.BusinessImpact = "Conservative risk posture, potential false positives, limited insights"
		cs.RiskStage = "Risk calculation"
		cs.EvidenceGenerated = "Low-confidence risk scores, data volume metrics"

	case "sig_010_risk_cardinality_limit":
		cs.CustomerName = "History Cardinality Limit Reached"
		cs.WhatItDetects = "Risk scorer history buffer at maximum capacity (100 events)"
		cs.WhyProcessorsCare = "Memory-bounded risk calculation to prevent resource exhaustion"
		cs.BusinessImpact = "Bounded memory usage, sliding window risk assessment"
		cs.RiskStage = "Risk calculation"
		cs.EvidenceGenerated = "Buffer capacity metrics, history truncation events"

	case "sig_011_risk_band_elevated":
		cs.CustomerName = "Elevated Risk Band"
		cs.WhatItDetects = "Risk scores crossing the elevated threshold (default 0.3)"
		cs.WhyProcessorsCare = "Elevated risk indicates emerging payment issues requiring attention"
		cs.BusinessImpact = "Increased monitoring, potential manual review, early warning signal"
		cs.RiskStage = "Risk classification"
		cs.EvidenceGenerated = "Risk band transitions, score thresholds, contributing factors"

	case "sig_012_risk_band_high":
		cs.CustomerName = "High Risk Band"
		cs.WhatItDetects = "Risk scores crossing the high threshold (default 0.6)"
		cs.WhyProcessorsCare = "High risk indicates significant payment problems requiring intervention"
		cs.BusinessImpact = "Manual review triggered, potential service restrictions, escalation"
		cs.RiskStage = "Risk classification"
		cs.EvidenceGenerated = "High-risk alerts, detailed risk drivers, historical context"

	case "sig_013_risk_band_critical":
		cs.CustomerName = "Critical Risk Band"
		cs.WhatItDetects = "Risk scores crossing the critical threshold (default 0.8)"
		cs.WhyProcessorsCare = "Critical risk indicates severe payment failures requiring immediate action"
		cs.BusinessImpact = "Service suspension, immediate escalation, potential account freeze"
		cs.RiskStage = "Risk classification"
		cs.EvidenceGenerated = "Critical risk alerts, comprehensive evidence package, audit trail"

	case "sig_014_anomaly_high_failure_rate":
		cs.CustomerName = "High Failure Rate Anomaly"
		cs.WhatItDetects = "Payment failure rates exceeding 40%"
		cs.WhyProcessorsCare = "High failure rates indicate integration issues, fraud, or service degradation"
		cs.BusinessImpact = "Revenue loss, customer experience degradation, processor relationship risk"
		cs.RiskStage = "Anomaly detection"
		cs.EvidenceGenerated = "Failure rate metrics, failure type distribution, temporal patterns"

	case "sig_015_anomaly_retry_pressure":
		cs.CustomerName = "Retry Pressure Spike"
		cs.WhatItDetects = "Retry activity exceeding 50% of traffic"
		cs.WhyProcessorsCare = "Excessive retries indicate integration problems or retry storms"
		cs.BusinessImpact = "Increased processor costs, rate limit exhaustion, cascading failures"
		cs.RiskStage = "Anomaly detection"
		cs.EvidenceGenerated = "Retry metrics, retry interval analysis, backoff compliance"

	case "sig_016_anomaly_timeout_clustering":
		cs.CustomerName = "Timeout Clustering"
		cs.WhatItDetects = "Timeout events exceeding 50% of failures"
		cs.WhyProcessorsCare = "Timeout clusters indicate network issues, processor latency, or integration problems"
		cs.BusinessImpact = "Transaction abandonment, poor user experience, integration debugging"
		cs.RiskStage = "Anomaly detection"
		cs.EvidenceGenerated = "Timeout distribution, latency percentiles, affected endpoints"

	case "sig_017_anomaly_traffic_spike":
		cs.CustomerName = "Traffic Volatility"
		cs.WhatItDetects = "Traffic volume spikes exceeding 50% deviation from baseline"
		cs.WhyProcessorsCare = "Traffic spikes may indicate legitimate growth, campaigns, or abuse"
		cs.BusinessImpact = "Capacity planning, rate limit tuning, fraud detection"
		cs.RiskStage = "Anomaly detection"
		cs.EvidenceGenerated = "Traffic volume metrics, spike timing, growth rate analysis"

	case "sig_018_anomaly_geo_entropy":
		cs.CustomerName = "Geographic Entropy Increase"
		cs.WhatItDetects = "Geographic distribution entropy exceeding 50% increase"
		cs.WhyProcessorsCare = "Geo entropy changes may indicate expansion, credential sharing, or fraud"
		cs.BusinessImpact = "Fraud detection, compliance monitoring, business expansion visibility"
		cs.RiskStage = "Anomaly detection"
		cs.EvidenceGenerated = "Geographic distribution, entropy metrics, location diversity"

	case "sig_019_transform_forbidden_key_strip":
		cs.CustomerName = "Sensitive Key Filtering"
		cs.WhatItDetects = "Removal of forbidden keys from evidence payloads"
		cs.WhyProcessorsCare = "Prevents sensitive data leakage in evidence exports"
		cs.BusinessImpact = "PCI compliance, data privacy protection, audit readiness"
		cs.RiskStage = "Evidence transformation"
		cs.EvidenceGenerated = "Filtered key counts, data sanitization audit trail"

	case "sig_020_transform_key_sort":
		cs.CustomerName = "Deterministic Key Ordering"
		cs.WhatItDetects = "Alphabetical sorting of JSON keys for canonical representation"
		cs.WhyProcessorsCare = "Ensures consistent evidence signatures and deduplication"
		cs.BusinessImpact = "Reliable evidence comparison, signature stability, audit integrity"
		cs.RiskStage = "Evidence transformation"
		cs.EvidenceGenerated = "Canonicalized JSON structures"

	case "sig_021_transform_severity_coerce":
		cs.CustomerName = "Severity Normalization"
		cs.WhatItDetects = "Coercion of severity values to allowed set (neutral, low, medium, high, critical)"
		cs.WhyProcessorsCare = "Ensures consistent severity classification across evidence"
		cs.BusinessImpact = "Reliable alerting, consistent reporting, severity-based routing"
		cs.RiskStage = "Evidence transformation"
		cs.EvidenceGenerated = "Normalized severity values, coercion audit trail"

	case "sig_022_transform_merchant_sort":
		cs.CustomerName = "Merchant Deterministic Ordering"
		cs.WhatItDetects = "Stable sorting of merchant records by ID"
		cs.WhyProcessorsCare = "Ensures consistent evidence structure for signature verification"
		cs.BusinessImpact = "Evidence integrity, reproducible exports, audit compliance"
		cs.RiskStage = "Evidence transformation"
		cs.EvidenceGenerated = "Ordered merchant lists"

	case "sig_023_transform_artifact_sort":
		cs.CustomerName = "Artifact Temporal Ordering"
		cs.WhatItDetects = "Sorting artifacts by timestamp (descending) then ID"
		cs.WhyProcessorsCare = "Ensures chronological evidence presentation for investigations"
		cs.BusinessImpact = "Timeline reconstruction, audit readiness, investigation efficiency"
		cs.RiskStage = "Evidence transformation"
		cs.EvidenceGenerated = "Temporally ordered artifact sequences"

	case "sig_024_transform_canonicalize":
		cs.CustomerName = "Data Canonicalization"
		cs.WhatItDetects = "Transformation of artifact data into canonical JSON form"
		cs.WhyProcessorsCare = "Ensures evidence integrity and reproducibility"
		cs.BusinessImpact = "Tamper detection, signature verification, audit compliance"
		cs.RiskStage = "Evidence transformation"
		cs.EvidenceGenerated = "Canonical JSON representations"

	case "sig_025_telemetry_stream_length":
		cs.CustomerName = "Stream Depth Monitoring"
		cs.WhatItDetects = "Redis stream length measurement every 10 seconds"
		cs.WhyProcessorsCare = "Indicates event processing backlog and system health"
		cs.BusinessImpact = "Capacity planning, backpressure detection, SLA monitoring"
		cs.RiskStage = "System telemetry"
		cs.EvidenceGenerated = "Stream depth metrics, backlog trends"

	case "sig_026_telemetry_pending_count":
		cs.CustomerName = "Consumer Lag Monitoring"
		cs.WhatItDetects = "Pending message count in consumer group"
		cs.WhyProcessorsCare = "Indicates processing lag and consumer health"
		cs.BusinessImpact = "Processing latency visibility, consumer scaling decisions"
		cs.RiskStage = "System telemetry"
		cs.EvidenceGenerated = "Pending count metrics, consumer lag measurements"

	case "sig_027_telemetry_backpressure_warning":
		cs.CustomerName = "Backpressure Alert"
		cs.WhatItDetects = "Stream depth exceeding configured backpressure threshold"
		cs.WhyProcessorsCare = "Early warning of system overload requiring intervention"
		cs.BusinessImpact = "Proactive scaling, service degradation prevention"
		cs.RiskStage = "System telemetry"
		cs.EvidenceGenerated = "Backpressure warnings, threshold breach logs"

	case "sig_028_telemetry_export_success":
		cs.CustomerName = "Evidence Export Success"
		cs.WhatItDetects = "Successful evidence export to stdout"
		cs.WhyProcessorsCare = "Confirms evidence delivery for compliance and auditing"
		cs.BusinessImpact = "Audit trail completeness, compliance verification"
		cs.RiskStage = "System telemetry"
		cs.EvidenceGenerated = "Export success timestamps, delivery confirmation"

	case "sig_029_telemetry_degraded_count":
		cs.CustomerName = "Degraded Export Counter"
		cs.WhatItDetects = "Incremental count of degraded evidence exports"
		cs.WhyProcessorsCare = "Tracks evidence quality degradation for monitoring"
		cs.BusinessImpact = "Quality monitoring, degradation trend analysis"
		cs.RiskStage = "System telemetry"
		cs.EvidenceGenerated = "Degraded export counts, quality metrics"

	case "sig_030_telemetry_last_good_at":
		cs.CustomerName = "Last Successful Export Timestamp"
		cs.WhatItDetects = "Timestamp of most recent successful evidence export"
		cs.WhyProcessorsCare = "Indicates evidence system health and freshness"
		cs.BusinessImpact = "Health monitoring, staleness detection, SLA tracking"
		cs.RiskStage = "System telemetry"
		cs.EvidenceGenerated = "Last success timestamps, freshness metrics"

	case "sig_031_contract_forbidden_key":
		cs.CustomerName = "Forbidden Key Contract"
		cs.WhatItDetects = "Identification of keys forbidden from evidence payloads"
		cs.WhyProcessorsCare = "Enforces data privacy and compliance contracts"
		cs.BusinessImpact = "PCI compliance, data privacy protection, contractual obligations"
		cs.RiskStage = "Contract enforcement"
		cs.EvidenceGenerated = "Forbidden key detection, compliance audit trail"

	default:
		cs.CustomerName = "Unknown Signal"
		cs.WhatItDetects = "Signal not yet documented"
		cs.WhyProcessorsCare = "Requires documentation"
		cs.BusinessImpact = "Unknown"
		cs.RiskStage = "Unknown"
		cs.EvidenceGenerated = "Unknown"
	}

	return cs
}
