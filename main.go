package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
	"github.com/stripe/stripe-go/v74"
	"github.com/stripe/stripe-go/v74/checkout/session"
)

// Event represents a payment event
type Event struct {
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
	ctx       = context.Background()
	rdb       *redis.Client
	streamKey = "events_stream"
	groupName = "payment_consumers"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found — make sure STRIPE_API_KEY is set")
	}

	stripe.Key = os.Getenv("STRIPE_API_KEY")
	if stripe.Key == "" {
		log.Fatal("STRIPE_API_KEY is not set")
	}

	// Connect to Redis
	rdb = redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	log.Println("Connected to Redis")

	// Create consumer group safely
	_, err := rdb.XGroupCreateMkStream(ctx, streamKey, groupName, "0").Result()
	if err != nil && !strings.Contains(err.Error(), "BUSYGROUP") {
		log.Fatalf("Failed to create consumer group: %v", err)
	}
	log.Println("Consumer group ready")

	// Start consumer in a separate goroutine
	go consumeEvents()

	// HTTP endpoints
	http.HandleFunc("/v1/events/payment_exhaust", handleEvent)
	http.HandleFunc("/v1/checkout", handleCheckoutSession)
	http.Handle("/metrics", promhttp.Handler())
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	log.Println("Server listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

// handleEvent ingests payment events into Redis
func handleEvent(w http.ResponseWriter, r *http.Request) {
	var e Event
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	data, _ := json.Marshal(e)
	if err := rdb.XAdd(ctx, &redis.XAddArgs{
		Stream: streamKey,
		Values: map[string]interface{}{"data": string(data)},
	}).Err(); err != nil {
		http.Error(w, "Failed to enqueue event", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusAccepted)
}

// consumeEvents reads from Redis Streams
func consumeEvents() {
	consumerName := "consumer-1"
	for {
		streams, err := rdb.XReadGroup(ctx, &redis.XReadGroupArgs{
			Group:    groupName,
			Consumer: consumerName,
			Streams:  []string{streamKey, ">"},
			Block:    0,
			Count:    10,
		}).Result()
		if err != nil {
			log.Printf("Error reading from stream: %v", err)
			continue
		}

		for _, s := range streams {
			for _, msg := range s.Messages {
				log.Printf("Processing event: %v", msg.Values["data"])
				rdb.XAck(ctx, streamKey, groupName, msg.ID)
			}
		}
	}
}

// handleCheckoutSession creates a Stripe Checkout session
func handleCheckoutSession(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		Mode:              stripe.String(string(stripe.CheckoutSessionModePayment)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("usd"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name: stripe.String("PayFlux Early Access"),
					},
					UnitAmount: stripe.Int64(1999), // $19.99
				},
				Quantity: stripe.Int64(1),
			},
		},
		SuccessURL:    stripe.String("https://payflux.dev/success"),
		CancelURL:     stripe.String("https://payflux.dev/cancel"),
		CustomerEmail: stripe.String(req.Email),
	}

	s, err := session.New(params)
	if err != nil {
		http.Error(w, fmt.Sprintf("Stripe session error: %v", err), http.StatusInternalServerError)
		return
	}

	resp := map[string]string{"url": s.URL}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
