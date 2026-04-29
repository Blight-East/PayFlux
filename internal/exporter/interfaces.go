package exporter

import "time"

// This file declares the interfaces that Config uses to refer to types
// currently defined in package main (RiskScorer, WarningStore, etc.).
//
// Interfaces are defined here — not in main.go — so that internal/exporter
// has no import dependency on package main (which would be a cycle).
// The concrete types in main.go satisfy these interfaces structurally.
//
// Each interface is the minimal surface that exportEvent() actually uses.
// No methods are included beyond what the migration requires.

// RiskScorer scores a single event against a sliding window of prior events.
// Satisfied by *main.RiskScorer via its RecordEvent method.
//
// The Event parameter type uses the local Event alias defined in transform.go.
type RiskScorer interface {
	// RecordEvent records the event in the sliding window and returns
	// the current risk result for the event's processor.
	RecordEvent(event Event) RiskResult
}

// RiskResult carries the output of a risk scoring operation.
// Field names and types mirror main.RiskResult exactly so that
// the concrete value from main.go satisfies this interface without
// any conversion.
type RiskResult struct {
	Score   float64
	Band    string
	Drivers []string

	// Trajectory fields — used by enrich.go, not serialized in Tier 1 exports.
	TrajectoryMultiplier float64
	TrajectoryDirection  string
	TrajectoryWindowSec  int
	CurrentFailureRate   float64
	BaselineFailureRate  float64
}

// WarningStore is the in-memory LRU cache for pilot warnings.
// Satisfied by *main.WarningStore via its Add method.
type WarningStore interface {
	// Add inserts or updates a Warning in the store.
	Add(w *Warning)
}

// Warning mirrors main.Warning exactly.
// Defined here so that enrich.go can construct warnings without
// importing package main. Field names, types, and json tags are
// identical to main.Warning (warnings.go) — do not diverge.
type Warning struct {
	WarningID      string    `json:"warning_id"`
	EventID        string    `json:"event_id"`
	Processor      string    `json:"processor"`
	MerchantIDHash string    `json:"merchant_id_hash,omitempty"`
	ProcessedAt    time.Time `json:"processed_at"`
	EventTimestamp time.Time `json:"event_timestamp"` // upstream event time for latency measurement

	// Risk data
	RiskScore   float64  `json:"processor_risk_score"`
	RiskBand    string   `json:"processor_risk_band"`
	RiskDrivers []string `json:"processor_risk_drivers"`

	// Tier 2 context (if present)
	PlaybookContext string `json:"processor_playbook_context,omitempty"`
	RiskTrajectory  string `json:"risk_trajectory,omitempty"`

	// Outcome fields (initially unset)
	OutcomeObserved  bool      `json:"outcome_observed"`
	OutcomeType      string    `json:"outcome_type,omitempty"`
	OutcomeTimestamp string    `json:"outcome_timestamp,omitempty"`
	OutcomeSource    string    `json:"outcome_source,omitempty"`
	OutcomeNotes     string    `json:"outcome_notes,omitempty"`
	OutcomeUpdatedAt time.Time `json:"outcome_updated_at,omitempty"`
}

// ExportWriter abstracts the stdout + file write surface.
// Satisfied by a concrete type constructed in main.go from exportWriter
// and exportFile.
type ExportWriter interface {
	// WriteStdout writes data to os.Stdout.
	// Returns the number of bytes written and any error.
	WriteStdout(data []byte) (int, error)
	// WriteFile writes data to the configured export file and flushes.
	// Returns the number of bytes written and any error.
	WriteFile(data []byte) (int, error)
	// Mode returns the configured export mode string ("stdout"/"file"/"both").
	Mode() string
}

// HealthTracker records per-destination export health state.
// Satisfied by a concrete type constructed in main.go from the
// exportLast* atomic variables and exportLastErrorReason sync.Map.
type HealthTracker interface {
	// MarkSuccess records a successful export for dest ("stdout" or "file").
	MarkSuccess(dest string)
	// MarkFailure records a failed export for dest with the given reason.
	MarkFailure(dest, reason string)
}

// ExportMetrics is the Prometheus instrumentation surface for the exporter.
// Satisfied by a concrete type that wraps the global counters in main.go.
type ExportMetrics interface {
	// IncExported increments the exported counter for the given destination.
	IncExported(dest string)
	// IncExportError increments the export error counter for dest+reason.
	IncExportError(dest, reason string)
	// SetLastSuccess sets the last-success gauge for dest to the given unix ts.
	SetLastSuccess(dest string, unixTs float64)
	// IncRiskEvent increments the risk event counter for processor+band.
	IncRiskEvent(processor, band string)
	// SetRiskScoreLast sets the last risk score gauge for the processor.
	SetRiskScoreLast(processor string, score float64)
	// IncTier2Context increments the tier2 context emitted counter.
	IncTier2Context()
	// IncTier2Trajectory increments the tier2 trajectory emitted counter.
	IncTier2Trajectory()
	// ObserveWarningLatency observes the warning latency histogram.
	ObserveWarningLatency(seconds float64)
	// IncWarningsSuppressed increments the suppression counter.
	IncWarningsSuppressed()
	// ObserveExportDuration observes the per-destination export write latency.
	// Called only on success — failures are accounted via IncExportError.
	ObserveExportDuration(dest string, seconds float64)
}
