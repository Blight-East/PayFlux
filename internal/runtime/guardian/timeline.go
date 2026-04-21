package guardian

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type TimelineEntry struct {
	Timestamp string      `json:"timestamp"`
	Status    string      `json:"status"`
	Score     float64     `json:"score"`
	Cause     CauseReport `json:"cause"`
}

type Timeline struct {
	mu       sync.RWMutex
	buf      []TimelineEntry
	size     int
	index    int
	full     bool
	dirty    bool
	savePath string
}

func NewTimeline(size int, path string) *Timeline {
	if size <= 0 {
		size = 300
	}
	t := &Timeline{
		buf:      make([]TimelineEntry, size),
		size:     size,
		savePath: path,
	}
	t.load()
	return t
}

func (t *Timeline) Add(e TimelineEntry) {
	t.mu.Lock()
	defer t.mu.Unlock()

	t.buf[t.index] = e
	t.index++
	t.dirty = true

	if t.index >= t.size {
		t.index = 0
		t.full = true
	}
}

func (t *Timeline) Snapshot() []TimelineEntry {
	t.mu.RLock()
	defer t.mu.RUnlock()

	if !t.full {
		cp := make([]TimelineEntry, t.index)
		copy(cp, t.buf[:t.index])
		return cp
	}

	cp := make([]TimelineEntry, t.size)
	n := copy(cp, t.buf[t.index:])
	copy(cp[n:], t.buf[:t.index])
	return cp
}

func (t *Timeline) Save() error {
	if t.savePath == "" || !t.dirty {
		return nil
	}

	data, err := json.Marshal(t.Snapshot())
	if err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(t.savePath), 0755); err != nil {
		return err
	}

	tmp := t.savePath + ".tmp"
	if err := os.WriteFile(tmp, data, 0644); err != nil {
		return err
	}

	t.dirty = false
	return os.Rename(tmp, t.savePath)
}

func (t *Timeline) load() {
	if t.savePath == "" {
		return
	}
	data, err := os.ReadFile(t.savePath)
	if err != nil {
		return
	}
	var entries []TimelineEntry
	if json.Unmarshal(data, &entries) != nil {
		// rotate corrupted file
		_ = os.Rename(t.savePath, t.savePath+".corrupted")
		return
	}
	for _, e := range entries {
		t.Add(e)
	}
}

func NowEntry(dec Decision, score float64) TimelineEntry {
	return TimelineEntry{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Status:    dec.Status,
		Score:     score,
		Cause:     dec.Cause,
	}
}
