package config

import (
	"sync"
	"sync/atomic"
	"time"
)

// SignalOverride represents runtime overrides for a signal
// All fields are pointers - nil means "use default from runtime config"
type SignalOverride struct {
	Enabled    *bool    // Override enabled state
	Severity   *string  // Override severity level
	Threshold  *float64 // Override threshold value
	ExpiresAt  *int64   // Optional expiry timestamp (unix seconds)
	ReasonCode *string  // Categorical justification (incident_mitigation, enterprise_override, etc.)
	UpdatedAt  int64    // Unix timestamp of last update
}

// OverrideStore provides thread-safe storage for signal overrides
// Uses atomic.Value for lock-free reads with mutex-protected writes
type OverrideStore struct {
	overrides atomic.Value // map[string]SignalOverride
	mu        sync.Mutex   // protects writes only
}

// NewOverrideStore creates a new override store
func NewOverrideStore() *OverrideStore {
	store := &OverrideStore{}
	store.overrides.Store(make(map[string]SignalOverride))
	return store
}

// GetOverride retrieves an override for a signal ID
// Returns (override, true) if found, (zero-value, false) if not found
// O(1) lookup, lock-free
func (s *OverrideStore) GetOverride(id string) (SignalOverride, bool) {
	m := s.overrides.Load().(map[string]SignalOverride)
	override, ok := m[id]
	return override, ok
}

// SetOverride sets or updates an override for a signal ID
// Uses mutex for writes, atomic.Value for lock-free reads
func (s *OverrideStore) SetOverride(id string, override SignalOverride) {
	// Set update timestamp
	override.UpdatedAt = time.Now().Unix()

	s.mu.Lock()
	defer s.mu.Unlock()

	// Copy-on-write: create new map with update
	oldMap := s.overrides.Load().(map[string]SignalOverride)
	newMap := make(map[string]SignalOverride, len(oldMap)+1)

	// Copy existing entries
	for k, v := range oldMap {
		newMap[k] = v
	}

	// Add/update entry
	newMap[id] = override

	// Atomic store (readers see old or new map, never partial state)
	s.overrides.Store(newMap)
}

// DeleteOverride removes an override for a signal ID
// Uses mutex for writes, atomic.Value for lock-free reads
func (s *OverrideStore) DeleteOverride(id string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	oldMap := s.overrides.Load().(map[string]SignalOverride)

	// Check if entry exists
	if _, exists := oldMap[id]; !exists {
		return // Nothing to delete
	}

	// Copy-on-write: create new map without entry
	newMap := make(map[string]SignalOverride, len(oldMap)-1)

	// Copy all entries except the one being deleted
	for k, v := range oldMap {
		if k != id {
			newMap[k] = v
		}
	}

	// Atomic store
	s.overrides.Store(newMap)
}

// ListOverrides returns a copy of all current overrides
// Returns a new map to prevent external modification
func (s *OverrideStore) ListOverrides() map[string]SignalOverride {
	m := s.overrides.Load().(map[string]SignalOverride)

	// Return copy to prevent external modification
	result := make(map[string]SignalOverride, len(m))
	for k, v := range m {
		result[k] = v
	}

	return result
}

// Global override store (set during bootstrap)
var globalOverrideStore *OverrideStore

// SetGlobalOverrideStore sets the global override store instance
func SetGlobalOverrideStore(store *OverrideStore) {
	globalOverrideStore = store
}

// GetGlobalOverrideStore returns the global override store instance
func GetGlobalOverrideStore() *OverrideStore {
	return globalOverrideStore
}
