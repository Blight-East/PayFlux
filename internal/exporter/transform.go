package exporter

import "time"

// transform.go — Stage 1 of the export pipeline: record construction.
//
// Responsibility: given a raw Event and its stream message ID, produce
// a fully-initialized ExportedEvent ready for risk annotation.
// No scoring, no enrichment, no I/O.
//
// Logic migrated from exportEvent() in main.go — Step 2.

// Event mirrors main.Event. Defined here so that internal/exporter has no
// import dependency on package main. Field names, types, and json tags are
// identical to main.Event.
type Event struct {
	EventType           string `json:"event_type"`
	EventTimestamp      string `json:"event_timestamp"`
	EventID             string `json:"event_id"`
	MerchantIDHash      string `json:"merchant_id_hash"`
	PaymentIntentIDHash string `json:"payment_intent_id_hash"`
	Processor           string `json:"processor"`
	FailureCategory     string `json:"failure_category"`
	RetryCount          int    `json:"retry_count"`
	GeoBucket           string `json:"geo_bucket"`
	AmountBucket        string `json:"amount_bucket"`
	SystemSource        string `json:"system_source"`
	PaymentMethodBucket string `json:"payment_method_bucket"`
	Channel             string `json:"channel"`
	RetryResult         string `json:"retry_result"`
	FailureOrigin       string `json:"failure_origin"`
}

// ExportedEvent mirrors main.ExportedEvent. Defined here alongside Event
// so the transform stage can construct and return the record without any
// external type dependencies. Field names, types, and json tags are
// identical to main.ExportedEvent — the exported JSON schema is unchanged.
type ExportedEvent struct {
	EventID         string `json:"event_id"`
	EventType       string `json:"event_type"`
	EventTimestamp  string `json:"event_timestamp"`
	Processor       string `json:"processor"`
	StreamMessageID string `json:"stream_message_id"`
	ConsumerName    string `json:"consumer_name"`
	ProcessedAt     string `json:"processed_at"`

	// Risk signals (v0.2.1+)
	ProcessorRiskScore   float64  `json:"processor_risk_score,omitempty"`
	ProcessorRiskBand    string   `json:"processor_risk_band,omitempty"`
	ProcessorRiskDrivers []string `json:"processor_risk_drivers,omitempty"`

	// Tier 1 only: Upgrade hint (v0.2.3+)
	UpgradeHint string `json:"upgrade_hint,omitempty"`

	// Tier 2 only: Authority-gated fields (v0.2.2+)
	ProcessorPlaybookContext string `json:"processor_playbook_context,omitempty"`
	RiskTrajectory           string `json:"risk_trajectory,omitempty"`
}

// buildExportRecord constructs the base ExportedEvent from a raw Event
// and its Redis stream message ID. Only the core identity fields are set;
// risk, enrichment, and tier fields are populated by later pipeline stages.
//
// Migrated verbatim from the opening struct literal of exportEvent() in main.go.
// consumerNameGlobal → e.cfg.ConsumerName (only substitution; logic identical).
func (e *Exporter) buildExportRecord(event Event, messageID string) ExportedEvent {
	return ExportedEvent{
		EventID:         event.EventID,
		EventType:       event.EventType,
		EventTimestamp:  event.EventTimestamp,
		Processor:       event.Processor,
		StreamMessageID: messageID,
		ConsumerName:    e.cfg.ConsumerName,
		ProcessedAt:     time.Now().UTC().Format(time.RFC3339),
	}
}
