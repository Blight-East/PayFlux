package exporter

import (
	"fmt"
	"time"
)

// enrich.go — Stage 3 of the export pipeline: tier enrichment and warnings.
//
// Three independent sub-stages, called in this order by the orchestrator:
//
//   addTierContext  — populate ProcessorPlaybookContext when exportTier=="tier2"
//   addTrajectory   — populate RiskTrajectory when exportTier=="tier2"
//   addWarnings     — create a Warning in WarningStore when pilotMode is active
//                     and risk band is above "low"
//
// addWarnings reads ProcessorPlaybookContext and RiskTrajectory from the
// record, so it MUST be called after addTierContext and addTrajectory.
//
// The risk-metric calls (riskEventsTotal, riskScoreLast) from main.go:1774–1776
// are emitted by the Step 7 orchestrator between addTrajectory and addWarnings,
// preserving the original call order in exportEvent().
//
// Helper functions generatePlaybookContext and generateRiskTrajectory are
// unexported package-level functions migrated verbatim from main.go.
// They remain in main.go unchanged until Step 7 removes the duplicate.
//
// Logic migrated verbatim from exportEvent() in main.go — Step 4.

// addTierContext conditionally populates the ProcessorPlaybookContext field
// on record. Mirrors lines 1756–1764 of exportEvent().
// Substitutions (globals → struct fields):
//   exportTier   → e.cfg.ExportTier
//   tier2Enabled → e.cfg.Tier2Enabled
//   exported     → *record
func (e *Exporter) addTierContext(record *ExportedEvent, res RiskResult) {
	// Tier 2 only: Add authority-gated context (v0.2.2+)
	// Also respects tier2Enabled kill switch
	if e.cfg.ExportTier == "tier2" && e.cfg.Tier2Enabled {
		// Processor Playbook Context (probabilistic, non-prescriptive)
		context := generatePlaybookContext(res.Band, res.Drivers)
		if context != "" {
			record.ProcessorPlaybookContext = context
			e.cfg.Metrics.IncTier2Context()
		}
	}
}

// addTrajectory conditionally populates the RiskTrajectory field on record.
// Mirrors lines 1766–1771 of exportEvent().
// Substitutions identical to addTierContext above.
func (e *Exporter) addTrajectory(record *ExportedEvent, res RiskResult) {
	// Tier 2 only: Add authority-gated context (v0.2.2+)
	// Also respects tier2Enabled kill switch
	if e.cfg.ExportTier == "tier2" && e.cfg.Tier2Enabled {
		// Risk Trajectory (momentum framing)
		trajectory := generateRiskTrajectory(res)
		if trajectory != "" {
			record.RiskTrajectory = trajectory
			e.cfg.Metrics.IncTier2Trajectory()
		}
	}
}

// addWarnings conditionally creates a Warning in cfg.WarningStore.
// Mirrors lines 1778–1818 of exportEvent().
// Reads record.ProcessorPlaybookContext and record.RiskTrajectory — must be
// called after addTierContext and addTrajectory.
// Substitutions (globals → struct fields):
//   pilotModeEnabled → e.cfg.PilotModeEnabled
//   warningStore     → e.cfg.WarningStore
//   warningsEnabled  → e.cfg.WarningsEnabled
//   warningLatency   → e.cfg.Metrics.ObserveWarningLatency
//   warningsSuppressed → e.cfg.Metrics.IncWarningsSuppressed
func (e *Exporter) addWarnings(event Event, record *ExportedEvent, res RiskResult, messageID string) {
	// Pilot mode: Create warning record for elevated+ risk bands (v0.2.3+)
	// Respects warningsEnabled kill switch
	if e.cfg.PilotModeEnabled && e.cfg.WarningStore != nil && res.Band != "low" {
		if e.cfg.WarningsEnabled {
			// Parse event timestamp for latency measurement
			var eventTimestamp time.Time
			if event.EventTimestamp != "" {
				if parsedTime, err := time.Parse(time.RFC3339, event.EventTimestamp); err == nil {
					eventTimestamp = parsedTime
				}
			}

			processedAt := time.Now().UTC()
			warning := &Warning{
				WarningID:       messageID, // Use stream message ID as stable unique ID
				EventID:         event.EventID,
				Processor:       event.Processor,
				MerchantIDHash:  event.MerchantIDHash,
				ProcessedAt:     processedAt,
				EventTimestamp:  eventTimestamp,
				RiskScore:       res.Score,
				RiskBand:        res.Band,
				RiskDrivers:     res.Drivers,
				PlaybookContext: record.ProcessorPlaybookContext,
				RiskTrajectory:  record.RiskTrajectory,
			}

			// Observe warning latency if we have a valid event timestamp
			if !eventTimestamp.IsZero() {
				latency := processedAt.Sub(eventTimestamp).Seconds()
				if latency >= 0 { // Sanity check for clock skew
					e.cfg.Metrics.ObserveWarningLatency(latency)
				}
			}

			e.cfg.WarningStore.Add(warning)
		} else {
			// Warnings disabled, increment suppression counter
			e.cfg.Metrics.IncWarningsSuppressed()
		}
	}
}

// --- Private helpers (migrated verbatim from main.go) ---

// generatePlaybookContext builds the processor playbook context string.
// Pure function — no external dependencies.
// Migrated verbatim from main.go:1898–1930.
func generatePlaybookContext(band string, drivers []string) string {
	if band == "low" {
		return "" // No context needed for low risk
	}

	// Build context based on band and drivers
	var context string

	switch band {
	case "elevated":
		context = "Pattern indicates early-stage deviation from nominal processor behavior."
	case "high":
		context = "Correlates with processor monitoring escalation; rate limiting or velocity checks often triggered."
	case "critical":
		context = "Associated with processor risk policy activation; account-level flags or circuit breakers typically engaged."
	}

	// Add driver-specific context
	for _, driver := range drivers {
		switch driver {
		case "high_failure_rate":
			context += " Elevated failure rates signal degraded transaction quality."
		case "retry_pressure_spike":
			context += " Retry clustering indicates infrastructure stress to processor risk systems."
		case "timeout_clustering":
			context += " Timeout patterns correlate with processor-side latency attribution."
		case "traffic_volatility":
			context += " Traffic spikes monitored for velocity anomalies."
		}
	}

	return context
}

// generateRiskTrajectory returns Tier 2 momentum/trend framing.
// Rules: observed pattern + momentum, no predictions, no guarantees.
// Migrated verbatim from main.go:1932–1959.
func generateRiskTrajectory(res RiskResult) string {
	if res.TrajectoryDirection == "stable" && res.TrajectoryMultiplier < 1.5 {
		return "" // No trajectory context for stable low patterns
	}

	// Build trajectory description
	windowMinutes := res.TrajectoryWindowSec / 60

	var trajectory string
	switch res.TrajectoryDirection {
	case "accelerating":
		if res.TrajectoryMultiplier >= 5.0 {
			trajectory = fmt.Sprintf("Rapid acceleration observed: ~%.0f× above baseline over the last %d minutes.", res.TrajectoryMultiplier, windowMinutes)
		} else {
			trajectory = fmt.Sprintf("Pattern accelerating: ~%.1f× above baseline over the last %d minutes.", res.TrajectoryMultiplier, windowMinutes)
		}
	case "decelerating":
		trajectory = fmt.Sprintf("Pattern decelerating: failure rate trending down vs baseline over the last %d minutes.", windowMinutes)
	case "stable":
		if res.TrajectoryMultiplier > 1.5 {
			trajectory = fmt.Sprintf("Sustained elevation: ~%.1f× above baseline, stable over the last %d minutes.", res.TrajectoryMultiplier, windowMinutes)
		}
	}

	return trajectory
}
