package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
)

type Event struct {
	EventType            string `json:"event_type"`
	EventTimestamp       string `json:"event_timestamp"`
	EventID              string `json:"event_id"`
	MerchantIDHash       string `json:"merchant_id_hash"`
	PaymentIntentIDHash  string `json:"payment_intent_id_hash"`
	Processor            string `json:"processor"`
	FailureCategory      string `json:"failure_category"`
	RetryCount           int    `json:"retry_count"`
	GeoBucket            string `json:"geo_bucket"`
	AmountBucket         string `json:"amount_bucket"`
	SystemSource         string `json:"system_source"`
	PaymentMethodBucket  string `json:"payment_method_bucket"`
	Channel              string `json:"channel"`
	RetryResult          string `json:"retry_result"`
	FailureOrigin        string `json:"failure_origin"`
}

var (
	ctx = context.Background()

	redisAddr = env("REDIS_ADDR", "localhost:6379")
	streamKey = env("STREAM_KEY", "events_stream")
	groupName = env("GROUP_NAME", "payment_consumers")

	rdb *redis.Client
)

func main() {
	rdb = redis.NewClient(&redis.Options{Addr: redisAddr})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis at %s: %v", redisAddr, err)
	}
	log.Printf("Connected to Redis (%s)", redisAddr)

	// Ensure stream + group exist (safe if already exists)
	_, err := rdb.XGroupCreateMkStream(ctx, streamKey, groupName, "0").Result()
	if err != nil && !strings.Contains(err.Error(), "BUSYGROUP") {
		log.Fatalf("Failed to create consumer group: %v", err)
	}
	log.Printf("Consumer group ready (stream=%s group=%s)", streamKey, groupName)

	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		// basic liveness + redis ping
		if err := rdb.Ping(ctx).Err(); err != nil {
			http.Error(w, "redis not ok", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	mux.Handle("/metrics", promhttp.Handler())

	mux.HandleFunc("/v1/events/payment_exhaust", handleEvent)

	addr := env("HTTP_ADDR", ":8080")
	log.Printf("Ingest listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func handleEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "POST only", http.StatusMethodNotAllowed)
		return
	}

	var e Event
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// If timestamp missing, fill something deterministic-ish
	if strings.TrimSpace(e.EventTimestamp) == "" {
		e.EventTimestamp = time.Now().UTC().Format(time.RFC3339)
	}

	b, err := json.Marshal(e)
	if err != nil {
		http.Error(w, "Failed to encode", http.StatusInternalServerError)
		return
	}

	if err := rdb.XAdd(ctx, &redis.XAddArgs{
		Stream: streamKey,
		Values: map[string]any{"data": string(b)},
	}).Err(); err != nil {
		http.Error(w, "Failed to enqueue event", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusAccepted)
}

func env(k, def string) string {
	if v := os.Getenv(k); strings.TrimSpace(v) != "" {
		return v
	}
	return def
}
