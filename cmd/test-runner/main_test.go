package main

import (
	"payment-node/internal/testharness"
	"testing"
)

func TestProcessHourEvents(t *testing.T) {
	original := sendBatchFunc
	defer func() { sendBatchFunc = original }()

	makeEvents := func(n int) []*testharness.PaymentEvent {
		ev := make([]*testharness.PaymentEvent, n)
		for i := range ev {
			ev[i] = &testharness.PaymentEvent{}
		}
		return ev
	}

	t.Run("success sends all events in 500-sized batches", func(t *testing.T) {
		var calls []int
		sendBatchFunc = func(batch []*testharness.PaymentEvent) error {
			calls = append(calls, len(batch))
			return nil
		}

		stats := &IngestionStats{}
		processHourEvents(makeEvents(1200), stats)

		if stats.Sent != 1200 || stats.Errors != 0 {
			t.Fatalf("got sent=%d errors=%d, want sent=1200 errors=0", stats.Sent, stats.Errors)
		}
		if len(calls) != 3 || calls[0] != 500 || calls[1] != 500 || calls[2] != 200 {
			t.Fatalf("batch calls=%v, want [500 500 200]", calls)
		}
	})

	t.Run("error increments Errors by batch size and does not increment Sent", func(t *testing.T) {
		var calls []int
		sendBatchFunc = func(batch []*testharness.PaymentEvent) error {
			calls = append(calls, len(batch))
			return &mockError{}
		}

		stats := &IngestionStats{}
		processHourEvents(makeEvents(1200), stats)

		if stats.Sent != 0 || stats.Errors != 1200 {
			t.Fatalf("got sent=%d errors=%d, want sent=0 errors=1200", stats.Sent, stats.Errors)
		}
		if len(calls) != 3 || calls[0] != 500 || calls[1] != 500 || calls[2] != 200 {
			t.Fatalf("batch calls=%v, want [500 500 200]", calls)
		}
	})
}

type mockError struct{}

func (e *mockError) Error() string { return "mock error" }
