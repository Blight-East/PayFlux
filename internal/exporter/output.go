package exporter

import (
	"fmt"
	"log"
	"time"
)

// output.go — Stage 4 of the export pipeline: write serialized records.
//
// Responsibilities:
//   writeStdout — write a pre-serialized newline-delimited JSON record to stdout
//   writeFile   — write a pre-serialized newline-delimited JSON record to the
//                 configured file, flushing the buffered writer after each write
//
// Both functions update health state (via health.go) and emit Prometheus
// metrics on success or failure. The caller (Export) decides which functions
// to call based on ExportMode.
//
// Note: the JSON marshal and newline-append that precede these writes in
// exportEvent() (main.go:1821–1829) belong to the Export() orchestrator
// (Step 7); the functions here receive already-serialized data.
//
// Note: ExportWriter.WriteFile writes and flushes in one call (per the
// interface contract in interfaces.go). The write/flush distinction that
// appears in exportEvent()'s Prometheus labels (reason "write" vs "flush")
// is collapsed here to reason "write" for any WriteFile error; the
// concrete adapter owns the flush internally.
//
// Logic migrated from the stdout/file write blocks of exportEvent() in main.go — Step 5.

// writeStdout writes data to os.Stdout via cfg.ExportWriter.WriteStdout.
// On success: updates health and increments the exported counter.
// On error:   records the error timestamp/reason and increments the error counter.
// Returns any write error so Export can gate ACK behavior.
//
// Mirrors the "exportMode == stdout || both" block of exportEvent() (main.go:1833–1848).
// Logic is identical — no reordering, no behavior change.
// Substitutions (globals → struct fields):
//   os.Stdout.Write             → e.cfg.ExportWriter.WriteStdout
//   exportErrors                → e.cfg.Metrics.IncExportError
//   atomic/sync health update   → e.markFailure  (health.go — Step 6)
//   eventsExported              → e.cfg.Metrics.IncExported
//   atomic+Prometheus success   → e.markSuccess  (health.go — Step 6)
func (e *Exporter) writeStdout(data []byte, eventID string) error {
	if e.cfg.ExportWriter == nil {
		return fmt.Errorf("stdout writer not configured")
	}
	start := time.Now()
	_, err := e.cfg.ExportWriter.WriteStdout(data)
	if err != nil {
		log.Printf("export_stdout_error event_id=%s err=%v", eventID, err)
		e.cfg.Metrics.IncExportError("stdout", "write")
		e.markFailure("stdout", "write")
		return fmt.Errorf("stdout: %w", err)
	}
	e.cfg.Metrics.ObserveExportDuration("stdout", time.Since(start).Seconds())
	e.cfg.Metrics.IncExported("stdout")
	e.markSuccess("stdout")
	return nil
}

// writeFile writes data to the configured export file via cfg.ExportWriter.WriteFile.
// WriteFile writes and flushes in a single call; flush errors surface as write errors
// (see package-level note above).
// On success: updates health and increments the exported counter.
// On error:   records the error timestamp/reason and increments the error counter.
// Returns any write error so Export can gate ACK behavior.
//
// Mirrors the "exportMode == file || both" block of exportEvent() (main.go:1851–1877).
// Logic is identical — no reordering, no behavior change.
// Substitutions (globals → struct fields):
//   exportWriter (nil guard)    → e.cfg.ExportWriter == nil
//   exportWriter.Write+Flush    → e.cfg.ExportWriter.WriteFile
//   exportErrors                → e.cfg.Metrics.IncExportError
//   atomic/sync health update   → e.markFailure  (health.go — Step 6)
//   eventsExported              → e.cfg.Metrics.IncExported
//   atomic+Prometheus success   → e.markSuccess  (health.go — Step 6)
func (e *Exporter) writeFile(data []byte, eventID string) error {
	if e.cfg.ExportWriter == nil {
		return nil
	}
	start := time.Now()
	_, err := e.cfg.ExportWriter.WriteFile(data)
	if err != nil {
		log.Printf("export_file_error event_id=%s err=%v", eventID, err)
		e.cfg.Metrics.IncExportError("file", "write")
		e.markFailure("file", "write")
		return fmt.Errorf("file: %w", err)
	}
	e.cfg.Metrics.ObserveExportDuration("file", time.Since(start).Seconds())
	e.cfg.Metrics.IncExported("file")
	e.markSuccess("file")
	return nil
}
