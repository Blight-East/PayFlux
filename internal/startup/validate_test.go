package startup

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// repoRoot changes the working directory to the repository root so that
// config file paths (config/*.runtime.json) resolve correctly in tests.
func repoRoot(t *testing.T) {
	t.Helper()
	_, filename, _, _ := runtime.Caller(0)
	// internal/startup/validate_test.go → repo root is ../../
	root := filepath.Join(filepath.Dir(filename), "..", "..")
	orig, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get working directory: %v", err)
	}
	if err := os.Chdir(root); err != nil {
		t.Fatalf("failed to chdir to repo root %s: %v", root, err)
	}
	t.Cleanup(func() { os.Chdir(orig) })
}

// withEnv sets env vars for the duration of a test, restoring originals after.
func withEnv(t *testing.T, vars map[string]string) {
	t.Helper()
	originals := make(map[string]string, len(vars))
	for k := range vars {
		originals[k] = os.Getenv(k)
	}
	t.Cleanup(func() {
		for k, v := range originals {
			if v == "" {
				os.Unsetenv(k)
			} else {
				os.Setenv(k, v)
			}
		}
	})
	for k, v := range vars {
		if v == "" {
			os.Unsetenv(k)
		} else {
			os.Setenv(k, v)
		}
	}
}

// validEnv returns a minimal set of env vars that pass all validation.
func validEnv() map[string]string {
	return map[string]string{
		"PAYFLUX_API_KEY":  "test-key-minimum-16-chars",
		"REDIS_ADDR":       "localhost:6379",
		"STRIPE_API_KEY":   "sk_test_abc123",
		"PAYFLUX_ENV":      "dev",
		"PAYFLUX_TIER":     "tier1",
		"PAYFLUX_PANIC_MODE": "crash",
		"PAYFLUX_EXPORT_MODE": "stdout",
	}
}

func TestValidateConfig_ValidMinimal(t *testing.T) {
	repoRoot(t)
	withEnv(t, validEnv())

	err := ValidateConfig()
	if err != nil {
		t.Fatalf("expected no error with valid config, got: %v", err)
	}
}

func TestValidateConfig_MissingAPIKey(t *testing.T) {
	env := validEnv()
	env["PAYFLUX_API_KEY"] = ""
	env["PAYFLUX_API_KEYS"] = ""
	withEnv(t, env)

	err := ValidateConfig()
	if err == nil {
		t.Fatal("expected error when API key is missing")
	}
	if !strings.Contains(err.Error(), "PAYFLUX_API_KEY") {
		t.Errorf("error should mention PAYFLUX_API_KEY, got: %s", err.Error())
	}
}

func TestValidateConfig_InvalidExportMode(t *testing.T) {
	env := validEnv()
	env["PAYFLUX_EXPORT_MODE"] = "kafka"
	withEnv(t, env)

	err := ValidateConfig()
	if err == nil {
		t.Fatal("expected error for invalid export mode")
	}
	if !strings.Contains(err.Error(), "PAYFLUX_EXPORT_MODE") {
		t.Errorf("error should mention PAYFLUX_EXPORT_MODE, got: %s", err.Error())
	}
}

func TestValidateConfig_FileExportWithoutPath(t *testing.T) {
	env := validEnv()
	env["PAYFLUX_EXPORT_MODE"] = "file"
	env["PAYFLUX_EXPORT_FILE"] = ""
	withEnv(t, env)

	err := ValidateConfig()
	if err == nil {
		t.Fatal("expected error when file export has no path")
	}
	if !strings.Contains(err.Error(), "PAYFLUX_EXPORT_FILE") {
		t.Errorf("error should mention PAYFLUX_EXPORT_FILE, got: %s", err.Error())
	}
}

func TestValidateConfig_InvalidTier(t *testing.T) {
	env := validEnv()
	env["PAYFLUX_TIER"] = "tier3"
	withEnv(t, env)

	err := ValidateConfig()
	if err == nil {
		t.Fatal("expected error for invalid tier")
	}
	if !strings.Contains(err.Error(), "PAYFLUX_TIER") {
		t.Errorf("error should mention PAYFLUX_TIER, got: %s", err.Error())
	}
}

func TestValidateConfig_InvalidPanicMode(t *testing.T) {
	env := validEnv()
	env["PAYFLUX_PANIC_MODE"] = "explode"
	withEnv(t, env)

	err := ValidateConfig()
	if err == nil {
		t.Fatal("expected error for invalid panic mode")
	}
	if !strings.Contains(err.Error(), "PAYFLUX_PANIC_MODE") {
		t.Errorf("error should mention PAYFLUX_PANIC_MODE, got: %s", err.Error())
	}
}

func TestValidateConfig_InvalidThresholds_NonAscending(t *testing.T) {
	env := validEnv()
	env["PAYFLUX_RISK_SCORE_THRESHOLDS"] = "0.8,0.6,0.3"
	withEnv(t, env)

	err := ValidateConfig()
	if err == nil {
		t.Fatal("expected error for non-ascending thresholds")
	}
	if !strings.Contains(err.Error(), "ascending") {
		t.Errorf("error should mention ascending, got: %s", err.Error())
	}
}

func TestValidateConfig_InvalidThresholds_OutOfRange(t *testing.T) {
	env := validEnv()
	env["PAYFLUX_RISK_SCORE_THRESHOLDS"] = "0.3,0.6,1.5"
	withEnv(t, env)

	err := ValidateConfig()
	if err == nil {
		t.Fatal("expected error for out-of-range threshold")
	}
	if !strings.Contains(err.Error(), "[0.0, 1.0]") {
		t.Errorf("error should mention range, got: %s", err.Error())
	}
}

func TestValidateConfig_InvalidThresholds_WrongCount(t *testing.T) {
	env := validEnv()
	env["PAYFLUX_RISK_SCORE_THRESHOLDS"] = "0.3,0.6"
	withEnv(t, env)

	err := ValidateConfig()
	if err == nil {
		t.Fatal("expected error for wrong threshold count")
	}
	if !strings.Contains(err.Error(), "3 comma-separated") {
		t.Errorf("error should mention 3 values, got: %s", err.Error())
	}
}

func TestValidateConfig_InvalidEnv(t *testing.T) {
	env := validEnv()
	env["PAYFLUX_ENV"] = "staging"
	withEnv(t, env)

	err := ValidateConfig()
	if err == nil {
		t.Fatal("expected error for invalid env")
	}
}

func TestValidateConfig_InvalidStripeKey(t *testing.T) {
	env := validEnv()
	env["STRIPE_API_KEY"] = "pk_test_wrong_prefix"
	withEnv(t, env)

	err := ValidateConfig()
	if err == nil {
		t.Fatal("expected error for invalid Stripe key prefix")
	}
	if !strings.Contains(err.Error(), "sk_") {
		t.Errorf("error should mention sk_ prefix, got: %s", err.Error())
	}
}

func TestValidateConfig_InvalidRedisAddr(t *testing.T) {
	env := validEnv()
	env["REDIS_ADDR"] = "localhost"
	withEnv(t, env)

	err := ValidateConfig()
	if err == nil {
		t.Fatal("expected error for Redis addr without port")
	}
	if !strings.Contains(err.Error(), "REDIS_ADDR") {
		t.Errorf("error should mention REDIS_ADDR, got: %s", err.Error())
	}
}

func TestValidateConfig_NegativeRPS(t *testing.T) {
	env := validEnv()
	env["PAYFLUX_INGEST_RPS"] = "-5"
	withEnv(t, env)

	err := ValidateConfig()
	if err == nil {
		t.Fatal("expected error for negative RPS")
	}
	if !strings.Contains(err.Error(), "PAYFLUX_INGEST_RPS") {
		t.Errorf("error should mention PAYFLUX_INGEST_RPS, got: %s", err.Error())
	}
}

func TestValidateConfig_NonIntegerRPS(t *testing.T) {
	env := validEnv()
	env["PAYFLUX_RATELIMIT_RPS"] = "abc"
	withEnv(t, env)

	err := ValidateConfig()
	if err == nil {
		t.Fatal("expected error for non-integer RPS")
	}
}

func TestValidateConfig_MultipleErrors(t *testing.T) {
	env := validEnv()
	env["PAYFLUX_API_KEY"] = ""
	env["PAYFLUX_API_KEYS"] = ""
	env["STRIPE_API_KEY"] = ""
	env["PAYFLUX_TIER"] = "tier99"
	withEnv(t, env)

	err := ValidateConfig()
	if err == nil {
		t.Fatal("expected multiple errors")
	}
	ce, ok := err.(*ConfigError)
	if !ok {
		t.Fatalf("expected *ConfigError, got %T", err)
	}
	if len(ce.Failures) < 3 {
		t.Errorf("expected at least 3 errors, got %d: %v", len(ce.Failures), ce.Failures)
	}
}

func TestValidateConfig_SmallRiskWindow(t *testing.T) {
	env := validEnv()
	env["PAYFLUX_RISK_SCORE_WINDOW_SEC"] = "5"
	withEnv(t, env)

	err := ValidateConfig()
	if err == nil {
		t.Fatal("expected error for risk window < 10")
	}
	if !strings.Contains(err.Error(), "PAYFLUX_RISK_SCORE_WINDOW_SEC") {
		t.Errorf("error should mention window, got: %s", err.Error())
	}
}

func TestValidateConfig_NegativeStreamMaxLen(t *testing.T) {
	env := validEnv()
	env["PAYFLUX_STREAM_MAXLEN"] = "-1"
	withEnv(t, env)

	err := ValidateConfig()
	if err == nil {
		t.Fatal("expected error for negative stream maxlen")
	}
}
