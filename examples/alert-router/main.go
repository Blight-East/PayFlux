package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"
)

// Config holds router configuration
type Config struct {
	Enabled         bool
	PayfluxBaseURL  string
	PayfluxAuth     string
	AlertSink       string // "slack" or "webhook"
	SlackWebhookURL string
	AlertWebhookURL string
	PollInterval    time.Duration
	MinBand         string
	MaxPerHour      int
	DedupeTTL       time.Duration
	DashboardURL    string
}

// Warning represents a PayFlux pilot warning
type Warning struct {
	WarningID      string    `json:"warning_id"`
	EventID        string    `json:"event_id"`
	Processor      string    `json:"processor"`
	MerchantIDHash string    `json:"merchant_id_hash"`
	ProcessedAt    time.Time `json:"processed_at"`
	RiskScore      float64   `json:"processor_risk_score"`
	RiskBand       string    `json:"processor_risk_band"`
	RiskDrivers    []string  `json:"processor_risk_drivers"`
}

// AlertPayload is the minimal payload sent to sinks
type AlertPayload struct {
	WarningID    string `json:"warning_id"`
	Processor    string `json:"processor"`
	RiskBand     string `json:"risk_band"`
	ProcessedAt  string `json:"processed_at"`
	Message      string `json:"message"`
	DashboardURL string `json:"dashboard_url,omitempty"`
}

// SlackPayload is the Slack-specific message format
type SlackPayload struct {
	Text        string       `json:"text"`
	Attachments []Attachment `json:"attachments,omitempty"`
}

type Attachment struct {
	Color  string  `json:"color"`
	Fields []Field `json:"fields"`
}

type Field struct {
	Title string `json:"title"`
	Value string `json:"value"`
	Short bool   `json:"short"`
}

// DedupeCache tracks seen warning IDs
type DedupeCache struct {
	mu      sync.RWMutex
	seen    map[string]time.Time
	ttl     time.Duration
	cleaned time.Time
}

func NewDedupeCache(ttl time.Duration) *DedupeCache {
	return &DedupeCache{
		seen:    make(map[string]time.Time),
		ttl:     ttl,
		cleaned: time.Now(),
	}
}

func (d *DedupeCache) IsSeen(warningID string) bool {
	d.mu.RLock()
	seenAt, exists := d.seen[warningID]
	d.mu.RUnlock()

	if !exists {
		return false
	}
	return time.Since(seenAt) < d.ttl
}

func (d *DedupeCache) MarkSeen(warningID string) {
	d.mu.Lock()
	defer d.mu.Unlock()

	d.seen[warningID] = time.Now()

	// Periodic cleanup every hour
	if time.Since(d.cleaned) > time.Hour {
		cutoff := time.Now().Add(-d.ttl)
		for id, seenAt := range d.seen {
			if seenAt.Before(cutoff) {
				delete(d.seen, id)
			}
		}
		d.cleaned = time.Now()
	}
}

// RateLimiter tracks alerts per destination per hour
type RateLimiter struct {
	mu         sync.Mutex
	counts     map[string]int
	window     time.Time
	maxPerHour int
}

func NewRateLimiter(maxPerHour int) *RateLimiter {
	return &RateLimiter{
		counts:     make(map[string]int),
		window:     time.Now().Truncate(time.Hour),
		maxPerHour: maxPerHour,
	}
}

func (r *RateLimiter) Allow(destination string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	currentWindow := now.Truncate(time.Hour)

	// Reset if new hour
	if currentWindow.After(r.window) {
		r.counts = make(map[string]int)
		r.window = currentWindow
	}

	if r.counts[destination] >= r.maxPerHour {
		return false
	}

	r.counts[destination]++
	return true
}

func (r *RateLimiter) CurrentCount(destination string) int {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.counts[destination]
}

// Router is the main alert router service
type Router struct {
	config      Config
	dedupeCache *DedupeCache
	rateLimiter *RateLimiter
	httpClient  *http.Client
	lastSeen    map[string]string // processor -> last seen band for escalation tracking
	mu          sync.Mutex
}

func NewRouter(config Config) *Router {
	return &Router{
		config:      config,
		dedupeCache: NewDedupeCache(config.DedupeTTL),
		rateLimiter: NewRateLimiter(config.MaxPerHour),
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
		lastSeen: make(map[string]string),
	}
}

func (r *Router) Run(ctx context.Context) error {
	if !r.config.Enabled {
		slog.Info("alert_router_disabled", "msg", "Router not enabled. Set PAYFLUX_ALERT_ROUTER_ENABLED=true to enable.")
		// Block until context cancelled
		<-ctx.Done()
		return nil
	}

	slog.Info("alert_router_started",
		"poll_interval", r.config.PollInterval.String(),
		"min_band", r.config.MinBand,
		"max_per_hour", r.config.MaxPerHour,
		"sink", r.config.AlertSink,
	)

	ticker := time.NewTicker(r.config.PollInterval)
	defer ticker.Stop()

	// Initial poll
	r.pollAndAlert(ctx)

	for {
		select {
		case <-ctx.Done():
			slog.Info("alert_router_shutdown")
			return nil
		case <-ticker.C:
			r.pollAndAlert(ctx)
		}
	}
}

func (r *Router) pollAndAlert(ctx context.Context) {
	warnings, err := r.fetchWarnings(ctx)
	if err != nil {
		slog.Error("fetch_warnings_failed", "error", err.Error())
		return
	}

	slog.Debug("warnings_fetched", "count", len(warnings))

	for _, w := range warnings {
		// Skip if below minimum band
		if !r.meetsMinBand(w.RiskBand) {
			continue
		}

		// Skip if already seen (dedupe)
		if r.dedupeCache.IsSeen(w.WarningID) {
			continue
		}

		// Check rate limit
		if !r.rateLimiter.Allow(r.config.AlertSink) {
			slog.Warn("rate_limit_exceeded",
				"sink", r.config.AlertSink,
				"count", r.rateLimiter.CurrentCount(r.config.AlertSink),
				"max", r.config.MaxPerHour,
			)
			continue
		}

		// Send alert
		if err := r.sendAlert(ctx, w); err != nil {
			slog.Error("alert_send_failed",
				"warning_id_prefix", safePrefix(w.WarningID),
				"processor", w.Processor,
				"error", err.Error(),
			)
			continue
		}

		// Mark as seen after successful send
		r.dedupeCache.MarkSeen(w.WarningID)

		slog.Info("alert_sent",
			"warning_id_prefix", safePrefix(w.WarningID),
			"processor", w.Processor,
			"risk_band", w.RiskBand,
		)
	}
}

func (r *Router) fetchWarnings(ctx context.Context) ([]Warning, error) {
	url := fmt.Sprintf("%s/pilot/warnings", r.config.PayfluxBaseURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+r.config.PayfluxAuth)
	req.Header.Set("Accept", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}

	// Limit body read to prevent memory issues
	body, err := io.ReadAll(io.LimitReader(resp.Body, 10*1024*1024)) // 10MB max
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	var warnings []Warning
	if err := json.Unmarshal(body, &warnings); err != nil {
		return nil, fmt.Errorf("unmarshal: %w", err)
	}

	return warnings, nil
}

func (r *Router) sendAlert(ctx context.Context, w Warning) error {
	payload := AlertPayload{
		WarningID:    w.WarningID,
		Processor:    w.Processor,
		RiskBand:     w.RiskBand,
		ProcessedAt:  w.ProcessedAt.Format(time.RFC3339),
		Message:      "PayFlux detected an elevated risk pattern",
		DashboardURL: r.config.DashboardURL,
	}

	switch r.config.AlertSink {
	case "slack":
		return r.sendSlackAlert(ctx, payload)
	case "webhook":
		return r.sendWebhookAlert(ctx, payload)
	default:
		return fmt.Errorf("unknown sink: %s", r.config.AlertSink)
	}
}

func (r *Router) sendSlackAlert(ctx context.Context, payload AlertPayload) error {
	color := "#FFA500" // orange for elevated
	switch payload.RiskBand {
	case "high":
		color = "#FF6B6B" // red
	case "critical":
		color = "#DC3545" // dark red
	}

	slackPayload := SlackPayload{
		Text: fmt.Sprintf("⚠️ PayFlux Warning: %s risk pattern detected", payload.RiskBand),
		Attachments: []Attachment{
			{
				Color: color,
				Fields: []Field{
					{Title: "Processor", Value: payload.Processor, Short: true},
					{Title: "Risk Band", Value: payload.RiskBand, Short: true},
					{Title: "Processed At", Value: payload.ProcessedAt, Short: false},
				},
			},
		},
	}

	if payload.DashboardURL != "" {
		slackPayload.Attachments[0].Fields = append(slackPayload.Attachments[0].Fields,
			Field{Title: "Dashboard", Value: payload.DashboardURL, Short: false})
	}

	return r.sendWithRetry(ctx, r.config.SlackWebhookURL, slackPayload)
}

func (r *Router) sendWebhookAlert(ctx context.Context, payload AlertPayload) error {
	return r.sendWithRetry(ctx, r.config.AlertWebhookURL, payload)
}

func (r *Router) sendWithRetry(ctx context.Context, url string, payload any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}

	var lastErr error
	for attempt := 1; attempt <= 3; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
		if err != nil {
			return fmt.Errorf("create request: %w", err)
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := r.httpClient.Do(req)
		if err != nil {
			lastErr = err
			slog.Debug("send_retry", "attempt", attempt, "error", err.Error())
			time.Sleep(time.Duration(attempt) * time.Second) // backoff: 1s, 2s, 3s
			continue
		}
		resp.Body.Close()

		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			return nil
		}

		lastErr = fmt.Errorf("status %d", resp.StatusCode)
		if resp.StatusCode >= 400 && resp.StatusCode < 500 {
			// Don't retry client errors
			return lastErr
		}

		slog.Debug("send_retry", "attempt", attempt, "status", resp.StatusCode)
		time.Sleep(time.Duration(attempt) * time.Second)
	}

	return fmt.Errorf("all retries failed: %w", lastErr)
}

func (r *Router) meetsMinBand(band string) bool {
	bandOrder := map[string]int{
		"low":      0,
		"elevated": 1,
		"high":     2,
		"critical": 3,
	}

	minLevel, ok := bandOrder[r.config.MinBand]
	if !ok {
		minLevel = 1 // default to elevated
	}

	actualLevel, ok := bandOrder[band]
	if !ok {
		return false
	}

	return actualLevel >= minLevel
}

// safePrefix returns first 8 chars of ID for logging (avoids full ID exposure)
func safePrefix(id string) string {
	if len(id) <= 8 {
		return id
	}
	return id[:8] + "..."
}

func loadConfig() (Config, error) {
	config := Config{
		Enabled:         os.Getenv("PAYFLUX_ALERT_ROUTER_ENABLED") == "true",
		PayfluxBaseURL:  envOr("PAYFLUX_BASE_URL", "http://payflux:8080"),
		PayfluxAuth:     os.Getenv("PAYFLUX_PILOT_AUTH"),
		AlertSink:       envOr("ALERT_SINK", "slack"),
		SlackWebhookURL: os.Getenv("SLACK_WEBHOOK_URL"),
		AlertWebhookURL: os.Getenv("ALERT_WEBHOOK_URL"),
		PollInterval:    time.Duration(envIntOr("POLL_INTERVAL_SECONDS", 15)) * time.Second,
		MinBand:         envOr("ALERT_MIN_BAND", "elevated"),
		MaxPerHour:      envIntOr("ALERT_MAX_PER_HOUR", 30),
		DedupeTTL:       time.Duration(envIntOr("DEDUPE_TTL_SECONDS", 86400)) * time.Second,
		DashboardURL:    os.Getenv("PAYFLUX_DASHBOARD_URL"),
	}

	// Validation only when enabled
	if config.Enabled {
		if config.PayfluxAuth == "" {
			return config, fmt.Errorf("PAYFLUX_PILOT_AUTH is required when router is enabled")
		}

		switch config.AlertSink {
		case "slack":
			if config.SlackWebhookURL == "" {
				return config, fmt.Errorf("SLACK_WEBHOOK_URL is required when ALERT_SINK=slack")
			}
		case "webhook":
			if config.AlertWebhookURL == "" {
				return config, fmt.Errorf("ALERT_WEBHOOK_URL is required when ALERT_SINK=webhook")
			}
		default:
			return config, fmt.Errorf("ALERT_SINK must be 'slack' or 'webhook', got: %s", config.AlertSink)
		}
	}

	return config, nil
}

func envOr(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func envIntOr(key string, defaultVal int) int {
	if v := os.Getenv(key); v != "" {
		var i int
		if _, err := fmt.Sscanf(v, "%d", &i); err == nil {
			return i
		}
	}
	return defaultVal
}

func main() {
	// Initialize structured logging
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	config, err := loadConfig()
	if err != nil {
		slog.Error("config_error", "error", err.Error())
		os.Exit(1)
	}

	router := NewRouter(config)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-quit
		slog.Info("shutdown_signal_received")
		cancel()
	}()

	if err := router.Run(ctx); err != nil {
		slog.Error("router_error", "error", err.Error())
		os.Exit(1)
	}
}

// Export for testing
var (
	_ = NewDedupeCache
	_ = NewRateLimiter
	_ = NewRouter
)
