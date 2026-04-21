// Package exporter implements the event export pipeline for PayFlux.
//
// The pipeline runs in strict order for each event:
//
//  1. transform — build the ExportedEvent record from the raw event (transform.go)
//  2. risk      — apply the risk scorer and annotate score/band/drivers (risk.go)
//  3. enrich    — add tier context, risk trajectory, and pilot warnings (enrich.go)
//  4. output    — marshal to JSON and write to all configured destinations (output.go)
//  5. health    — record per-destination success or failure timestamps (health.go)
//
// The Exporter type (this file) is the sole orchestration point.
// Each concern is isolated in its own file and does not call the others.
//
// ACK discipline: the caller (handleMessageWithDlq in main.go) ACKs only
// after Export returns nil. Export returning an error means no destination
// received the event, so no ACK occurs, preserving at-least-once delivery.
package exporter

import (
	"encoding/json"
	"fmt"
	"log"
)

// Exporter orchestrates the export pipeline.
// All dependencies are supplied at construction time via Config,
// replacing the package-level globals currently in main.go.
//
// Exporter is safe for concurrent use: all mutable state it touches
// is either owned by Config fields that are themselves safe, or is
// accessed through the atomics and sync types inherited from main.go.
type Exporter struct {
	cfg Config
}

// New constructs an Exporter from the given Config.
func New(cfg Config) *Exporter {
	return &Exporter{cfg: cfg}
}

// Export orchestrates the full event export pipeline for one event:
//
//  1. Build   — construct the ExportedEvent skeleton (transform.go)
//  2. Risk    — score the event and annotate risk fields (risk.go)
//  3. Enrich  — add tier context, trajectory, pilot warnings (enrich.go)
//  4. Marshal — JSON-encode the completed record
//  5. Write   — deliver to every enabled destination (output.go / health.go)
//
// Returns nil only when every enabled destination accepted the write.
// A non-nil error means at least one destination failed; the caller must
// not ACK the Redis stream message so it is redelivered for retry.
//
// This method is the only entry-point added in Step 7; it replaces the body
// of exportEvent() in main.go and preserves its exact observable behavior.
func (e *Exporter) Export(event Event, messageID string) error {
	// Stage 1: Base record
	record := e.buildExportRecord(event, messageID)

	// Stages 2–3: Risk scoring + enrichment (gated; scoreRisk returns false
	// when riskScoreEnabled=false or RiskScorer=nil, matching the outer guard
	// in the original exportEvent: "if riskScoreEnabled && riskScorer != nil")
	res, ok := e.scoreRisk(event, &record)
	if ok {
		e.addTierContext(&record, res)
		e.addTrajectory(&record, res)

		// Risk metrics emitted AFTER tier2 enrichment but BEFORE pilot warnings —
		// preserves the exact call ordering from exportEvent() (main.go:1774–1776).
		if e.cfg.Metrics != nil {
			e.cfg.Metrics.IncRiskEvent(event.Processor, res.Band)
			e.cfg.Metrics.SetRiskScoreLast(event.Processor, res.Score)
		}

		e.addWarnings(event, &record, res, messageID)
	}

	// Stage 4: Marshal to newline-delimited JSON
	data, err := json.Marshal(record)
	if err != nil {
		log.Printf("export_marshal_error event_id=%s err=%v", event.EventID, err)
		if e.cfg.Metrics != nil {
			// Label mirrors exportErrors.WithLabelValues(exportMode, "marshal") in main.go
			e.cfg.Metrics.IncExportError(e.cfg.ExportMode, "marshal")
		}
		return fmt.Errorf("marshal: %w", err)
	}
	data = append(data, '\n') // newline for line-delimited JSON

	// Stage 5: Write to all configured destinations.
	// exportErr captures the last write error; both destinations are always
	// attempted so that a stdout failure does not suppress a file write.
	// This matches main.go behavior: var exportErr error; ... ; return exportErr.
	var exportErr error

	if e.cfg.ExportMode == "stdout" || e.cfg.ExportMode == "both" {
		if err := e.writeStdout(data, event.EventID); err != nil {
			exportErr = err
		}
	}
	if (e.cfg.ExportMode == "file" || e.cfg.ExportMode == "both") && e.cfg.ExportWriter != nil {
		if err := e.writeFile(data, event.EventID); err != nil {
			exportErr = err
		}
	}

	return exportErr
}

// Config holds all dependencies required by the Exporter.
// Fields are added incrementally as logic is migrated from exportEvent()
// in main.go across Steps 2–7. An empty Config is valid for Step 1.
//
// Field naming mirrors the global variable names in main.go exactly,
// to make the eventual migration surgical and reviewable.
type Config struct {
	// Step 2: record construction
	ConsumerName string // consumerNameGlobal

	// Step 3: risk scoring
	RiskScoreEnabled bool        // riskScoreEnabled
	RiskScorer       RiskScorer  // riskScorer (interface; concrete type in main.go)

	// Step 4: enrichment
	ExportTier      string       // exportTier ("tier1" / "tier2")
	Tier2Enabled    bool         // tier2Enabled
	PilotModeEnabled bool        // pilotModeEnabled
	WarningsEnabled  bool        // warningsEnabled
	WarningStore     WarningStore // warningStore (interface; concrete type in main.go)

	// Step 5: output
	ExportMode   string      // exportMode ("stdout" / "file" / "both")
	ExportWriter ExportWriter // exportWriter+exportFile (interface; concrete in main.go)

	// Step 6: health tracking
	Health HealthTracker // health atomics + Prometheus (interface; concrete in main.go)

	// Step 7: metrics
	Metrics ExportMetrics // Prometheus counters/gauges (interface; concrete in main.go)
}
