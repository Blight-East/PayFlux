package guardian

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

// Trace captures a complete evaluation cycle for deterministic replay.
type Trace struct {
	Timestamp string           `json:"timestamp"`
	Metrics   Metrics          `json:"metrics"`
	Baseline  snapshot         `json:"baseline"`
	Score     float64          `json:"score"`
	Decision  Decision         `json:"decision"`
	Invariant *InvariantReport `json:"invariant,omitempty"`
}

// TraceLog is a fixed-size ring buffer for Trace entries.
type TraceLog struct {
	mu   sync.RWMutex
	buf  []Trace
	size int
	idx  int
	full bool
	path string
}

// NewTraceLog creates a bounded trace log. Default size is 500.
func NewTraceLog(size int, path string) *TraceLog {
	if size <= 0 {
		size = 500
	}
	t := &TraceLog{
		buf:  make([]Trace, size),
		size: size,
		path: path,
	}
	t.load()
	return t
}

// Add records a trace entry. O(1), no allocation, mutex protected.
func (t *TraceLog) Add(tr Trace) {
	t.mu.Lock()
	defer t.mu.Unlock()

	t.buf[t.idx] = tr
	t.idx++

	if t.idx >= t.size {
		t.idx = 0
		t.full = true
	}
}

// Snapshot returns an ordered copy of all entries, oldest first.
func (t *TraceLog) Snapshot() []Trace {
	t.mu.RLock()
	defer t.mu.RUnlock()

	if !t.full {
		cp := make([]Trace, t.idx)
		copy(cp, t.buf[:t.idx])
		return cp
	}

	cp := make([]Trace, t.size)
	n := copy(cp, t.buf[t.idx:])
	copy(cp[n:], t.buf[:t.idx])
	return cp
}

// Save persists the trace log atomically (tmp + fsync + rename).
func (t *TraceLog) Save() error {
	if t.path == "" {
		return nil
	}

	data, err := json.Marshal(t.Snapshot())
	if err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(t.path), 0755); err != nil {
		return err
	}

	tmp := t.path + ".tmp"
	f, err := os.Create(tmp)
	if err != nil {
		return err
	}

	if _, err := f.Write(data); err != nil {
		f.Close()
		return err
	}

	f.Sync()
	f.Close()

	return os.Rename(tmp, t.path)
}

const maxLoadSize = 10 * 1024 * 1024 // 10MB

// load replays persisted entries into the buffer. Errors are silently ignored.
func (t *TraceLog) load() {
	if t.path == "" {
		return
	}
	info, err := os.Stat(t.path)
	if err != nil {
		return
	}
	if info.Size() > maxLoadSize {
		return
	}
	data, err := os.ReadFile(t.path)
	if err != nil {
		return
	}
	var entries []Trace
	if json.Unmarshal(data, &entries) != nil {
		return
	}
	for _, e := range entries {
		t.Add(e)
	}
}

// ReplayFile loads a trace file and returns its entries for deterministic replay.
func ReplayFile(path string) ([]Trace, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var entries []Trace
	if err := json.Unmarshal(data, &entries); err != nil {
		return nil, err
	}
	return entries, nil
}
