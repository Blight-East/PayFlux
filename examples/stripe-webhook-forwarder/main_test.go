package main

import (
	"encoding/json"
	"testing"

	"github.com/stripe/stripe-go/v74"
)

func TestNormalizeStripeEvent_PaymentIntentFailed(t *testing.T) {
	pi := stripe.PaymentIntent{
		ID:       "pi_123",
		Amount:   5000,
		Currency: "usd",
		LastPaymentError: &stripe.Error{
			Code: "card_declined",
		},
	}
	piRaw, _ := json.Marshal(pi)

	event := stripe.Event{
		ID:      "evt_123",
		Type:    "payment_intent.payment_failed",
		Created: 1609459200, // 2021-01-01T00:00:00Z
		Account: "acct_123",
		Data: &stripe.EventData{
			Raw: piRaw,
		},
	}

	pfEvent := normalizeStripeEvent(event)

	if pfEvent.EventType != "payment_intent.payment_failed" {
		t.Errorf("Expected event_type payment_intent.payment_failed, got %s", pfEvent.EventType)
	}
	if pfEvent.EventID != "evt_123" {
		t.Errorf("Expected event_id evt_123, got %s", pfEvent.EventID)
	}
	if pfEvent.FailureCategory != "card_declined" {
		t.Errorf("Expected failure_category card_declined, got %s", pfEvent.FailureCategory)
	}
	if pfEvent.AmountBucket != "medium" {
		t.Errorf("Expected amount_bucket medium, got %s", pfEvent.AmountBucket)
	}
	if pfEvent.Processor != "stripe" {
		t.Errorf("Expected processor stripe, got %s", pfEvent.Processor)
	}
}

func TestHashID(t *testing.T) {
	id := "acct_123"
	hash := hashID(id)
	if len(hash) != 16 {
		t.Errorf("Expected hash length 16, got %d", len(hash))
	}

	hash2 := hashID(id)
	if hash != hash2 {
		t.Error("Hashing should be deterministic")
	}

	hashEmpty := hashID("")
	if hashEmpty != "none" {
		t.Errorf("Expected empty hash to be 'none', got %s", hashEmpty)
	}
}

func TestProcessEvent_Idempotency(t *testing.T) {
	// Clear queue and cache for test isolation
	for len(eventQueue) > 0 {
		<-eventQueue
	}
	processedEventsMu.Lock()
	processedEvents = make(map[string]struct{})
	processedEventsMu.Unlock()

	// Mock event with raw data to avoid unmarshal errors in normalization
	pi := stripe.PaymentIntent{ID: "pi_123"}
	piRaw, _ := json.Marshal(pi)
	event := stripe.Event{
		ID:   "evt_dedupe_test",
		Type: "payment_intent.payment_failed",
		Data: &stripe.EventData{Raw: piRaw},
	}

	// First processing
	processEvent(event)
	if len(eventQueue) != 1 {
		t.Errorf("Expected 1 event in queue, got %d", len(eventQueue))
	}

	// Duplicate processing
	processEvent(event)
	if len(eventQueue) != 1 {
		t.Errorf("Expected still 1 event in queue after duplicate, got %d", len(eventQueue))
	}
}
