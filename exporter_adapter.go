package main

// exporter_adapter.go — concrete implementations of the five exporter interfaces.
//
// This file wires the live globals in main.go to the internal/exporter pipeline
// by implementing exporter.ExportWriter, exporter.HealthTracker,
// exporter.ExportMetrics, exporter.RiskScorer, and exporter.WarningStore.
//
// None of these types escape this file: they are constructed in buildExporter()
// and stored in exporterInstance; all access goes through the interface values
// in exporter.Config.
//
// Type conversion notes:
//   main.Event → exporter.Event       : identical field layout + tags; direct conversion valid.
//   main.RiskResult → exporter.RiskResult : json tags differ; explicit field copy required.
//   *main.Warning → *exporter.Warning  : identical field layout + tags; direct pointer conversion valid.
//
// Step 7 of the exportEvent() decomposition.

import (
	"bufio"
	"os"
	"sync/atomic"
	"time"

	"payment-node/internal/exporter"
)

// exporterInstance is the live Exporter singleton.
// Constructed in consumeEvents() (main.go) after consumerNameGlobal is set.
var exporterInstance *exporter.Exporter

// buildExporter constructs an exporter.Exporter from the current package-level
// globals. Must be called after setupExport() and after consumerNameGlobal has
// been assigned (i.e. at the top of consumeEvents()).
func buildExporter() *exporter.Exporter {
	// Always construct the adapter so stdout mode has a live writer surface.
	// In stdout-only mode writer remains nil, which is safe because WriteStdout
	// delegates directly to os.Stdout and WriteFile defends against nil.
	ew := &exportWriterAdapter{writer: exportWriter}

	// RiskScorer adapter is nil when risk scoring is disabled, which matches
	// the riskScorer == nil guard in exporter.scoreRisk.
	var rs exporter.RiskScorer
	if riskScorer != nil {
		rs = &riskScorerAdapter{s: riskScorer}
	}

	// WarningStore adapter is nil when pilot mode is disabled, which matches
	// the warningStore == nil guard in exporter.addWarnings.
	var ws exporter.WarningStore
	if warningStore != nil {
		ws = &warningSinkAdapter{s: warningStore}
	}

	return exporter.New(exporter.Config{
		// Step 2
		ConsumerName: consumerNameGlobal,
		// Step 3
		RiskScoreEnabled: riskScoreEnabled,
		RiskScorer:       rs,
		// Step 4
		ExportTier:       exportTier,
		Tier2Enabled:     tier2Enabled,
		PilotModeEnabled: pilotModeEnabled,
		WarningsEnabled:  warningsEnabled,
		WarningStore:     ws,
		// Step 5
		ExportMode:   exportMode,
		ExportWriter: ew,
		// Step 6
		Health: &healthAdapter{},
		// Step 7
		Metrics: &metricsAdapter{},
	})
}

// ── exportWriterAdapter ──────────────────────────────────────────────────────

// exportWriterAdapter satisfies exporter.ExportWriter.
// WriteStdout always uses os.Stdout (matching os.Stdout.Write in exportEvent).
// WriteFile delegates to the live *bufio.Writer and flushes after each write
// (matching the Write + Flush pair in exportEvent, collapsing the two error
// paths into one as documented in output.go).
type exportWriterAdapter struct {
	writer *bufio.Writer // nil when exportMode == "stdout"
}

func (a *exportWriterAdapter) WriteStdout(data []byte) (int, error) {
	return os.Stdout.Write(data)
}

func (a *exportWriterAdapter) WriteFile(data []byte) (int, error) {
	if a.writer == nil {
		return 0, nil // defensive: caller guards on ExportMode before calling writeFile
	}
	n, err := a.writer.Write(data)
	if err != nil {
		return n, err
	}
	if err := a.writer.Flush(); err != nil {
		return n, err
	}
	return n, nil
}

func (a *exportWriterAdapter) Mode() string { return exportMode }

// ── healthAdapter ────────────────────────────────────────────────────────────

// healthAdapter satisfies exporter.HealthTracker.
// MarkSuccess mirrors the "Record success timestamp (atomic + Prometheus)" blocks
// of exportEvent() (main.go:1844–1847, 1872–1875).
// MarkFailure mirrors the "Record error timestamp" blocks (main.go:1838–1840,
// 1856–1858, 1866–1868).
type healthAdapter struct{}

func (h *healthAdapter) MarkSuccess(dest string) {
	now := time.Now().Unix()
	switch dest {
	case "stdout":
		atomic.StoreInt64(&exportLastSuccessStdout, now)
	case "file":
		atomic.StoreInt64(&exportLastSuccessFile, now)
	}
	exportLastSuccess.WithLabelValues(dest).Set(float64(now))
}

func (h *healthAdapter) MarkFailure(dest, reason string) {
	now := time.Now().Unix()
	switch dest {
	case "stdout":
		atomic.StoreInt64(&exportLastErrorStdout, now)
	case "file":
		atomic.StoreInt64(&exportLastErrorFile, now)
	}
	exportLastErrorReason.Store(dest, reason)
}

// ── metricsAdapter ───────────────────────────────────────────────────────────

// metricsAdapter satisfies exporter.ExportMetrics by delegating each method
// to the corresponding package-level Prometheus instrument registered in main.go.
type metricsAdapter struct{}

func (m *metricsAdapter) IncExported(dest string) {
	eventsExported.WithLabelValues(dest).Inc()
}

func (m *metricsAdapter) IncExportError(dest, reason string) {
	exportErrors.WithLabelValues(dest, reason).Inc()
}

func (m *metricsAdapter) SetLastSuccess(dest string, unixTs float64) {
	exportLastSuccess.WithLabelValues(dest).Set(unixTs)
}

func (m *metricsAdapter) IncRiskEvent(processor, band string) {
	riskEventsTotal.WithLabelValues(processor, band).Inc()
}

func (m *metricsAdapter) SetRiskScoreLast(processor string, score float64) {
	riskScoreLast.WithLabelValues(processor).Set(score)
}

func (m *metricsAdapter) IncTier2Context()  { tier2ContextEmitted.Inc() }
func (m *metricsAdapter) IncTier2Trajectory() { tier2TrajectoryEmitted.Inc() }

func (m *metricsAdapter) ObserveWarningLatency(seconds float64) {
	warningLatency.Observe(seconds)
}

func (m *metricsAdapter) IncWarningsSuppressed() { warningsSuppressed.Inc() }

func (m *metricsAdapter) ObserveExportDuration(dest string, seconds float64) {
	exportDuration.WithLabelValues(dest).Observe(seconds)
}

// ── riskScorerAdapter ────────────────────────────────────────────────────────

// riskScorerAdapter satisfies exporter.RiskScorer.
//
// main.Event → exporter.Event: identical field names, types, json tags, and order;
// direct struct conversion is valid per the Go spec.
//
// main.RiskResult → exporter.RiskResult: json tags differ (main carries
// "processor_risk_score" etc.; exporter.RiskResult has no json tags), so a
// direct conversion is not valid. An explicit field-by-field copy is used.
type riskScorerAdapter struct {
	s *RiskScorer
}

func (a *riskScorerAdapter) RecordEvent(ev exporter.Event) exporter.RiskResult {
	res := a.s.RecordEvent(Event(ev)) // Event(ev): direct conversion (same layout)
	return exporter.RiskResult{
		Score:                res.Score,
		Band:                 res.Band,
		Drivers:              res.Drivers,
		TrajectoryMultiplier: res.TrajectoryMultiplier,
		TrajectoryDirection:  res.TrajectoryDirection,
		TrajectoryWindowSec:  res.TrajectoryWindowSec,
		CurrentFailureRate:   res.CurrentFailureRate,
		BaselineFailureRate:  res.BaselineFailureRate,
	}
}

// ── warningSinkAdapter ───────────────────────────────────────────────────────

// warningSinkAdapter satisfies exporter.WarningStore.
//
// *exporter.Warning → *main.Warning: both types have identical field names,
// types, json tags, and order; direct pointer conversion is valid.
type warningSinkAdapter struct {
	s *WarningStore
}

func (a *warningSinkAdapter) Add(w *exporter.Warning) {
	a.s.Add((*Warning)(w)) // (*Warning)(w): direct pointer conversion (same layout)
}
