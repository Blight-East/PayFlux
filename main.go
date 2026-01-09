package main

import (
	"bufio"
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"runtime/debug"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
	"github.com/stripe/stripe-go/v74"
	"github.com/stripe/stripe-go/v74/checkout/session"
	"golang.org/x/time/rate"
)

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

type CheckoutRequest struct {
	Email string `json:"email"`
}

// Constants
const (
	dedupTTL    = 24 * time.Hour
	maxRetries  = 5
	maxBodySize = 1 * 1024 * 1024 // 1MB
)

var (
	ctx = context.Background()

	rdb       *redis.Client
	streamKey = "events_stream"
	groupName = "payment_consumers"
	dlqKey    = "events_stream_dlq"

	// XAUTOCLAIM: reclaim stuck messages after this idle time
	minIdleToClaim = 30 * time.Second

	// Stream retention config (set in main)
	streamMaxLen int64

	// Rate limit config (set in main)
	rateLimitRPS   float64
	rateLimitBurst int

	// Panic mode config (set in main)
	panicMode string // "crash" or "recover"

	// Valid API keys (set in main)
	validAPIKeys []string

	// Export config (set in main)
	exportMode         string   // "stdout", "file", "both"
	exportFile         *os.File // file handle if file export enabled
	exportWriter       *bufio.Writer
	consumerNameGlobal string // for export metadata

	// Export health tracking (atomic int64 Unix timestamps)
	exportLastSuccessStdout int64    // atomic
	exportLastSuccessFile   int64    // atomic
	exportLastErrorStdout   int64    // atomic
	exportLastErrorFile     int64    // atomic
	exportLastErrorReason   sync.Map // destination -> reason string
)

// Rate limiter map
var (
	rateLimiters = make(map[string]*rate.Limiter)
	rlMu         sync.RWMutex
)

// Prometheus metrics
var (
	ingestAccepted = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "payflux_ingest_accepted_total",
		Help: "Total number of events accepted by the ingest endpoint.",
	})
	ingestRejected = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "payflux_ingest_rejected_total",
		Help: "Total number of events rejected by the ingest endpoint.",
	})
	consumerProcessed = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "payflux_consumer_processed_total",
		Help: "Total number of events processed by the consumer.",
	})
	consumerDlq = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "payflux_consumer_dlq_total",
		Help: "Total number of events sent to the DLQ.",
	})
	ingestDuplicate = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "payflux_ingest_duplicate_total",
		Help: "Events rejected as duplicates via event_id",
	})
	streamLength = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "payflux_stream_length",
		Help: "Current number of messages in the stream",
	})
	pendingCount = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "payflux_pending_messages",
		Help: "Messages pending acknowledgement in consumer group",
	})
	ingestLatency = prometheus.NewHistogram(prometheus.HistogramOpts{
		Name:    "payflux_ingest_duration_seconds",
		Help:    "Latency of HTTP ingest endpoint",
		Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1},
	})
	eventsByProcessor = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "payflux_events_by_processor_total",
		Help: "Events ingested, labeled by processor",
	}, []string{"processor"})
	eventsExported = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "payflux_events_exported_total",
		Help: "Events exported after processing",
	}, []string{"destination"})
	exportErrors = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "payflux_export_errors_total",
		Help: "Export errors by destination and reason",
	}, []string{"destination", "reason"})
	exportLastSuccess = prometheus.NewGaugeVec(prometheus.GaugeOpts{
		Name: "payflux_exports_last_success_timestamp_seconds",
		Help: "Unix timestamp of last successful export",
	}, []string{"destination"})
)

func main() {
	// Load env (optional)
	_ = godotenv.Load()

	// Initialize structured logging (JSON handler)
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	redisAddr := env("REDIS_ADDR", "localhost:6379")
	httpAddr := env("HTTP_ADDR", ":8080")

	// Load API keys (multi-key support)
	validAPIKeys = loadAPIKeys()
	if len(validAPIKeys) == 0 {
		log.Fatal("PAYFLUX_API_KEY or PAYFLUX_API_KEYS must be set")
	}
	slog.Info("api_keys_loaded", "count", len(validAPIKeys))

	// Load rate limit config
	rateLimitRPS = float64(envInt("PAYFLUX_RATELIMIT_RPS", 100))
	rateLimitBurst = envInt("PAYFLUX_RATELIMIT_BURST", 500)
	slog.Info("rate_limit_configured", "rps", rateLimitRPS, "burst", rateLimitBurst)

	// Load stream retention config
	streamMaxLen = int64(envInt("PAYFLUX_STREAM_MAXLEN", 200000))
	if streamMaxLen > 0 {
		slog.Info("stream_retention_enabled", "maxlen", streamMaxLen)
	} else {
		slog.Info("stream_retention_disabled")
	}

	// Load panic mode config
	panicMode = env("PAYFLUX_PANIC_MODE", "crash")
	if panicMode != "crash" && panicMode != "recover" {
		log.Fatalf("PAYFLUX_PANIC_MODE must be 'crash' or 'recover', got: %s", panicMode)
	}
	slog.Info("panic_mode", "mode", panicMode)

	// Stripe key validation
	stripeKey := os.Getenv("STRIPE_API_KEY")
	if stripeKey == "" || !strings.HasPrefix(stripeKey, "sk_") {
		log.Fatal("STRIPE_API_KEY missing or invalid format (must start with sk_)")
	}
	stripe.Key = stripeKey
	slog.Info("stripe_configured")

	prometheus.MustRegister(
		ingestAccepted, ingestRejected, consumerProcessed, consumerDlq, ingestDuplicate,
		streamLength, pendingCount, ingestLatency, eventsByProcessor, eventsExported,
		exportErrors, exportLastSuccess,
	)

	// Redis connection pool
	rdb = redis.NewClient(&redis.Options{
		Addr:         redisAddr,
		PoolSize:     100,
		MinIdleConns: 10,
		MaxRetries:   3,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
		PoolTimeout:  4 * time.Second,
	})
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("redis_connect_failed addr=%s err=%v", redisAddr, err)
	}
	slog.Info("redis_connected", "addr", redisAddr)

	// Create consumer group safely
	if err := ensureConsumerGroup(streamKey, groupName); err != nil {
		log.Fatalf("consumer_group_failed stream=%s group=%s err=%v", streamKey, groupName, err)
	}
	slog.Info("consumer_group_ready", "stream", streamKey, "group", groupName)

	// Setup export
	if err := setupExport(); err != nil {
		log.Fatalf("export_setup_failed err=%v", err)
	}
	defer cleanupExport()

	// Start consumer
	go consumeEvents()

	// Start metrics updater
	go updateStreamMetrics()

	// Routes
	mux := http.NewServeMux()

	// Apply auth and rate limit middleware
	mux.HandleFunc("/v1/events/payment_exhaust",
		authMiddleware(rateLimitMiddleware(handleEvent)))
	mux.HandleFunc("/checkout",
		authMiddleware(rateLimitMiddleware(handleCheckout)))

	// Health and metrics remain unauthenticated
	mux.HandleFunc("/health", handleHealth)
	mux.Handle("/metrics", promhttp.Handler())
	mux.HandleFunc("/export/health", handleExportHealth)

	// Graceful shutdown
	srv := &http.Server{
		Addr:         httpAddr,
		Handler:      mux,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		slog.Info("server_listening", "addr", httpAddr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server_failed err=%v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutdown_initiated")

	// Graceful shutdown with 30s timeout
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown_forced err=%v", err)
	}

	log.Println("shutdown_complete")
}

// loadAPIKeys loads API keys from env vars (multi-key support)
func loadAPIKeys() []string {
	var keys []string

	// Try PAYFLUX_API_KEYS first (comma-separated)
	if keysStr := os.Getenv("PAYFLUX_API_KEYS"); keysStr != "" {
		for _, k := range strings.Split(keysStr, ",") {
			k = strings.TrimSpace(k)
			if k != "" {
				keys = append(keys, k)
			}
		}
	}

	// Fall back to single PAYFLUX_API_KEY
	if len(keys) == 0 {
		if k := strings.TrimSpace(os.Getenv("PAYFLUX_API_KEY")); k != "" {
			keys = append(keys, k)
		}
	}

	return keys
}

// generateConsumerName creates a unique consumer name
func generateConsumerName() string {
	// Check for explicit name first
	if name := env("PAYFLUX_CONSUMER_NAME", ""); name != "" {
		return name
	}

	// Generate: hostname-pid-random
	hostname, _ := os.Hostname()
	if hostname == "" {
		hostname = "unknown"
	}

	randBytes := make([]byte, 4)
	_, _ = rand.Read(randBytes)
	randSuffix := hex.EncodeToString(randBytes)

	return fmt.Sprintf("%s-%d-%s", hostname, os.Getpid(), randSuffix)
}

// Panic handling with configurable mode
func consumeEvents() {
	consumerName := generateConsumerName()
	consumerNameGlobal = consumerName // Store for export metadata
	slog.Info("consumer_started", "group", groupName, "stream", streamKey, "consumer", consumerName)

	defer func() {
		if r := recover(); r != nil {
			log.Printf("consumer_panic panic=%v stack=%s", r, string(debug.Stack()))

			if panicMode == "recover" {
				// Restart consumer after brief delay
				time.Sleep(5 * time.Second)
				log.Println("consumer_restarting")
				go consumeEvents()
			} else {
				// Default: crash - let supervisor restart the process
				log.Fatal("consumer_panic_exit")
			}
		}
	}()

	claimStart := "0-0"
	errorBackoff := 0 // For exponential backoff on errors

	for {
		// 1) Crash recovery: reclaim stuck/pending messages
		for {
			msgs, next, err := rdb.XAutoClaim(ctx, &redis.XAutoClaimArgs{
				Stream:   streamKey,
				Group:    groupName,
				Consumer: consumerName,
				MinIdle:  minIdleToClaim,
				Start:    claimStart,
				Count:    50,
			}).Result()

			if err != nil {
				log.Printf("xautoclaim_error err=%v", err)
				// Apply backoff
				errorBackoff++
				time.Sleep(calculateBackoff(errorBackoff))
				break
			}

			// Reset backoff on success
			errorBackoff = 0

			claimStart = next
			if len(msgs) == 0 {
				break
			}

			for _, msg := range msgs {
				handleMessageWithDlq(msg)
			}
		}

		// 2) Normal consumption of new messages
		streams, err := rdb.XReadGroup(ctx, &redis.XReadGroupArgs{
			Group:    groupName,
			Consumer: consumerName,
			Streams:  []string{streamKey, ">"},
			Count:    50,
			Block:    2 * time.Second,
		}).Result()

		if err != nil {
			if errors.Is(err, redis.Nil) {
				continue
			}
			log.Printf("xreadgroup_error err=%v", err)
			// Apply backoff on error
			errorBackoff++
			time.Sleep(calculateBackoff(errorBackoff))
			continue
		}

		// Reset backoff on success
		errorBackoff = 0

		for _, s := range streams {
			for _, msg := range s.Messages {
				handleMessageWithDlq(msg)
			}
		}
	}
}

// Authentication middleware (multi-key support with constant-time compare)
func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if !strings.HasPrefix(auth, "Bearer ") {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		token := strings.TrimPrefix(auth, "Bearer ")

		// Check against all valid keys using constant-time comparison
		valid := false
		for _, key := range validAPIKeys {
			if subtle.ConstantTimeCompare([]byte(token), []byte(key)) == 1 {
				valid = true
				break
			}
		}

		if !valid {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		next(w, r)
	}
}

// Rate limiting with configurable limits
func getRateLimiter(key string) *rate.Limiter {
	rlMu.RLock()
	limiter, exists := rateLimiters[key]
	rlMu.RUnlock()

	if exists {
		return limiter
	}

	rlMu.Lock()
	defer rlMu.Unlock()

	// Double-check after acquiring write lock
	if limiter, exists := rateLimiters[key]; exists {
		return limiter
	}

	limiter = rate.NewLimiter(rate.Limit(rateLimitRPS), rateLimitBurst)
	rateLimiters[key] = limiter
	return limiter
}

func rateLimitMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		apiKey := strings.TrimPrefix(auth, "Bearer ")

		limiter := getRateLimiter(apiKey)
		if !limiter.Allow() {
			w.Header().Set("Retry-After", "1")
			http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		next(w, r)
	}
}

// Input validation
func validateEvent(e *Event) error {
	// UUID validation
	if _, err := uuid.Parse(e.EventID); err != nil {
		return fmt.Errorf("event_id must be valid UUID: %w", err)
	}

	// Timestamp validation (RFC3339 format)
	if _, err := time.Parse(time.RFC3339, e.EventTimestamp); err != nil {
		return fmt.Errorf("event_timestamp must be RFC3339 format: %w", err)
	}

	// Event type validation
	if strings.TrimSpace(e.EventType) == "" {
		return fmt.Errorf("event_type is required")
	}

	// Processor enum validation
	validProcessors := map[string]bool{
		"stripe": true, "adyen": true, "checkout": true, "internal": true,
	}
	if !validProcessors[e.Processor] {
		return fmt.Errorf("invalid processor: %s (must be stripe, adyen, checkout, or internal)", e.Processor)
	}

	// String length limits (prevent DoS via huge strings)
	if len(e.MerchantIDHash) > 100 {
		return fmt.Errorf("merchant_id_hash exceeds 100 characters")
	}
	if len(e.PaymentIntentIDHash) > 100 {
		return fmt.Errorf("payment_intent_id_hash exceeds 100 characters")
	}
	if len(e.FailureCategory) > 100 {
		return fmt.Errorf("failure_category exceeds 100 characters")
	}
	if len(e.GeoBucket) > 20 {
		return fmt.Errorf("geo_bucket exceeds 20 characters")
	}

	// Retry count sanity check
	if e.RetryCount < 0 || e.RetryCount > 100 {
		return fmt.Errorf("retry_count must be between 0 and 100")
	}

	return nil
}

// Email sanitization
func sanitizeEmail(email string) string {
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return "invalid"
	}
	return parts[0][:min(3, len(parts[0]))] + "***@" + parts[1]
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Background metrics updater
func updateStreamMetrics() {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		// Stream length
		length, err := rdb.XLen(ctx, streamKey).Result()
		if err == nil {
			streamLength.Set(float64(length))
		} else {
			log.Printf("metrics_stream_length_error err=%v", err)
		}

		// Pending count
		pending, err := rdb.XPending(ctx, streamKey, groupName).Result()
		if err == nil {
			pendingCount.Set(float64(pending.Count))
		} else {
			log.Printf("metrics_pending_count_error err=%v", err)
		}
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	// Quick Redis ping so health actually means something
	if err := rdb.Ping(ctx).Err(); err != nil {
		http.Error(w, "redis not ok", http.StatusServiceUnavailable)
		return
	}
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
}

func handleEvent(w http.ResponseWriter, r *http.Request) {
	// Track latency
	start := time.Now()
	defer func() {
		ingestLatency.Observe(time.Since(start).Seconds())
	}()

	if r.Method != http.MethodPost {
		ingestRejected.Inc()
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Body size limit
	r.Body = http.MaxBytesReader(w, r.Body, maxBodySize)
	defer r.Body.Close()

	var e Event
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		ingestRejected.Inc()
		if strings.Contains(err.Error(), "http: request body too large") {
			http.Error(w, "payload too large", http.StatusRequestEntityTooLarge)
			return
		}
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	// Comprehensive validation
	if err := validateEvent(&e); err != nil {
		ingestRejected.Inc()
		http.Error(w, fmt.Sprintf("validation error: %v", err), http.StatusBadRequest)
		return
	}

	// Idempotency check
	dedupKey := fmt.Sprintf("dedup:%s", e.EventID)
	wasSet, err := rdb.SetNX(ctx, dedupKey, "1", dedupTTL).Result()
	if err != nil {
		log.Printf("dedup_check_error event_id=%s err=%v", e.EventID, err)
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	if !wasSet {
		// Already processed - return success (idempotent)
		ingestDuplicate.Inc()
		w.WriteHeader(http.StatusAccepted)
		return
	}

	data, err := json.Marshal(e)
	if err != nil {
		ingestRejected.Inc()
		http.Error(w, "failed to serialize event", http.StatusInternalServerError)
		return
	}

	// Track by processor
	eventsByProcessor.WithLabelValues(e.Processor).Inc()

	// XADD to stream
	if err := rdb.XAdd(ctx, &redis.XAddArgs{
		Stream: streamKey,
		Values: map[string]any{"data": string(data)},
	}).Err(); err != nil {
		ingestRejected.Inc()
		http.Error(w, "failed to enqueue", http.StatusInternalServerError)
		return
	}

	// Stream retention: trim if configured
	if streamMaxLen > 0 {
		// Use approximate trimming (~) for performance
		if err := rdb.XTrimMaxLenApprox(ctx, streamKey, streamMaxLen, 0).Err(); err != nil {
			log.Printf("stream_trim_error err=%v", err)
		}
	}

	ingestAccepted.Inc()
	w.WriteHeader(http.StatusAccepted)
}

func handleCheckout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if stripe.Key == "" {
		http.Error(w, "stripe not configured", http.StatusInternalServerError)
		return
	}

	// Body size limit
	r.Body = http.MaxBytesReader(w, r.Body, maxBodySize)
	defer r.Body.Close()

	var req CheckoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && !errors.Is(err, http.ErrBodyNotAllowed) {
		if strings.Contains(err.Error(), "http: request body too large") {
			http.Error(w, "payload too large", http.StatusRequestEntityTooLarge)
			return
		}
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	// Price in cents (default $99.00)
	priceCents := int64(9900)
	if v := os.Getenv("PRICE_CENTS"); v != "" {
		if parsed, err := strconv.ParseInt(v, 10, 64); err == nil && parsed > 0 {
			priceCents = parsed
		}
	}

	productName := env("PRODUCT_NAME", "PayFlux Early Access")

	siteURL := env("SITE_URL", "https://payflux.dev")
	successURL := siteURL + "/success.html"
	cancelURL := siteURL + "/"

	params := &stripe.CheckoutSessionParams{
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Quantity: stripe.Int64(1),
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency:   stripe.String(string(stripe.CurrencyUSD)),
					UnitAmount: stripe.Int64(priceCents),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name: stripe.String(productName),
					},
				},
			},
		},
	}

	if strings.TrimSpace(req.Email) != "" {
		params.CustomerEmail = stripe.String(strings.TrimSpace(req.Email))
	}

	s, err := session.New(params)
	if err != nil {
		// Log with sanitized context only
		log.Printf("stripe_session_failed email=%s err_type=%T",
			sanitizeEmail(req.Email), err)
		http.Error(w, "payment session failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"url": s.URL})
}

func ensureConsumerGroup(stream, group string) error {
	_, err := rdb.XGroupCreateMkStream(ctx, stream, group, "0").Result()
	if err == nil {
		return nil
	}
	// BUSYGROUP means it already exists
	if strings.Contains(err.Error(), "BUSYGROUP") {
		return nil
	}
	// WRONGTYPE means key exists but isn't a stream
	if strings.Contains(err.Error(), "WRONGTYPE") {
		return fmt.Errorf("stream key %q exists but is not a Redis Stream (wrong type)", stream)
	}
	return err
}

// DLQ retry budget
func handleMessageWithDlq(msg redis.XMessage) {
	// Check retry count via XPENDING
	pending, err := rdb.XPendingExt(ctx, &redis.XPendingExtArgs{
		Stream: streamKey,
		Group:  groupName,
		Start:  msg.ID,
		End:    msg.ID,
		Count:  1,
	}).Result()

	retryCount := int64(1)
	if err == nil && len(pending) == 1 {
		retryCount = pending[0].RetryCount
	}

	// Enforce retry budget
	if retryCount > maxRetries {
		log.Printf("dlq_max_retries id=%s retries=%d", msg.ID, retryCount)
		_ = sendToDlq(msg, "max_retries_exceeded")
		return
	}

	// Extract data
	dataAny, ok := msg.Values["data"]
	if !ok {
		log.Printf("message_missing_data id=%s", msg.ID)
		_ = sendToDlq(msg, "missing_data_field")
		return
	}

	dataStr, ok := dataAny.(string)
	if !ok {
		log.Printf("message_data_not_string id=%s", msg.ID)
		_ = sendToDlq(msg, "invalid_data_type")
		return
	}

	// Validate JSON structure
	var event Event
	if err := json.Unmarshal([]byte(dataStr), &event); err != nil {
		log.Printf("event_unmarshal_error id=%s err=%v", msg.ID, err)
		_ = sendToDlq(msg, "unmarshal_failed")
		return
	}

	// Process successfully
	log.Printf("event_processed id=%s type=%s processor=%s",
		msg.ID, event.EventType, event.Processor)
	consumerProcessed.Inc()

	// ACK first - must succeed before export
	if err := rdb.XAck(ctx, streamKey, groupName, msg.ID).Err(); err != nil {
		log.Printf("xack_error id=%s err=%v", msg.ID, err)
		return
	}

	// Export event (best-effort after ACK)
	exportEvent(event, msg.ID)

}

// Updated sendToDlq with reason and timestamp
func sendToDlq(msg redis.XMessage, reason string) error {
	consumerDlq.Inc()

	raw := ""
	if v, ok := msg.Values["data"]; ok {
		if s, ok2 := v.(string); ok2 {
			raw = s
		}
	}

	err := rdb.XAdd(ctx, &redis.XAddArgs{
		Stream: dlqKey,
		Values: map[string]any{
			"data":        raw,
			"original_id": msg.ID,
			"reason":      reason,
			"timestamp":   time.Now().Unix(),
		},
	}).Err()

	if err != nil {
		log.Printf("dlq_add_error id=%s err=%v", msg.ID, err)
		return err
	}

	// Must ACK to remove from pending
	if err := rdb.XAck(ctx, streamKey, groupName, msg.ID).Err(); err != nil {
		log.Printf("dlq_xack_error id=%s err=%v", msg.ID, err)
		return err
	}

	log.Printf("dlq_sent id=%s reason=%s", msg.ID, reason)
	return nil
}

// ExportDestinationStatus holds per-destination export state
type ExportDestinationStatus struct {
	Enabled            bool    `json:"enabled"`
	LastSuccessUnix    float64 `json:"last_success_ts,omitempty"`
	LastSuccessRFC3339 string  `json:"last_success_rfc3339,omitempty"`
	LastErrorUnix      float64 `json:"last_error_ts,omitempty"`
	LastErrorRFC3339   string  `json:"last_error_rfc3339,omitempty"`
	LastErrorReason    string  `json:"last_error_reason,omitempty"`
}

// ExportHealthResponse is returned by /export/health
type ExportHealthResponse struct {
	Enabled      bool                               `json:"enabled"`
	ExportMode   string                             `json:"export_mode,omitempty"`
	FilePath     string                             `json:"file_path,omitempty"`
	Destinations map[string]ExportDestinationStatus `json:"destinations,omitempty"`
}

func handleExportHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	response := ExportHealthResponse{
		Enabled: exportMode != "",
	}

	if exportMode != "" {
		response.ExportMode = exportMode
		if exportFile != nil {
			response.FilePath = exportFile.Name()
		}

		// Build per-destination status from internal atomic state
		response.Destinations = make(map[string]ExportDestinationStatus)

		// Stdout status
		if exportMode == "stdout" || exportMode == "both" {
			status := ExportDestinationStatus{Enabled: true}
			if successTs := atomic.LoadInt64(&exportLastSuccessStdout); successTs > 0 {
				status.LastSuccessUnix = float64(successTs)
				status.LastSuccessRFC3339 = time.Unix(successTs, 0).UTC().Format(time.RFC3339)
			}
			if errorTs := atomic.LoadInt64(&exportLastErrorStdout); errorTs > 0 {
				status.LastErrorUnix = float64(errorTs)
				status.LastErrorRFC3339 = time.Unix(errorTs, 0).UTC().Format(time.RFC3339)
				if reason, ok := exportLastErrorReason.Load("stdout"); ok {
					status.LastErrorReason = reason.(string)
				}
			}
			response.Destinations["stdout"] = status
		}

		// File status
		if exportMode == "file" || exportMode == "both" {
			status := ExportDestinationStatus{Enabled: true}
			if successTs := atomic.LoadInt64(&exportLastSuccessFile); successTs > 0 {
				status.LastSuccessUnix = float64(successTs)
				status.LastSuccessRFC3339 = time.Unix(successTs, 0).UTC().Format(time.RFC3339)
			}
			if errorTs := atomic.LoadInt64(&exportLastErrorFile); errorTs > 0 {
				status.LastErrorUnix = float64(errorTs)
				status.LastErrorRFC3339 = time.Unix(errorTs, 0).UTC().Format(time.RFC3339)
				if reason, ok := exportLastErrorReason.Load("file"); ok {
					status.LastErrorReason = reason.(string)
				}
			}
			response.Destinations["file"] = status
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(response)
}

func env(key, fallback string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	return v
}

func envInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	i, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return i
}

// setupExport initializes export writers based on configuration
func setupExport() error {
	exportMode = env("PAYFLUX_EXPORT_MODE", "stdout")
	if exportMode != "stdout" && exportMode != "file" && exportMode != "both" {
		return fmt.Errorf("invalid PAYFLUX_EXPORT_MODE: %s (must be stdout, file, or both)", exportMode)
	}

	if exportMode == "file" || exportMode == "both" {
		filePath := os.Getenv("PAYFLUX_EXPORT_FILE")
		if filePath == "" {
			return fmt.Errorf("PAYFLUX_EXPORT_FILE must be set when using file or both mode")
		}

		f, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
		if err != nil {
			return fmt.Errorf("failed to open export file: %w", err)
		}
		exportFile = f
		exportWriter = bufio.NewWriter(f)
		log.Printf("export_configured mode=%s file=%s", exportMode, filePath)
	} else {
		log.Printf("export_configured mode=%s", exportMode)
	}

	return nil
}

// cleanupExport flushes and closes export resources
func cleanupExport() {
	if exportWriter != nil {
		_ = exportWriter.Flush()
	}
	if exportFile != nil {
		_ = exportFile.Close()
	}
}

// ExportedEvent is the JSON structure written to export destinations
type ExportedEvent struct {
	EventID         string `json:"event_id"`
	EventType       string `json:"event_type"`
	EventTimestamp  string `json:"event_timestamp"`
	Processor       string `json:"processor"`
	StreamMessageID string `json:"stream_message_id"`
	ConsumerName    string `json:"consumer_name"`
	ProcessedAt     string `json:"processed_at"`
}

// exportEvent writes the processed event to configured destinations
func exportEvent(event Event, messageID string) {
	exported := ExportedEvent{
		EventID:         event.EventID,
		EventType:       event.EventType,
		EventTimestamp:  event.EventTimestamp,
		Processor:       event.Processor,
		StreamMessageID: messageID,
		ConsumerName:    consumerNameGlobal,
		ProcessedAt:     time.Now().UTC().Format(time.RFC3339),
	}

	data, err := json.Marshal(exported)
	if err != nil {
		log.Printf("export_marshal_error event_id=%s err=%v", event.EventID, err)
		exportErrors.WithLabelValues(exportMode, "marshal").Inc()
		return
	}

	// Add newline for line-delimited JSON
	data = append(data, '\n')

	if exportMode == "stdout" || exportMode == "both" {
		_, err := os.Stdout.Write(data)
		if err != nil {
			log.Printf("export_stdout_error event_id=%s err=%v", event.EventID, err)
			exportErrors.WithLabelValues("stdout", "write").Inc()
			// Record error timestamp
			atomic.StoreInt64(&exportLastErrorStdout, time.Now().Unix())
			exportLastErrorReason.Store("stdout", "write")
		} else {
			eventsExported.WithLabelValues("stdout").Inc()
			// Record success timestamp (atomic + Prometheus)
			now := time.Now().Unix()
			atomic.StoreInt64(&exportLastSuccessStdout, now)
			exportLastSuccess.WithLabelValues("stdout").Set(float64(now))
		}
	}

	if (exportMode == "file" || exportMode == "both") && exportWriter != nil {
		_, err := exportWriter.Write(data)
		if err != nil {
			log.Printf("export_file_error event_id=%s err=%v", event.EventID, err)
			exportErrors.WithLabelValues("file", "write").Inc()
			// Record error timestamp
			atomic.StoreInt64(&exportLastErrorFile, time.Now().Unix())
			exportLastErrorReason.Store("file", "write")
		} else {
			// Flush periodically (every write is okay for moderate throughput)
			err := exportWriter.Flush()
			if err != nil {
				log.Printf("export_file_flush_error event_id=%s err=%v", event.EventID, err)
				exportErrors.WithLabelValues("file", "flush").Inc()
				// Record error timestamp
				atomic.StoreInt64(&exportLastErrorFile, time.Now().Unix())
				exportLastErrorReason.Store("file", "flush")
			} else {
				eventsExported.WithLabelValues("file").Inc()
				// Record success timestamp (atomic + Prometheus)
				now := time.Now().Unix()
				atomic.StoreInt64(&exportLastSuccessFile, now)
				exportLastSuccess.WithLabelValues("file").Set(float64(now))
			}
		}
	}
}

// calculateBackoff returns exponential backoff duration (100ms doubling, capped at 2s)
func calculateBackoff(attempt int) time.Duration {
	if attempt == 0 {
		return 0
	}
	// 100ms * 2^attempt, capped at 2s
	backoff := time.Duration(100) * time.Millisecond * time.Duration(1<<uint(min(attempt, 4)))
	if backoff > 2*time.Second {
		backoff = 2 * time.Second
	}
	return backoff
}
