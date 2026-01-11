package main

import (
	"container/list"
	"sync"
	"time"
)

// Outcome type enum values
const (
	OutcomeThrottle        = "throttle"
	OutcomeReview          = "review"
	OutcomeHold            = "hold"
	OutcomeAuthDegradation = "auth_degradation"
	OutcomeRateLimit       = "rate_limit"
	OutcomeOther           = "other"
	OutcomeNone            = "none"
)

// Outcome source enum values
const (
	OutcomeSourceManual        = "manual"
	OutcomeSourceStripeWebhook = "stripe_webhook"
	OutcomeSourceAdyenWebhook  = "adyen_webhook"
	OutcomeSourceOther         = "other"
)

// Warning represents a risk alert that can be annotated with outcomes
type Warning struct {
	WarningID      string    `json:"warning_id"`
	EventID        string    `json:"event_id"`
	Processor      string    `json:"processor"`
	MerchantIDHash string    `json:"merchant_id_hash,omitempty"`
	ProcessedAt    time.Time `json:"processed_at"`

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

// WarningStore is a thread-safe in-memory LRU cache for warnings
type WarningStore struct {
	mu       sync.RWMutex
	capacity int
	warnings map[string]*list.Element
	order    *list.List // Front = newest, Back = oldest
}

// warningEntry wraps Warning for LRU list
type warningEntry struct {
	warning *Warning
}

// NewWarningStore creates a new warning store with given capacity
func NewWarningStore(capacity int) *WarningStore {
	return &WarningStore{
		capacity: capacity,
		warnings: make(map[string]*list.Element),
		order:    list.New(),
	}
}

// Add adds a warning to the store, evicting oldest if at capacity
func (s *WarningStore) Add(w *Warning) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// If warning already exists, update it and move to front
	if elem, exists := s.warnings[w.WarningID]; exists {
		s.order.MoveToFront(elem)
		elem.Value.(*warningEntry).warning = w
		return
	}

	// Evict oldest if at capacity
	if s.order.Len() >= s.capacity {
		oldest := s.order.Back()
		if oldest != nil {
			oldWarning := oldest.Value.(*warningEntry).warning
			delete(s.warnings, oldWarning.WarningID)
			s.order.Remove(oldest)
		}
	}

	// Add new warning at front
	entry := &warningEntry{warning: w}
	elem := s.order.PushFront(entry)
	s.warnings[w.WarningID] = elem
}

// Get retrieves a warning by ID
func (s *WarningStore) Get(warningID string) (*Warning, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if elem, exists := s.warnings[warningID]; exists {
		return elem.Value.(*warningEntry).warning, true
	}
	return nil, false
}

// SetOutcome updates the outcome fields for a warning
func (s *WarningStore) SetOutcome(warningID, outcomeType, outcomeTimestamp, outcomeSource, outcomeNotes string) (*Warning, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	elem, exists := s.warnings[warningID]
	if !exists {
		return nil, false
	}

	w := elem.Value.(*warningEntry).warning

	// Set outcome fields
	w.OutcomeType = outcomeType
	w.OutcomeTimestamp = outcomeTimestamp
	w.OutcomeSource = outcomeSource
	w.OutcomeNotes = outcomeNotes
	w.OutcomeUpdatedAt = time.Now().UTC()

	// outcome_observed = true unless outcome_type == "none"
	w.OutcomeObserved = (outcomeType != OutcomeNone)

	// Move to front (recently accessed)
	s.order.MoveToFront(elem)

	return w, true
}

// List returns recent warnings (newest first), optionally filtered by processor
func (s *WarningStore) List(limit int, processor string) []*Warning {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]*Warning, 0, limit)
	count := 0

	for elem := s.order.Front(); elem != nil && count < limit; elem = elem.Next() {
		w := elem.Value.(*warningEntry).warning
		if processor == "" || w.Processor == processor {
			result = append(result, w)
			count++
		}
	}

	return result
}

// Count returns the number of warnings in the store
func (s *WarningStore) Count() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.order.Len()
}

// ValidOutcomeType checks if the outcome type is valid
func ValidOutcomeType(t string) bool {
	switch t {
	case OutcomeThrottle, OutcomeReview, OutcomeHold, OutcomeAuthDegradation,
		OutcomeRateLimit, OutcomeOther, OutcomeNone:
		return true
	}
	return false
}

// ValidOutcomeSource checks if the outcome source is valid
func ValidOutcomeSource(s string) bool {
	switch s {
	case OutcomeSourceManual, OutcomeSourceStripeWebhook, OutcomeSourceAdyenWebhook, OutcomeSourceOther:
		return true
	}
	return false
}
