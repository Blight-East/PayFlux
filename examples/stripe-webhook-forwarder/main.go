package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/stripe/stripe-go/v74"
	"github.com/stripe/stripe-go/v74/webhook"
)

// PayFluxEvent matches PayFlux's ingest schema
type PayFluxEvent struct {
	EventType           string `json:"event_type"`
	EventTimestamp      string `json:"event_timestamp"`
	EventID             string `json:"event_id"`
	MerchantIDHash      string `json:"merchant_id_hash"`
	PaymentIntentIDHash string `json:"payment_intent_id_hash"`
	Processor           string `json:"processor"`
	FailureCategory     string `json:"failure_category"`
	RetryCount          int    `json:"retry_count"`
	GeoBucket           string `json:"geo_bucket"`
	AmountBucket        string `json:"amount_bucket"`
	SystemSource        string `json:"system_source"`
	PaymentMethodBucket string `json:"payment_method_bucket"`
	Channel             string `json:"channel"`
	RetryResult         string `json:"retry_result"`
	FailureOrigin       string `json:"failure_origin"`
}

var (
	stripeWebhookSecret = os.Getenv("STRIPE_WEBHOOK_SECRET")
	payfluxAPIKey       = os.Getenv("PAYFLUX_API_KEY")
	payfluxIngestURL    = getEnv("PAYFLUX_INGEST_URL", "http://payflux:8080/v1/events/payment_exhaust")
	port                = getEnv("PORT", "8081")
	forwardTimeout      = 5 * time.Second

	// Async queue for forwarding
	eventQueue = make(chan PayFluxEvent, 100)

	// Idempotency cache (in-memory, bounded)
	processedEvents   = make(map[string]struct{})
	processedEventsMu sync.Mutex
	maxProcessedCache = 2000
)

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func main() {
	if stripeWebhookSecret == "" {
		log.Fatal("STRIPE_WEBHOOK_SECRET is required")
	}
	if payfluxAPIKey == "" {
		log.Fatal("PAYFLUX_API_KEY is required")
	}

	// Start async forwarder worker
	go forwarderWorker()

	http.HandleFunc("/webhooks/stripe", handleStripeWebhook)

	log.Printf("Stripe Webhook Forwarder listening on :%s", port)
	log.Printf("Forwarding to PayFlux: %s", payfluxIngestURL)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}

func handleStripeWebhook(w http.ResponseWriter, r *http.Request) {
	const MaxBodyBytes = int64(65536)
	r.Body = http.MaxBytesReader(w, r.Body, MaxBodyBytes)
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading request body: %v", err)
		w.WriteHeader(http.StatusServiceUnavailable)
		return
	}

	// Verify Stripe signature
	sigHeader := r.Header.Get("Stripe-Signature")
	event, err := webhook.ConstructEvent(payload, sigHeader, stripeWebhookSecret)
	if err != nil {
		log.Printf("Error verifying webhook signature: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	// Immediate 200 OK after verification
	w.WriteHeader(http.StatusOK)

	// Process event asynchronously
	go processEvent(event)
}

func processEvent(event stripe.Event) {
	// 1. Idempotency check (Best-effort, in-memory)
	processedEventsMu.Lock()
	if _, exists := processedEvents[event.ID]; exists {
		processedEventsMu.Unlock()
		return // Already processed this event
	}
	// Bounded footprint: if cache is full, reset it (simplest pilot-safe approach)
	if len(processedEvents) >= maxProcessedCache {
		processedEvents = make(map[string]struct{})
	}
	processedEvents[event.ID] = struct{}{}
	processedEventsMu.Unlock()

	// 2. Only handle specific event types
	switch event.Type {
	case "payment_intent.payment_failed", "charge.failed":
		// Proceed to normalization
	default:
		// Ignore other events for this pilot
		return
	}

	pfEvent := normalizeStripeEvent(event)

	// Push to async queue
	select {
	case eventQueue <- pfEvent:
		// Queued successfully
	default:
		log.Printf("Warning: Forwarder queue full, dropping event %s", event.ID)
	}
}

func normalizeStripeEvent(event stripe.Event) PayFluxEvent {
	var piID string
	var failureCode string
	var amount int64
	var currency string
	var country string
	var pmType string

	// Extract data based on event type
	switch event.Type {
	case "payment_intent.payment_failed":
		var pi stripe.PaymentIntent
		err := json.Unmarshal(event.Data.Raw, &pi)
		if err == nil {
			piID = pi.ID
			if pi.LastPaymentError != nil {
				failureCode = string(pi.LastPaymentError.Code)
			}
			amount = pi.Amount
			currency = string(pi.Currency)
			if pi.PaymentMethod != nil {
				pmType = string(pi.PaymentMethod.Type)
			}
		}
	case "charge.failed":
		var charge stripe.Charge
		err := json.Unmarshal(event.Data.Raw, &charge)
		if err == nil {
			if charge.PaymentIntent != nil {
				piID = charge.PaymentIntent.ID
			}
			failureCode = string(charge.FailureCode)
			amount = charge.Amount
			currency = string(charge.Currency)
			if charge.PaymentMethodDetails != nil {
				pmType = string(charge.PaymentMethodDetails.Type)
			}
			if charge.BillingDetails != nil && charge.BillingDetails.Address != nil {
				country = charge.BillingDetails.Address.Country
			}
		}
	}

	return PayFluxEvent{
		EventType:           event.Type,
		EventTimestamp:      time.Unix(event.Created, 0).Format(time.RFC3339),
		EventID:             event.ID,
		MerchantIDHash:      hashID(event.Account),
		PaymentIntentIDHash: hashID(piID),
		Processor:           "stripe",
		FailureCategory:     failureCode,
		RetryCount:          0, // Stripe webhooks don't explicitly provide retry count in standard payload
		GeoBucket:           getGeoBucket(country),
		AmountBucket:        getAmountBucket(amount, currency),
		SystemSource:        "stripe_webhook_forwarder",
		PaymentMethodBucket: pmType,
		Channel:             "web",
		RetryResult:         "fail",
		FailureOrigin:       "processor",
	}
}

func hashID(id string) string {
	if id == "" {
		return "none"
	}
	h := sha256.New()
	h.Write([]byte(id))
	return hex.EncodeToString(h.Sum(nil))[:16]
}

func getGeoBucket(country string) string {
	if country == "" {
		return "unknown"
	}
	return country // Simple mapping for pilot
}

func getAmountBucket(amount int64, currency string) string {
	// Simple buckets based on USD cents equivalent
	if amount < 1000 {
		return "low"
	} else if amount < 10000 {
		return "medium"
	}
	return "high"
}

func forwarderWorker() {
	client := &http.Client{
		Timeout: forwardTimeout,
	}

	for pfEvent := range eventQueue {
		err := forwardToPayFlux(client, pfEvent)
		if err != nil {
			log.Printf("Error forwarding event %s to PayFlux: %v", pfEvent.EventID, err)
		}
	}
}

func forwardToPayFlux(client *http.Client, event PayFluxEvent) error {
	body, err := json.Marshal(event)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", payfluxIngestURL, bytes.NewBuffer(body))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+payfluxAPIKey)

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("payflux returned %d: %s", resp.StatusCode, string(respBody))
	}

	log.Printf("Successfully forwarded event %s to PayFlux", event.EventID)
	return nil
}
