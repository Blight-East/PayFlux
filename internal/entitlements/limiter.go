package entitlements

import (
	"sync/atomic"
)

// ConcurrencyLimiter manages per-tier concurrent request limits
type ConcurrencyLimiter struct {
	counters map[string]*int64 // tier -> active request count
}

// NewConcurrencyLimiter creates a new concurrency limiter
func NewConcurrencyLimiter() *ConcurrencyLimiter {
	return &ConcurrencyLimiter{
		counters: map[string]*int64{
			"baseline": new(int64),
			"proof":    new(int64),
			"shield":   new(int64),
			"fortress": new(int64),
		},
	}
}

// TryAcquire attempts to acquire a slot for the given tier
// Returns true if acquired, false if limit exceeded
func (cl *ConcurrencyLimiter) TryAcquire(tier string, limit int) bool {
	counter, ok := cl.counters[tier]
	if !ok {
		// Unknown tier - use baseline counter
		counter = cl.counters["baseline"]
	}

	// Atomic increment and check
	current := atomic.AddInt64(counter, 1)
	if current > int64(limit) {
		// Exceeded limit - decrement and reject
		atomic.AddInt64(counter, -1)
		return false
	}

	return true
}

// Release releases a slot for the given tier
func (cl *ConcurrencyLimiter) Release(tier string) {
	counter, ok := cl.counters[tier]
	if !ok {
		counter = cl.counters["baseline"]
	}
	atomic.AddInt64(counter, -1)
}

// GetActive returns the current active request count for a tier
func (cl *ConcurrencyLimiter) GetActive(tier string) int64 {
	counter, ok := cl.counters[tier]
	if !ok {
		counter = cl.counters["baseline"]
	}
	return atomic.LoadInt64(counter)
}
