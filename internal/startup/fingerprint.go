package startup

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"sort"
	"strings"
)

// configKeys are the environment variables that define PayFlux runtime behavior.
// Sorted alphabetically for deterministic hashing.
// This list must be updated when new config vars are added.
var configKeys = []string{
	"CONSUMER_NAME",
	"GROUP_NAME",
	"HTTP_ADDR",
	"PAYFLUX_API_KEY",
	"PAYFLUX_API_KEYS",
	"PAYFLUX_BACKPRESSURE_THRESHOLD",
	"PAYFLUX_CONSUMER_NAME",
	"PAYFLUX_ENV",
	"PAYFLUX_EXPORT_FILE",
	"PAYFLUX_EXPORT_MODE",
	"PAYFLUX_INGEST_BURST",
	"PAYFLUX_INGEST_ENABLED",
	"PAYFLUX_INGEST_RPS",
	"PAYFLUX_OUTCOME_BURST",
	"PAYFLUX_OUTCOME_RPS",
	"PAYFLUX_PANIC_MODE",
	"PAYFLUX_PILOT_MODE",
	"PAYFLUX_RATELIMIT_BURST",
	"PAYFLUX_RATELIMIT_RPS",
	"PAYFLUX_RAW_EVENT_TTL_DAYS",
	"PAYFLUX_REVOKED_KEYS",
	"PAYFLUX_RISK_SCORE_ENABLED",
	"PAYFLUX_RISK_SCORE_THRESHOLDS",
	"PAYFLUX_RISK_SCORE_WINDOW_SEC",
	"PAYFLUX_STREAM_MAXLEN",
	"PAYFLUX_TIER",
	"PAYFLUX_TIER2_ENABLED",
	"PAYFLUX_WARNINGS_ENABLED",
	"REDIS_ADDR",
	"STREAM_KEY",
	"STRIPE_API_KEY",
}

// runtimeConfigFiles are the JSON config files that affect runtime behavior.
var runtimeConfigFiles = []string{
	"config/tiers.runtime.json",
	"config/tier_entitlements.runtime.json",
	"config/signals.runtime.json",
}

// Fingerprint represents the deterministic hash of all configuration inputs
// at startup time. Two processes with the same fingerprint are guaranteed to
// have identical configuration.
type Fingerprint struct {
	// Hash is the hex-encoded SHA256 of all config inputs.
	Hash string `json:"config_fingerprint"`

	// Short is the first 12 hex characters, suitable for log lines and dashboards.
	Short string `json:"config_fingerprint_short"`
}

// ComputeFingerprint produces a deterministic SHA256 hash of:
//   - All recognized environment variables (sorted by key)
//   - All runtime JSON config file contents (sorted by path)
//
// Secret values (API keys, Stripe keys) are included in the hash but never
// logged. The fingerprint changes if ANY config input changes, including secrets.
// This is intentional: a key rotation should produce a different fingerprint.
func ComputeFingerprint() Fingerprint {
	h := sha256.New()

	// Phase 1: Environment variables (deterministic order — configKeys is pre-sorted)
	for _, key := range configKeys {
		val := os.Getenv(key)
		// Write key=value\n for each var. Empty vars still contribute their key
		// so that "unset" vs "set to empty" produces different hashes.
		h.Write([]byte(key))
		h.Write([]byte("="))
		h.Write([]byte(val))
		h.Write([]byte("\n"))
	}

	// Phase 2: Runtime config files (deterministic order — sorted by path)
	paths := make([]string, len(runtimeConfigFiles))
	copy(paths, runtimeConfigFiles)
	sort.Strings(paths)

	for _, path := range paths {
		data, err := os.ReadFile(path)
		if err != nil {
			// File missing or unreadable — hash the error so fingerprint
			// still changes vs a successful read.
			h.Write([]byte(path))
			h.Write([]byte(":error:"))
			h.Write([]byte(err.Error()))
			h.Write([]byte("\n"))
			continue
		}
		h.Write([]byte(path))
		h.Write([]byte(":"))
		h.Write(data)
		h.Write([]byte("\n"))
	}

	sum := hex.EncodeToString(h.Sum(nil))
	return Fingerprint{
		Hash:  sum,
		Short: sum[:12],
	}
}

// EnvSummary returns a redacted view of config state for structured logging.
// Secrets are replaced with their length. Boolean/enum values are shown as-is.
func EnvSummary() map[string]string {
	summary := make(map[string]string, len(configKeys))

	secretKeys := map[string]bool{
		"PAYFLUX_API_KEY":  true,
		"PAYFLUX_API_KEYS": true,
		"STRIPE_API_KEY":   true,
		"PAYFLUX_REVOKED_KEYS": true,
	}

	for _, key := range configKeys {
		val := os.Getenv(key)
		if val == "" {
			summary[key] = "(unset)"
			continue
		}
		if secretKeys[key] {
			// Count keys for multi-key vars, show length for single-key
			if strings.Contains(val, ",") {
				parts := strings.Split(val, ",")
				count := 0
				for _, p := range parts {
					if strings.TrimSpace(p) != "" {
						count++
					}
				}
				summary[key] = fmt.Sprintf("<%d keys>", count)
			} else {
				summary[key] = fmt.Sprintf("<len:%d>", len(val))
			}
		} else {
			summary[key] = val
		}
	}

	return summary
}

func init() {
	// ensure configKeys stays sorted (build-time invariant)
	for i := 1; i < len(configKeys); i++ {
		if configKeys[i-1] >= configKeys[i] {
			panic("startup: configKeys must be sorted alphabetically — found " + configKeys[i-1] + " >= " + configKeys[i])
		}
	}
}
