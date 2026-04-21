package exporter

// risk.go — Stage 2 of the export pipeline: risk scoring and annotation.
//
// Responsibility: apply the RiskScorer to the event and annotate the
// ExportedEvent record with the resulting score, band, and driver fields.
// No enrichment, no I/O.
//
// Returns (RiskResult, true) when scoring was applied.
// Returns (zero, false) when riskScoreEnabled is false or RiskScorer is nil;
// in that case the record is unchanged and the caller must skip enrichment
// and risk-metric emission — matching the outer guard in exportEvent().
//
// Ordering note: the risk-metric calls (riskEventsTotal, riskScoreLast) from
// main.go:1774-1776 are NOT here. They sit between addTrajectory and
// addWarnings in the Step 7 orchestrator to preserve the original call order.
//
// Logic migrated verbatim from exportEvent() in main.go — Step 3.

// scoreRisk applies cfg.RiskScorer to the event, writes risk fields into
// record, and returns the full RiskResult for downstream enrichment.
//
// Migrated from lines 1744–1754 of exportEvent():
//   if riskScoreEnabled && riskScorer != nil { ... }
// Substitutions (globals → struct fields):
//   riskScoreEnabled → e.cfg.RiskScoreEnabled
//   riskScorer       → e.cfg.RiskScorer
//   exportTier       → e.cfg.ExportTier
//   exported         → *record
func (e *Exporter) scoreRisk(event Event, record *ExportedEvent) (RiskResult, bool) {
	// Enrich with risk score if enabled (v0.2.1+)
	if !e.cfg.RiskScoreEnabled || e.cfg.RiskScorer == nil {
		return RiskResult{}, false
	}

	res := e.cfg.RiskScorer.RecordEvent(event)
	record.ProcessorRiskScore = res.Score
	record.ProcessorRiskBand = res.Band
	record.ProcessorRiskDrivers = res.Drivers

	// Tier 1 only: Add upgrade hint (v0.2.3+)
	if e.cfg.ExportTier == "tier1" && res.Band != "low" {
		record.UpgradeHint = "Tier 2 adds processor playbook context and risk trajectory."
	}

	return res, true
}
