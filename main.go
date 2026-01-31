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
	streamMaxLen    int64
	rawEventTTLDays int // PAYFLUX_RAW_EVENT_TTL_DAYS (default 7)

	// Rate limit config (set in main)
	rateLimitRPS   float64
	rateLimitBurst int

	// Panic mode config (set in main)
	panicMode string // "crash" or "recover"

	// Valid API keys (set in main)
	validAPIKeys   []string
	revokedAPIKeys []string // Keys denied even if in validAPIKeys

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

	// Risk Scorer (v0.2.1+)
	riskScorer       *RiskScorer
	riskScoreEnabled bool
	riskScoreWindow  int
	riskThresholds   [3]float64

	// Tier gating (v0.2.2+)
	exportTier string // "tier1" or "tier2" (default tier1)

	// Pilot mode (v0.2.3+)
	pilotModeEnabled bool
	warningStore     *WarningStore

	// Operational Guardrails (v0.2.4+)
	payfluxEnv            string // "dev" or "prod" (default dev)
	ingestEnabled         bool   // PAYFLUX_INGEST_ENABLED (default true)
	warningsEnabled       bool   // PAYFLUX_WARNINGS_ENABLED (default true)
	tier2Enabled          bool   // PAYFLUX_TIER2_ENABLED (default true)
	ingestRPS             float64
	ingestBurst           int
	outcomeRPS            float64
	outcomeBurst          int
	backpressureThreshold int64 // Stream depth threshold for warning logs
)

// Rate limiter maps (per API key)
var (
	rateLimiters    = make(map[string]*rate.Limiter)
	outcomeLimiters = make(map[string]*rate.Limiter) // Separate for outcome endpoint
	rlMu            sync.RWMutex
	outcomeRlMu     sync.RWMutex
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

	// Risk metrics (v0.2.1+)
	riskEventsTotal = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "payflux_processor_risk_events_total",
		Help: "Events grouped by processor and risk band",
	}, []string{"processor", "band"})
	riskScoreLast = prometheus.NewGaugeVec(prometheus.GaugeOpts{
		Name: "payflux_processor_risk_score_last",
		Help: "Last computed risk score per processor",
	}, []string{"processor"})

	// Tier 2 metrics (v0.2.2+)
	tier2ContextEmitted = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "payflux_tier2_context_emitted_total",
		Help: "Count of events with processor_playbook_context emitted (Tier 2 only)",
	})
	tier2TrajectoryEmitted = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "payflux_tier2_trajectory_emitted_total",
		Help: "Count of events with risk_trajectory emitted (Tier 2 only)",
	})

	// Pilot metrics (v0.2.3+)
	warningOutcomeSetTotal = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "payflux_warning_outcome_set_total",
		Help: "Count of warning outcomes set by type and source",
	}, []string{"outcome_type", "source"})
	warningOutcomeLeadTime = prometheus.NewHistogram(prometheus.HistogramOpts{
		Name:    "payflux_warning_outcome_lead_time_seconds",
		Help:    "Time between warning emission and outcome annotation",
		Buckets: []float64{60, 300, 900, 1800, 3600, 7200, 14400, 28800, 86400}, // 1m to 24h
	})

	// Guardrail metrics (v0.2.4+)
	ingestRateLimited = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "payflux_ingest_rate_limited_total",
		Help: "Requests rejected due to rate limiting",
	}, []string{"endpoint"})
	warningsSuppressed = prometheus.NewCounter(prometheus.CounterOpts{
		Name: "payflux_warnings_suppressed_total",
		Help: "Warnings not created due to PAYFLUX_WARNINGS_ENABLED=false",
	})
	consumerLagMessages = prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "payflux_consumer_lag_messages",
		Help: "Estimated consumer lag (pending messages in group)",
	})
	authDenied = prometheus.NewCounterVec(prometheus.CounterOpts{
		Name: "payflux_auth_denied_total",
		Help: "Authentication denials by reason",
	}, []string{"reason"})
	warningLatency = prometheus.NewHistogram(prometheus.HistogramOpts{
		Name:    "payflux_warning_latency_seconds",
		Help:    "Time from upstream event to warning creation",
		Buckets: []float64{0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60, 120, 300},
	})
)

// Helper: Setup logging
func setupLogging() {
	_ = godotenv.Load()
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))
}

// Helper: Load all configuration from environment
func loadConfiguration() (redisAddr, httpAddr string) {
	redisAddr = env("REDIS_ADDR", "localhost:6379")
	httpAddr = env("HTTP_ADDR", ":8080")

	// Load API keys (multi-key support)
	validAPIKeys = loadAPIKeys()
	if len(validAPIKeys) == 0 {
		log.Fatal("PAYFLUX_API_KEY or PAYFLUX_API_KEYS must be set")
	}
	slog.Info("api_keys_loaded", "count", len(validAPIKeys))

	// Load revoked keys (denylist)
	revokedAPIKeys = loadRevokedAPIKeys()
	if len(revokedAPIKeys) > 0 {
		slog.Warn("revoked_keys_loaded", "count", len(revokedAPIKeys))
	}

	// Load rate limit config (legacy vars, still supported)
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

	// Load raw event TTL config (time-based retention)
	rawEventTTLDays = envInt("PAYFLUX_RAW_EVENT_TTL_DAYS", 7)
	if rawEventTTLDays > 0 {
		slog.Info("raw_event_ttl_enabled", "ttl_days", rawEventTTLDays)
	} else {
		slog.Info("raw_event_ttl_disabled")
	}

	// Load panic mode config
	panicMode = env("PAYFLUX_PANIC_MODE", "crash")
	if panicMode != "crash" && panicMode != "recover" {
		log.Fatalf("PAYFLUX_PANIC_MODE must be 'crash' or 'recover', got: %s", panicMode)
	}
	slog.Info("panic_mode", "mode", panicMode)

	loadRiskScoringConfig()
	loadTierConfig()
	loadPilotModeConfig()
	loadGuardrailsConfig()

	return redisAddr, httpAddr
}

// Helper: Load risk scoring configuration
func loadRiskScoringConfig() {
	riskScoreEnabled = env("PAYFLUX_RISK_SCORE_ENABLED", "true") == "true"
	riskScoreWindow = envInt("PAYFLUX_RISK_SCORE_WINDOW_SEC", 300)
	thresholdsStr := env("PAYFLUX_RISK_SCORE_THRESHOLDS", "0.3,0.6,0.8")
	parts := strings.Split(thresholdsStr, ",")
	riskThresholds = [3]float64{0.3, 0.6, 0.8}
	if len(parts) == 3 {
		for i, p := range parts {
			if f, err := strconv.ParseFloat(p, 64); err == nil {
				riskThresholds[i] = f
			}
		}
	}
	if riskScoreEnabled {
		riskScorer = NewRiskScorer(riskScoreWindow, riskThresholds)
		slog.Info("risk_scorer_initialized", "window_sec", riskScoreWindow, "thresholds", thresholdsStr)
	}
}

// Helper: Load tier configuration
func loadTierConfig() {
	exportTier = env("PAYFLUX_TIER", "tier1")
	if exportTier != "tier1" && exportTier != "tier2" {
		log.Fatalf("PAYFLUX_TIER must be 'tier1' or 'tier2', got: %s", exportTier)
	}
	slog.Info("tier_config", "tier", exportTier)
	if exportTier == "tier1" {
		slog.Info("tier_hint", "msg", "Set PAYFLUX_TIER=tier2 to include playbook context and risk trajectory in exports")
	}
}

// Helper: Load pilot mode configuration
func loadPilotModeConfig() {
	pilotModeEnabled = env("PAYFLUX_PILOT_MODE", "false") == "true"
	if pilotModeEnabled {
		warningStore = NewWarningStore(1000)
		slog.Info("pilot_mode_enabled", "warning_store_capacity", 1000)
	}
}

// Helper: Load operational guardrails configuration
func loadGuardrailsConfig() {
	payfluxEnv = env("PAYFLUX_ENV", "dev")
	if payfluxEnv != "dev" && payfluxEnv != "prod" {
		log.Fatalf("PAYFLUX_ENV must be 'dev' or 'prod', got: %s", payfluxEnv)
	}

	// Kill switches (default enabled)
	ingestEnabled = env("PAYFLUX_INGEST_ENABLED", "true") == "true"
	warningsEnabled = env("PAYFLUX_WARNINGS_ENABLED", "true") == "true"
	tier2Enabled = env("PAYFLUX_TIER2_ENABLED", "true") == "true"

	// Rate limit config (separate for ingest and outcome)
	ingestRPS = float64(envInt("PAYFLUX_INGEST_RPS", 100))
	ingestBurst = envInt("PAYFLUX_INGEST_BURST", 500)
	outcomeRPS = float64(envInt("PAYFLUX_OUTCOME_RPS", 10))
	outcomeBurst = envInt("PAYFLUX_OUTCOME_BURST", 20)
	backpressureThreshold = int64(envInt("PAYFLUX_BACKPRESSURE_THRESHOLD", 10000))

	// Loud startup logs for guardrail state
	slog.Info("guardrails_config",
		"env", payfluxEnv,
		"ingest_enabled", ingestEnabled,
		"warnings_enabled", warningsEnabled,
		"tier2_enabled", tier2Enabled,
		"ingest_rps", ingestRPS,
		"ingest_burst", ingestBurst,
		"outcome_rps", outcomeRPS,
		"outcome_burst", outcomeBurst,
		"backpressure_threshold", backpressureThreshold,
	)

	if !ingestEnabled {
		slog.Warn("INGEST_DISABLED", "msg", "Event ingestion is disabled via PAYFLUX_INGEST_ENABLED=false")
	}
	if !warningsEnabled {
		slog.Warn("WARNINGS_DISABLED", "msg", "Warning creation is disabled via PAYFLUX_WARNINGS_ENABLED=false")
	}
	if !tier2Enabled {
		slog.Warn("TIER2_DISABLED", "msg", "Tier 2 enrichment is disabled via PAYFLUX_TIER2_ENABLED=false")
	}
}

// Helper: Validate production requirements
func validateProduction() {
	if payfluxEnv == "prod" {
		if err := validateAPIKeysForProd(validAPIKeys); err != nil {
			log.Fatalf("API key validation failed in prod mode: %v", err)
		}
		slog.Info("api_keys_validated_for_prod")
	}

	stripeKey := os.Getenv("STRIPE_API_KEY")
	if stripeKey == "" || !strings.HasPrefix(stripeKey, "sk_") {
		log.Fatal("STRIPE_API_KEY missing or invalid format (must start with sk_)")
	}
	stripe.Key = stripeKey
	slog.Info("stripe_configured")
}

// Helper: Initialize Prometheus metrics
func initializePrometheus() {
	prometheus.MustRegister(
		ingestAccepted, ingestRejected, consumerProcessed, consumerDlq, ingestDuplicate,
		streamLength, pendingCount, ingestLatency, eventsByProcessor, eventsExported,
		exportErrors, exportLastSuccess, riskEventsTotal, riskScoreLast,
		tier2ContextEmitted, tier2TrajectoryEmitted,
		warningOutcomeSetTotal, warningOutcomeLeadTime,
		ingestRateLimited, warningsSuppressed, consumerLagMessages,
		authDenied, warningLatency,
	)
}

// Helper: Setup Redis connection and consumer group
func setupRedis(redisAddr string) {
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

	if err := ensureConsumerGroup(streamKey, groupName); err != nil {
		log.Fatalf("consumer_group_failed stream=%s group=%s err=%v", streamKey, groupName, err)
	}
	slog.Info("consumer_group_ready", "stream", streamKey, "group", groupName)
}

// Helper: Setup export and start background workers
func setupExportAndConsumer() {
	if err := setupExport(); err != nil {
		log.Fatalf("export_setup_failed err=%v", err)
	}

	go consumeEvents()
	go updateStreamMetrics()

	if rawEventTTLDays > 0 {
		go runStreamRetention()
	}
}

// Helper: Setup HTTP server and routes
func setupHTTPServer(httpAddr string) *http.Server {
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

	registerPilotRoutes(mux)
	registerEvidenceRoutes(mux)

	return &http.Server{
		Addr:         httpAddr,
		Handler:      mux,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}
}

// Helper: Register pilot mode routes
func registerPilotRoutes(mux *http.ServeMux) {
	if pilotModeEnabled && warningStore != nil {
		mux.HandleFunc("/pilot/dashboard", authMiddleware(pilotDashboardHandler(warningStore)))
		mux.HandleFunc("/pilot/warnings", authMiddleware(pilotWarningsListHandler(warningStore)))
		mux.HandleFunc("/pilot/warnings/", authMiddleware(func(w http.ResponseWriter, r *http.Request) {
			if strings.HasSuffix(r.URL.Path, "/outcome") {
				outcomeRateLimitMiddleware(func(w http.ResponseWriter, r *http.Request) {
					pilotOutcomeHandler(warningStore,
						func(outcomeType, source string) {
							warningOutcomeSetTotal.WithLabelValues(outcomeType, source).Inc()
						},
						func(seconds float64) {
							warningOutcomeLeadTime.Observe(seconds)
						})(w, r)
				})(w, r)
			} else {
				pilotWarningGetHandler(warningStore)(w, r)
			}
		}))
		slog.Info("pilot_routes_registered", "endpoints", []string{"/pilot/dashboard", "/pilot/warnings", "/pilot/warnings/{id}/outcome"})
	}
}

// Helper: Register evidence console routes
func registerEvidenceRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/evidence", corsMiddleware(authMiddleware(handleEvidence)))
	mux.HandleFunc("/api/evidence/health", corsMiddleware(authMiddleware(handleEvidenceHealth)))

	if payfluxEnv == "dev" {
		mux.HandleFunc("/api/evidence/fixtures/", corsMiddleware(authMiddleware(handleEvidenceFixture)))
		slog.Info("dev_route_registered", "path", "/api/evidence/fixtures/")
	}
}

// Helper: Run server with graceful shutdown
func runServer(srv *http.Server) {
	go func() {
		slog.Info("server_listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server_failed err=%v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutdown_initiated")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown_forced err=%v", err)
	}

	log.Println("shutdown_complete")
}

func main() {
	setupLogging()

	redisAddr, httpAddr := loadConfiguration()
	validateProduction()

	initializePrometheus()
	setupRedis(redisAddr)
	setupExportAndConsumer()
	defer cleanupExport()

	srv := setupHTTPServer(httpAddr)
	runServer(srv)
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

// loadRevokedAPIKeys loads revoked API keys from env var (denylist)
func loadRevokedAPIKeys() []string {
	var keys []string

	if keysStr := os.Getenv("PAYFLUX_REVOKED_KEYS"); keysStr != "" {
		for _, k := range strings.Split(keysStr, ",") {
			k = strings.TrimSpace(k)
			if k != "" {
				keys = append(keys, k)
			}
		}
	}

	return keys
}

// validateAPIKeysForProd checks API keys meet production requirements
func validateAPIKeysForProd(keys []string) error {
	placeholders := map[string]bool{
		"":                  true,
		"changeme":          true,
		"test":              true,
		"your-api-key-here": true,
		"dev-secret-key":    true,
	}

	for _, key := range keys {
		if placeholders[key] {
			return fmt.Errorf("placeholder API key detected: use a real key in production")
		}
		if len(key) < 16 {
			return fmt.Errorf("API key too short: minimum 16 characters in production")
		}
	}
	return nil
}

// safeAPIKeyID returns a safe identifier for logging (first 8 chars + ...)
func safeAPIKeyID(key string) string {
	if len(key) <= 8 {
		return "***"
	}
	return key[:8] + "..."
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

// runStreamRetention periodically purges raw events older than rawEventTTLDays.
// Uses Redis XTRIM with MINID to delete entries older than the cutoff.
func runStreamRetention() {
	// Run immediately on startup
	purgeOldStreamEntries()

	// Then run hourly
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for range ticker.C {
		purgeOldStreamEntries()
	}
}

// purgeOldStreamEntries trims the events_stream to remove entries older than rawEventTTLDays.
// Redis stream IDs are millisecond timestamps, so we compute a cutoff ID.
func purgeOldStreamEntries() {
	if rawEventTTLDays <= 0 {
		return
	}

	// Compute cutoff: now - TTL days in milliseconds
	cutoffTime := time.Now().Add(-time.Duration(rawEventTTLDays) * 24 * time.Hour)
	cutoffMs := cutoffTime.UnixMilli()
	cutoffID := fmt.Sprintf("%d-0", cutoffMs)

	// Get stream length before trim
	lenBefore, err := rdb.XLen(ctx, streamKey).Result()
	if err != nil {
		slog.Error("stream_retention_len_error", "error", err)
		return
	}

	// XTRIM with MINID to delete entries older than cutoff
	trimmed, err := rdb.XTrimMinID(ctx, streamKey, cutoffID).Result()
	if err != nil {
		slog.Error("stream_retention_trim_error", "error", err)
		return
	}

	// Get stream length after trim
	lenAfter, err := rdb.XLen(ctx, streamKey).Result()
	if err != nil {
		slog.Error("stream_retention_len_after_error", "error", err)
		return
	}

	slog.Info("stream_retention_purge_completed",
		"cutoff_id", cutoffID,
		"cutoff_time", cutoffTime.Format(time.RFC3339),
		"len_before", lenBefore,
		"len_after", lenAfter,
		"trimmed", trimmed,
	)
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
			authDenied.WithLabelValues("missing_key").Inc()
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		token := strings.TrimSpace(strings.TrimPrefix(auth, "Bearer "))

		// Check revocation list first (takes precedence over allowlist)
		for _, key := range revokedAPIKeys {
			if subtle.ConstantTimeCompare([]byte(token), []byte(key)) == 1 {
				authDenied.WithLabelValues("revoked_key").Inc()
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
		}

		// Check against all valid keys using constant-time comparison
		valid := false
		for _, key := range validAPIKeys {
			if subtle.ConstantTimeCompare([]byte(token), []byte(key)) == 1 {
				valid = true
				break
			}
		}

		if !valid {
			authDenied.WithLabelValues("invalid_key").Inc()
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		next(w, r)
	}
}

// corsMiddleware handles preflight and allows dashboard access
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

// Rate limiting with configurable limits (ingest endpoint)
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

	limiter = rate.NewLimiter(rate.Limit(ingestRPS), ingestBurst)
	rateLimiters[key] = limiter
	return limiter
}

// getOutcomeLimiter returns rate limiter for outcome endpoint (stricter)
func getOutcomeLimiter(key string) *rate.Limiter {
	outcomeRlMu.RLock()
	limiter, exists := outcomeLimiters[key]
	outcomeRlMu.RUnlock()

	if exists {
		return limiter
	}

	outcomeRlMu.Lock()
	defer outcomeRlMu.Unlock()

	if limiter, exists := outcomeLimiters[key]; exists {
		return limiter
	}

	limiter = rate.NewLimiter(rate.Limit(outcomeRPS), outcomeBurst)
	outcomeLimiters[key] = limiter
	return limiter
}

func rateLimitMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		apiKey := strings.TrimPrefix(auth, "Bearer ")

		limiter := getRateLimiter(apiKey)
		if !limiter.Allow() {
			ingestRateLimited.WithLabelValues(r.URL.Path).Inc()
			slog.Warn("rate_limit_exceeded",
				"endpoint", r.URL.Path,
				"api_key_id", safeAPIKeyID(apiKey),
				"limit_rps", ingestRPS,
				"burst", ingestBurst,
			)
			w.Header().Set("Retry-After", "1")
			http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		next(w, r)
	}
}

// outcomeRateLimitMiddleware is a stricter limiter for pilot outcome endpoint
func outcomeRateLimitMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		apiKey := strings.TrimPrefix(auth, "Bearer ")

		limiter := getOutcomeLimiter(apiKey)
		if !limiter.Allow() {
			ingestRateLimited.WithLabelValues(r.URL.Path).Inc()
			slog.Warn("rate_limit_exceeded",
				"endpoint", r.URL.Path,
				"api_key_id", safeAPIKeyID(apiKey),
				"limit_rps", outcomeRPS,
				"burst", outcomeBurst,
			)
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

		// Pending count (consumer lag)
		pending, err := rdb.XPending(ctx, streamKey, groupName).Result()
		var pendingCountVal int64
		if err == nil {
			pendingCountVal = pending.Count
			pendingCount.Set(float64(pendingCountVal))
			consumerLagMessages.Set(float64(pendingCountVal))
		} else {
			log.Printf("metrics_pending_count_error err=%v", err)
		}

		// Backpressure warning log (if above threshold)
		if length > backpressureThreshold {
			slog.Warn("stream_backpressure",
				"stream_depth", length,
				"pending_messages", pendingCountVal,
				"threshold", backpressureThreshold,
			)
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
	// Ingest kill switch check
	if !ingestEnabled {
		http.Error(w, "event ingestion temporarily disabled", http.StatusServiceUnavailable)
		return
	}

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

	// Risk signals (v0.2.1+)
	ProcessorRiskScore   float64  `json:"processor_risk_score,omitempty"`
	ProcessorRiskBand    string   `json:"processor_risk_band,omitempty"`
	ProcessorRiskDrivers []string `json:"processor_risk_drivers,omitempty"`

	// Tier 1 only: Upgrade hint (v0.2.3+)
	UpgradeHint string `json:"upgrade_hint,omitempty"`

	// Tier 2 only: Authority-gated fields (v0.2.2+)
	ProcessorPlaybookContext string `json:"processor_playbook_context,omitempty"`
	RiskTrajectory           string `json:"risk_trajectory,omitempty"`
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

	// Enrich with risk score if enabled (v0.2.1+)
	if riskScoreEnabled && riskScorer != nil {
		res := riskScorer.RecordEvent(event)
		exported.ProcessorRiskScore = res.Score
		exported.ProcessorRiskBand = res.Band
		exported.ProcessorRiskDrivers = res.Drivers

		// Tier 1 only: Add upgrade hint (v0.2.3+)
		if exportTier == "tier1" && res.Band != "low" {
			exported.UpgradeHint = "Tier 2 adds processor playbook context and risk trajectory."
		}

		// Tier 2 only: Add authority-gated context (v0.2.2+)
		// Also respects tier2Enabled kill switch
		if exportTier == "tier2" && tier2Enabled {
			// Processor Playbook Context (probabilistic, non-prescriptive)
			context := generatePlaybookContext(res.Band, res.Drivers)
			if context != "" {
				exported.ProcessorPlaybookContext = context
				tier2ContextEmitted.Inc()
			}

			// Risk Trajectory (momentum framing)
			trajectory := generateRiskTrajectory(res)
			if trajectory != "" {
				exported.RiskTrajectory = trajectory
				tier2TrajectoryEmitted.Inc()
			}
		}

		// Update metrics
		riskEventsTotal.WithLabelValues(event.Processor, res.Band).Inc()
		riskScoreLast.WithLabelValues(event.Processor).Set(res.Score)

		// Pilot mode: Create warning record for elevated+ risk bands (v0.2.3+)
		// Respects warningsEnabled kill switch
		if pilotModeEnabled && warningStore != nil && res.Band != "low" {
			if warningsEnabled {
				// Parse event timestamp for latency measurement
				var eventTimestamp time.Time
				if event.EventTimestamp != "" {
					if parsedTime, err := time.Parse(time.RFC3339, event.EventTimestamp); err == nil {
						eventTimestamp = parsedTime
					}
				}

				processedAt := time.Now().UTC()
				warning := &Warning{
					WarningID:       messageID, // Use stream message ID as stable unique ID
					EventID:         event.EventID,
					Processor:       event.Processor,
					MerchantIDHash:  event.MerchantIDHash,
					ProcessedAt:     processedAt,
					EventTimestamp:  eventTimestamp,
					RiskScore:       res.Score,
					RiskBand:        res.Band,
					RiskDrivers:     res.Drivers,
					PlaybookContext: exported.ProcessorPlaybookContext,
					RiskTrajectory:  exported.RiskTrajectory,
				}

				// Observe warning latency if we have a valid event timestamp
				if !eventTimestamp.IsZero() {
					latency := processedAt.Sub(eventTimestamp).Seconds()
					if latency >= 0 { // Sanity check for clock skew
						warningLatency.Observe(latency)
					}
				}

				warningStore.Add(warning)
			} else {
				// Warnings disabled, increment suppression counter
				warningsSuppressed.Inc()
			}
		}
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

// generatePlaybookContext returns Tier 2 processor interpretation context
// Rules: probabilistic language only, no recommendations, no insider claims
func generatePlaybookContext(band string, drivers []string) string {
	if band == "low" {
		return "" // No context needed for low risk
	}

	// Build context based on band and drivers
	var context string

	switch band {
	case "elevated":
		context = "Pattern indicates early-stage deviation from nominal processor behavior."
	case "high":
		context = "Correlates with processor monitoring escalation; rate limiting or velocity checks often triggered."
	case "critical":
		context = "Associated with processor risk policy activation; account-level flags or circuit breakers typically engaged."
	}

	// Add driver-specific context
	for _, driver := range drivers {
		switch driver {
		case "high_failure_rate":
			context += " Elevated failure rates signal degraded transaction quality."
		case "retry_pressure_spike":
			context += " Retry clustering indicates infrastructure stress to processor risk systems."
		case "timeout_clustering":
			context += " Timeout patterns correlate with processor-side latency attribution."
		case "traffic_volatility":
			context += " Traffic spikes monitored for velocity anomalies."
		}
	}

	return context
}

// generateRiskTrajectory returns Tier 2 momentum/trend framing
// Rules: observed pattern + momentum, no predictions, no guarantees
func generateRiskTrajectory(res RiskResult) string {
	if res.TrajectoryDirection == "stable" && res.TrajectoryMultiplier < 1.5 {
		return "" // No trajectory context for stable low patterns
	}

	// Build trajectory description
	windowMinutes := res.TrajectoryWindowSec / 60

	var trajectory string
	switch res.TrajectoryDirection {
	case "accelerating":
		if res.TrajectoryMultiplier >= 5.0 {
			trajectory = fmt.Sprintf("Rapid acceleration observed: ~%.0f× above baseline over the last %d minutes.", res.TrajectoryMultiplier, windowMinutes)
		} else {
			trajectory = fmt.Sprintf("Pattern accelerating: ~%.1f× above baseline over the last %d minutes.", res.TrajectoryMultiplier, windowMinutes)
		}
	case "decelerating":
		trajectory = fmt.Sprintf("Pattern decelerating: failure rate trending down vs baseline over the last %d minutes.", windowMinutes)
	case "stable":
		if res.TrajectoryMultiplier > 1.5 {
			trajectory = fmt.Sprintf("Sustained elevation: ~%.1f× above baseline, stable over the last %d minutes.", res.TrajectoryMultiplier, windowMinutes)
		}
	}

	return trajectory
}

// MerchantContext holds behavioral state for evidence categorization
type MerchantContext struct {
	ID               string
	AnomalyType      string
	RecurrenceCount  int
	BaselineApproval float64
}

func getMerchantContext(id string) *MerchantContext {
	// Minimal stub returning realistic data for the evidence handler
	// In a full implementation, this would look up data from Redis/PG
	return &MerchantContext{
		ID:               id,
		AnomalyType:      "", // healthy by default
		RecurrenceCount:  12,
		BaselineApproval: 0.9421,
	}
}
