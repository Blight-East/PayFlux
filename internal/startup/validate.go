// Package startup provides pre-flight configuration validation.
//
// ValidateConfig runs before any goroutine launches, Redis connection opens,
// or HTTP listener binds. If validation fails, the process exits immediately
// with a structured error — no partial startup, no silent misconfiguration.
package startup

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
)

// ConfigError collects every validation failure so operators see ALL problems
// in a single log line, not one-at-a-time through restart cycles.
type ConfigError struct {
	Failures []string
}

func (e *ConfigError) Error() string {
	return fmt.Sprintf("config validation failed (%d errors):\n  - %s",
		len(e.Failures), strings.Join(e.Failures, "\n  - "))
}

func (e *ConfigError) add(msg string) {
	e.Failures = append(e.Failures, msg)
}

func (e *ConfigError) addf(format string, args ...any) {
	e.Failures = append(e.Failures, fmt.Sprintf(format, args...))
}

// ValidateConfig checks every configuration input for structural correctness.
// Returns nil if all config is valid, or a *ConfigError listing every failure.
//
// This function reads environment variables and config files but does NOT
// connect to any external service. It validates structure, not reachability.
func ValidateConfig() error {
	ce := &ConfigError{}

	validateAuth(ce)
	validateRedis(ce)
	validateExport(ce)
	validateRiskScoring(ce)
	validateTier(ce)
	validateEnv(ce)
	validatePanicMode(ce)
	validateRateLimits(ce)
	validateStreamConfig(ce)
	validateStripe(ce)
	validateRuntimeConfigs(ce)

	if len(ce.Failures) > 0 {
		return ce
	}
	return nil
}

// --- Individual validators ---

func validateAuth(ce *ConfigError) {
	keys := os.Getenv("PAYFLUX_API_KEYS")
	key := os.Getenv("PAYFLUX_API_KEY")
	if keys == "" && key == "" {
		ce.add("PAYFLUX_API_KEY or PAYFLUX_API_KEYS must be set")
		return
	}

	// Check for empty keys in comma-separated list
	if keys != "" {
		count := 0
		for _, k := range strings.Split(keys, ",") {
			k = strings.TrimSpace(k)
			if k != "" {
				count++
			}
		}
		if count == 0 {
			ce.add("PAYFLUX_API_KEYS is set but contains no valid keys")
		}
	}
}

func validateRedis(ce *ConfigError) {
	addr := envOr("REDIS_ADDR", "localhost:6379")
	if !strings.Contains(addr, ":") {
		ce.addf("REDIS_ADDR=%q missing port (expected host:port)", addr)
	}
}

func validateExport(ce *ConfigError) {
	mode := envOr("PAYFLUX_EXPORT_MODE", "stdout")
	validModes := map[string]bool{"stdout": true, "file": true, "both": true}
	if !validModes[mode] {
		ce.addf("PAYFLUX_EXPORT_MODE=%q invalid (must be stdout, file, or both)", mode)
		return
	}

	if mode == "file" || mode == "both" {
		path := os.Getenv("PAYFLUX_EXPORT_FILE")
		if path == "" {
			ce.addf("PAYFLUX_EXPORT_FILE must be set when PAYFLUX_EXPORT_MODE=%s", mode)
		} else {
			// Validate the directory exists (don't create the file yet)
			dir := path
			if idx := strings.LastIndex(path, "/"); idx >= 0 {
				dir = path[:idx]
			}
			if dir != path { // path contains a directory component
				if info, err := os.Stat(dir); err != nil {
					ce.addf("PAYFLUX_EXPORT_FILE directory %q does not exist: %v", dir, err)
				} else if !info.IsDir() {
					ce.addf("PAYFLUX_EXPORT_FILE directory %q is not a directory", dir)
				}
			}
		}
	}
}

func validateRiskScoring(ce *ConfigError) {
	thresholds := envOr("PAYFLUX_RISK_SCORE_THRESHOLDS", "0.3,0.6,0.8")
	parts := strings.Split(thresholds, ",")
	if len(parts) != 3 {
		ce.addf("PAYFLUX_RISK_SCORE_THRESHOLDS=%q must have exactly 3 comma-separated values", thresholds)
		return
	}

	var vals [3]float64
	for i, p := range parts {
		f, err := strconv.ParseFloat(strings.TrimSpace(p), 64)
		if err != nil {
			ce.addf("PAYFLUX_RISK_SCORE_THRESHOLDS[%d]=%q is not a valid float", i, p)
			return
		}
		if f < 0 || f > 1 {
			ce.addf("PAYFLUX_RISK_SCORE_THRESHOLDS[%d]=%.2f must be in range [0.0, 1.0]", i, f)
			return
		}
		vals[i] = f
	}

	// Thresholds must be strictly ascending
	if vals[0] >= vals[1] || vals[1] >= vals[2] {
		ce.addf("PAYFLUX_RISK_SCORE_THRESHOLDS must be strictly ascending, got %.2f,%.2f,%.2f",
			vals[0], vals[1], vals[2])
	}

	window := envOr("PAYFLUX_RISK_SCORE_WINDOW_SEC", "300")
	if w, err := strconv.Atoi(window); err != nil {
		ce.addf("PAYFLUX_RISK_SCORE_WINDOW_SEC=%q is not a valid integer", window)
	} else if w < 10 {
		ce.addf("PAYFLUX_RISK_SCORE_WINDOW_SEC=%d must be >= 10", w)
	}
}

func validateTier(ce *ConfigError) {
	tier := envOr("PAYFLUX_TIER", "tier1")
	if tier != "tier1" && tier != "tier2" {
		ce.addf("PAYFLUX_TIER=%q must be 'tier1' or 'tier2'", tier)
	}
}

func validateEnv(ce *ConfigError) {
	env := envOr("PAYFLUX_ENV", "dev")
	if env != "dev" && env != "prod" {
		ce.addf("PAYFLUX_ENV=%q must be 'dev' or 'prod'", env)
	}
}

func validatePanicMode(ce *ConfigError) {
	mode := envOr("PAYFLUX_PANIC_MODE", "crash")
	if mode != "crash" && mode != "recover" {
		ce.addf("PAYFLUX_PANIC_MODE=%q must be 'crash' or 'recover'", mode)
	}
}

func validateRateLimits(ce *ConfigError) {
	checkPositiveInt(ce, "PAYFLUX_RATELIMIT_RPS", 100)
	checkPositiveInt(ce, "PAYFLUX_RATELIMIT_BURST", 500)
	checkPositiveInt(ce, "PAYFLUX_INGEST_RPS", 100)
	checkPositiveInt(ce, "PAYFLUX_INGEST_BURST", 500)
	checkPositiveInt(ce, "PAYFLUX_OUTCOME_RPS", 10)
	checkPositiveInt(ce, "PAYFLUX_OUTCOME_BURST", 20)
	checkNonNegativeInt(ce, "PAYFLUX_BACKPRESSURE_THRESHOLD", 10000)
}

func validateStreamConfig(ce *ConfigError) {
	checkNonNegativeInt(ce, "PAYFLUX_STREAM_MAXLEN", 200000)
	checkNonNegativeInt(ce, "PAYFLUX_RAW_EVENT_TTL_DAYS", 7)
}

func validateStripe(ce *ConfigError) {
	key := os.Getenv("STRIPE_API_KEY")
	if key == "" {
		ce.add("STRIPE_API_KEY must be set")
		return
	}
	if !strings.HasPrefix(key, "sk_") {
		ce.addf("STRIPE_API_KEY must start with 'sk_' (got prefix: %q)", safePrefix(key, 3))
	}
}

func validateRuntimeConfigs(ce *ConfigError) {
	validateJSONFile(ce, "config/tiers.runtime.json", func(data []byte) error {
		var parsed struct {
			Tiers map[string][]string `json:"tiers"`
		}
		if err := json.Unmarshal(data, &parsed); err != nil {
			return fmt.Errorf("invalid JSON structure: %w", err)
		}
		if len(parsed.Tiers) == 0 {
			return fmt.Errorf("no tiers defined")
		}
		return nil
	})

	validateJSONFile(ce, "config/tier_entitlements.runtime.json", func(data []byte) error {
		var parsed struct {
			Entitlements map[string]json.RawMessage `json:"entitlements"`
		}
		if err := json.Unmarshal(data, &parsed); err != nil {
			return fmt.Errorf("invalid JSON structure: %w", err)
		}
		if len(parsed.Entitlements) == 0 {
			return fmt.Errorf("no entitlements defined")
		}
		return nil
	})

	validateJSONFile(ce, "config/signals.runtime.json", func(data []byte) error {
		var parsed struct {
			Signals map[string]json.RawMessage `json:"signals"`
		}
		if err := json.Unmarshal(data, &parsed); err != nil {
			return fmt.Errorf("invalid JSON structure: %w", err)
		}
		if len(parsed.Signals) == 0 {
			return fmt.Errorf("no signals defined")
		}
		return nil
	})
}

// --- Helpers ---

func envOr(key, fallback string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	return v
}

func checkPositiveInt(ce *ConfigError, key string, fallback int) {
	raw := os.Getenv(key)
	if raw == "" {
		return // will use fallback, which is valid
	}
	v, err := strconv.Atoi(raw)
	if err != nil {
		ce.addf("%s=%q is not a valid integer", key, raw)
		return
	}
	if v <= 0 {
		ce.addf("%s=%d must be positive", key, v)
	}
}

func checkNonNegativeInt(ce *ConfigError, key string, fallback int) {
	raw := os.Getenv(key)
	if raw == "" {
		return
	}
	v, err := strconv.Atoi(raw)
	if err != nil {
		ce.addf("%s=%q is not a valid integer", key, raw)
		return
	}
	if v < 0 {
		ce.addf("%s=%d must be non-negative", key, v)
	}
}

func validateJSONFile(ce *ConfigError, path string, validate func([]byte) error) {
	data, err := os.ReadFile(path)
	if err != nil {
		ce.addf("%s: cannot read file: %v", path, err)
		return
	}
	if !json.Valid(data) {
		ce.addf("%s: invalid JSON syntax", path)
		return
	}
	if validate != nil {
		if err := validate(data); err != nil {
			ce.addf("%s: %v", path, err)
		}
	}
}

// safePrefix returns the first n characters of s, or all of s if shorter.
// Used to log prefixes of sensitive values without exposing the full value.
func safePrefix(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
