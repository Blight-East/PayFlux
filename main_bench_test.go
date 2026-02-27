package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
)

// BenchmarkIngest measures the pure overhead of the ingest handler.
// It bypasses the network and Stripe external calls (via mock/noop if possible).
func BenchmarkIngest(b *testing.B) {
	// Setup a no-op Redis client for minimal overhead in benchmark
	// If we want to measure Redis impact, use a real local Redis.
	rdb = redis.NewClient(&redis.Options{Addr: "localhost:6379"})

	// Initialize metrics/keys so it doesn't panic
	validAPIKeys = []string{"bench-key"}

	payload := Event{
		EventID:        "550e8400-e29b-41d4-a716-446655440000",
		EventType:      "benchmark",
		EventTimestamp: time.Now().Format(time.RFC3339),
		Processor:      "stripe",
	}
	body, _ := json.Marshal(payload)

	// We only benchmark the handler logic

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := httptest.NewRequest("POST", "/v1/events/payment_exhaust", bytes.NewBuffer(body))
		req.Header.Set("Authorization", "Bearer bench-key")
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		handleEvent(w, req)

		if w.Code != http.StatusAccepted {
			b.Fatalf("expected 202, got %d", w.Code)
		}
	}
}
