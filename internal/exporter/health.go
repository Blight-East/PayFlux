package exporter

// health.go — Stage 5 of the export pipeline: export health tracking.
//
// Responsibilities:
//   markSuccess — record a successful write for a named destination
//   markFailure — record a failed write for a named destination
//
// These methods delegate to e.cfg.Health (HealthTracker interface).
// The concrete adapter (built in Step 7, in main.go) owns the actual
// per-destination state:
//   - atomic unix timestamps: exportLastSuccessStdout, exportLastSuccessFile,
//                             exportLastErrorStdout,   exportLastErrorFile
//   - reason sync.Map:        exportLastErrorReason
//   - Prometheus gauge:       exportLastSuccess.WithLabelValues(dest).Set(...)
//
// Keeping the delegation here (rather than calling e.cfg.Health directly from
// output.go) means output.go has no knowledge of health mechanics, and the
// health surface can be extended without touching the write logic.
//
// Logic migrated from the per-destination health blocks inside
// exportEvent() (main.go:1839–1840, 1845–1847, 1857–1858, 1867–1868,
// 1873–1875) — Step 6.

// markSuccess records a successful export for the named destination.
// Dest is "stdout" or "file".
//
// Delegates to HealthTracker.MarkSuccess, which performs:
//   atomic.StoreInt64(&exportLastSuccess<Dest>, now)
//   exportLastSuccess.WithLabelValues(dest).Set(float64(now))
//
// Mirrors the "Record success timestamp (atomic + Prometheus)" comment blocks
// in exportEvent() (main.go:1844–1847, 1872–1875). Logic is identical.
func (e *Exporter) markSuccess(dest string) {
	if e.cfg.Health == nil {
		return
	}
	e.cfg.Health.MarkSuccess(dest)
}

// markFailure records a failed export for the named destination with the
// given reason string. Dest is "stdout" or "file".
//
// Delegates to HealthTracker.MarkFailure, which performs:
//   atomic.StoreInt64(&exportLastError<Dest>, time.Now().Unix())
//   exportLastErrorReason.Store(dest, reason)
//
// Mirrors the "Record error timestamp" comment blocks in exportEvent()
// (main.go:1838–1840, 1856–1858, 1866–1868). Logic is identical.
func (e *Exporter) markFailure(dest, reason string) {
	if e.cfg.Health == nil {
		return
	}
	e.cfg.Health.MarkFailure(dest, reason)
}
