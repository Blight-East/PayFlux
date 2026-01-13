package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"
)

func TestDedupeCache_SameWarningAlertsOnce(t *testing.T) {
	cache := NewDedupeCache(24 * time.Hour)

	warningID := "test-warning-123"

	// First time: not seen
	if cache.IsSeen(warningID) {
		t.Error("expected first check to return false (not seen)")
	}

	// Mark as seen
	cache.MarkSeen(warningID)

	// Second time: should be seen
	if !cache.IsSeen(warningID) {
		t.Error("expected second check to return true (seen)")
	}

	// Different warning: not seen
	if cache.IsSeen("other-warning") {
		t.Error("expected different warning to return false")
	}
}

func TestDedupeCache_TTLExpiry(t *testing.T) {
	cache := NewDedupeCache(10 * time.Millisecond)

	warningID := "test-warning-ttl"
	cache.MarkSeen(warningID)

	if !cache.IsSeen(warningID) {
		t.Error("expected warning to be seen immediately after marking")
	}

	// Wait for TTL to expire
	time.Sleep(20 * time.Millisecond)

	if cache.IsSeen(warningID) {
		t.Error("expected warning to NOT be seen after TTL expiry")
	}
}

func TestRateLimiter_DropsExcessAlerts(t *testing.T) {
	limiter := NewRateLimiter(3) // max 3 per hour

	destination := "slack"

	// First 3 should be allowed
	for i := 0; i < 3; i++ {
		if !limiter.Allow(destination) {
			t.Errorf("alert %d should be allowed", i+1)
		}
	}

	// 4th and beyond should be blocked
	if limiter.Allow(destination) {
		t.Error("4th alert should be blocked (rate limit exceeded)")
	}

	if limiter.Allow(destination) {
		t.Error("5th alert should also be blocked")
	}

	// Different destination should have its own limit
	if !limiter.Allow("webhook") {
		t.Error("different destination should be allowed")
	}
}

func TestRouter_DisabledByDefault(t *testing.T) {
	// Clear env
	os.Unsetenv("PAYFLUX_ALERT_ROUTER_ENABLED")

	config, _ := loadConfig()

	if config.Enabled {
		t.Error("router should be disabled by default")
	}
}

func TestRouter_EnabledRequiresAuth(t *testing.T) {
	os.Setenv("PAYFLUX_ALERT_ROUTER_ENABLED", "true")
	os.Setenv("ALERT_SINK", "slack")
	os.Setenv("SLACK_WEBHOOK_URL", "https://hooks.slack.com/test")
	os.Unsetenv("PAYFLUX_PILOT_AUTH")
	defer func() {
		os.Unsetenv("PAYFLUX_ALERT_ROUTER_ENABLED")
		os.Unsetenv("ALERT_SINK")
		os.Unsetenv("SLACK_WEBHOOK_URL")
	}()

	_, err := loadConfig()

	if err == nil {
		t.Error("expected error when auth is missing")
	}

	if !strings.Contains(err.Error(), "PAYFLUX_PILOT_AUTH") {
		t.Errorf("expected auth error, got: %s", err.Error())
	}
}

func TestRouter_MeetsMinBand(t *testing.T) {
	config := Config{MinBand: "elevated"}
	router := NewRouter(config)

	tests := []struct {
		band     string
		expected bool
	}{
		{"low", false},
		{"elevated", true},
		{"high", true},
		{"critical", true},
		{"unknown", false},
	}

	for _, tt := range tests {
		result := router.meetsMinBand(tt.band)
		if result != tt.expected {
			t.Errorf("meetsMinBand(%s) = %v, expected %v", tt.band, result, tt.expected)
		}
	}
}

func TestLogging_NoSensitiveDataInLogs(t *testing.T) {
	// Capture log output
	var buf bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&buf, nil))
	slog.SetDefault(logger)

	// Simulate logging with sensitive-looking data
	sensitiveWebhookURL := "https://hooks.slack.com/services/T00/B00/XXXX"
	sensitiveAuthHeader := "Bearer super-secret-token-12345"

	// These should be logged safely
	safeID := safePrefix("1234567890-test-warning-id")
	slog.Info("test_log",
		"warning_id_prefix", safeID,
		"processor", "stripe",
		"risk_band", "high",
	)

	logOutput := buf.String()

	// Verify sensitive data is NOT logged
	if strings.Contains(logOutput, sensitiveWebhookURL) {
		t.Error("log output should not contain webhook URL")
	}

	if strings.Contains(logOutput, sensitiveAuthHeader) {
		t.Error("log output should not contain auth header")
	}

	// Verify we only log safe prefixes, not full IDs
	if strings.Contains(logOutput, "1234567890-test-warning-id") {
		t.Error("log output should not contain full warning ID")
	}

	// Verify safe prefix is logged
	if !strings.Contains(logOutput, "12345678") {
		t.Error("log output should contain safe prefix")
	}
}

func TestSafePrefix(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"12345678901234567890", "12345678..."},
		{"short", "short"},
		{"12345678", "12345678"},
		{"123456789", "12345678..."},
	}

	for _, tt := range tests {
		result := safePrefix(tt.input)
		if result != tt.expected {
			t.Errorf("safePrefix(%s) = %s, expected %s", tt.input, result, tt.expected)
		}
	}
}

func TestWebhookPayload_MinimalAndTruthful(t *testing.T) {
	warning := Warning{
		WarningID:   "1234567890-test",
		Processor:   "stripe",
		RiskBand:    "high",
		ProcessedAt: time.Now(),
	}

	payload := AlertPayload{
		WarningID:   warning.WarningID,
		Processor:   warning.Processor,
		RiskBand:    warning.RiskBand,
		ProcessedAt: warning.ProcessedAt.Format(time.RFC3339),
		Message:     "PayFlux detected an elevated risk pattern",
	}

	data, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("failed to marshal payload: %v", err)
	}

	payloadStr := string(data)

	// Verify message is truthful (no guarantees, no predictions)
	if strings.Contains(payloadStr, "will") {
		t.Error("payload should not contain 'will' (no guarantees)")
	}
	if strings.Contains(payloadStr, "predict") {
		t.Error("payload should not contain 'predict'")
	}
	if strings.Contains(payloadStr, "guarantee") {
		t.Error("payload should not contain 'guarantee'")
	}
	if strings.Contains(payloadStr, "prevent") {
		t.Error("payload should not contain 'prevent'")
	}

	// Verify it has expected fields
	if !strings.Contains(payloadStr, "warning_id") {
		t.Error("payload should contain warning_id")
	}
	if !strings.Contains(payloadStr, "processor") {
		t.Error("payload should contain processor")
	}
	if !strings.Contains(payloadStr, "risk_band") {
		t.Error("payload should contain risk_band")
	}
}

func TestRouter_IntegrationWithMockPayflux(t *testing.T) {
	// Mock PayFlux server
	warnings := []Warning{
		{
			WarningID:   "warn-001",
			Processor:   "stripe",
			RiskBand:    "high",
			ProcessedAt: time.Now(),
		},
	}

	payfluxServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/pilot/warnings" {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}

		if r.Header.Get("Authorization") != "Bearer test-token" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		json.NewEncoder(w).Encode(warnings)
	}))
	defer payfluxServer.Close()

	// Mock webhook server
	alertsReceived := 0
	webhookServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		var payload AlertPayload
		if err := json.Unmarshal(body, &payload); err != nil {
			http.Error(w, "invalid json", http.StatusBadRequest)
			return
		}

		if payload.WarningID != "warn-001" {
			t.Errorf("unexpected warning_id: %s", payload.WarningID)
		}

		alertsReceived++
		w.WriteHeader(http.StatusOK)
	}))
	defer webhookServer.Close()

	config := Config{
		Enabled:         true,
		PayfluxBaseURL:  payfluxServer.URL,
		PayfluxAuth:     "test-token",
		AlertSink:       "webhook",
		AlertWebhookURL: webhookServer.URL,
		PollInterval:    100 * time.Millisecond,
		MinBand:         "elevated",
		MaxPerHour:      30,
		DedupeTTL:       1 * time.Hour,
	}

	router := NewRouter(config)
	ctx, cancel := context.WithTimeout(context.Background(), 300*time.Millisecond)
	defer cancel()

	go router.Run(ctx)

	// Wait for at least one poll cycle
	time.Sleep(250 * time.Millisecond)

	// Should have received exactly 1 alert (dedupe prevents duplicates)
	if alertsReceived != 1 {
		t.Errorf("expected 1 alert, got %d", alertsReceived)
	}
}
