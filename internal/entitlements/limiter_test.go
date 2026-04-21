package entitlements

import (
	"sync"
	"sync/atomic"
	"testing"
)

func TestConcurrencyLimiter_TryAcquire(t *testing.T) {
	limiter := NewConcurrencyLimiter()

	// Test successful acquisition
	if !limiter.TryAcquire("proof", 10) {
		t.Error("should acquire when under limit")
	}

	if limiter.GetActive("proof") != 1 {
		t.Errorf("expected 1 active, got %d", limiter.GetActive("proof"))
	}

	limiter.Release("proof")

	if limiter.GetActive("proof") != 0 {
		t.Errorf("expected 0 active after release, got %d", limiter.GetActive("proof"))
	}
}

func TestConcurrencyLimiter_ExceedLimit(t *testing.T) {
	limiter := NewConcurrencyLimiter()

	// Acquire up to limit
	for i := 0; i < 5; i++ {
		if !limiter.TryAcquire("baseline", 5) {
			t.Errorf("should acquire slot %d", i)
		}
	}

	// Try to exceed limit
	if limiter.TryAcquire("baseline", 5) {
		t.Error("should reject when limit exceeded")
	}

	// Release one and try again
	limiter.Release("baseline")
	if !limiter.TryAcquire("baseline", 5) {
		t.Error("should acquire after release")
	}
}

func TestConcurrencyLimiter_UnknownTier(t *testing.T) {
	limiter := NewConcurrencyLimiter()

	// Unknown tier should use baseline counter
	if !limiter.TryAcquire("unknown", 10) {
		t.Error("should acquire for unknown tier")
	}

	// Should affect baseline counter
	if limiter.GetActive("baseline") != 1 {
		t.Error("unknown tier should use baseline counter")
	}

	limiter.Release("unknown")
}

func TestConcurrencyLimiter_Parallel(t *testing.T) {
	limiter := NewConcurrencyLimiter()
	limit := 100
	goroutines := 200

	var wg sync.WaitGroup
	acquired := int64(0)
	rejected := int64(0)

	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if limiter.TryAcquire("fortress", limit) {
				atomic.AddInt64(&acquired, 1)
				// Simulate work
				limiter.Release("fortress")
			} else {
				atomic.AddInt64(&rejected, 1)
			}
		}()
	}

	wg.Wait()

	if limiter.GetActive("fortress") != 0 {
		t.Errorf("expected 0 active after all released, got %d", limiter.GetActive("fortress"))
	}

	t.Logf("acquired: %d, rejected: %d", acquired, rejected)
}

func TestConcurrencyLimiter_PanicSafety(t *testing.T) {
	limiter := NewConcurrencyLimiter()

	func() {
		defer func() {
			if r := recover(); r != nil {
				// Panic occurred, release should still happen
				limiter.Release("proof")
			}
		}()

		if !limiter.TryAcquire("proof", 10) {
			t.Fatal("should acquire")
		}

		// Simulate panic
		panic("test panic")
	}()

	// Counter should be back to 0
	if limiter.GetActive("proof") != 0 {
		t.Errorf("expected 0 after panic recovery, got %d", limiter.GetActive("proof"))
	}
}

func BenchmarkConcurrencyLimiter_TryAcquire(b *testing.B) {
	limiter := NewConcurrencyLimiter()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		limiter.TryAcquire("proof", 1000)
		limiter.Release("proof")
	}
}

func BenchmarkConcurrencyLimiter_Parallel(b *testing.B) {
	limiter := NewConcurrencyLimiter()

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			if limiter.TryAcquire("shield", 10000) {
				limiter.Release("shield")
			}
		}
	})
}
