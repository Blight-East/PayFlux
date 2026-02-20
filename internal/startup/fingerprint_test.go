package startup

import (
	"os"
	"testing"
)

func TestComputeFingerprint_Deterministic(t *testing.T) {
	withEnv(t, validEnv())

	fp1 := ComputeFingerprint()
	fp2 := ComputeFingerprint()

	if fp1.Hash != fp2.Hash {
		t.Errorf("fingerprint not deterministic: %s != %s", fp1.Hash, fp2.Hash)
	}
	if fp1.Short != fp2.Short {
		t.Errorf("short fingerprint not deterministic: %s != %s", fp1.Short, fp2.Short)
	}
}

func TestComputeFingerprint_ChangesOnEnvChange(t *testing.T) {
	env := validEnv()
	withEnv(t, env)

	fp1 := ComputeFingerprint()

	// Change one env var
	os.Setenv("PAYFLUX_TIER", "tier2")
	fp2 := ComputeFingerprint()

	if fp1.Hash == fp2.Hash {
		t.Error("fingerprint should change when PAYFLUX_TIER changes")
	}
}

func TestComputeFingerprint_ShortIs12Chars(t *testing.T) {
	withEnv(t, validEnv())

	fp := ComputeFingerprint()
	if len(fp.Short) != 12 {
		t.Errorf("expected short fingerprint length 12, got %d", len(fp.Short))
	}
	if len(fp.Hash) != 64 {
		t.Errorf("expected full fingerprint length 64, got %d", len(fp.Hash))
	}
}

func TestComputeFingerprint_HashIs64HexChars(t *testing.T) {
	withEnv(t, validEnv())

	fp := ComputeFingerprint()
	for _, c := range fp.Hash {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f')) {
			t.Errorf("fingerprint contains non-hex character: %c", c)
		}
	}
}

func TestComputeFingerprint_UnsetVsDifferentValue(t *testing.T) {
	env := validEnv()
	env["PAYFLUX_PILOT_MODE"] = ""
	withEnv(t, env)
	fp1 := ComputeFingerprint()

	os.Setenv("PAYFLUX_PILOT_MODE", "true")
	fp2 := ComputeFingerprint()

	if fp1.Hash == fp2.Hash {
		t.Error("fingerprint should differ between unset and 'true'")
	}
}

func TestEnvSummary_RedactsSecrets(t *testing.T) {
	withEnv(t, validEnv())

	summary := EnvSummary()

	// API key should be redacted
	apiKeyVal := summary["PAYFLUX_API_KEY"]
	if apiKeyVal == os.Getenv("PAYFLUX_API_KEY") {
		t.Error("EnvSummary should not expose raw API key")
	}
	if apiKeyVal == "" {
		t.Error("EnvSummary should have a redacted value for API key")
	}

	// Non-secret should be shown as-is
	tierVal := summary["PAYFLUX_TIER"]
	if tierVal != "tier1" {
		t.Errorf("expected PAYFLUX_TIER=tier1, got %s", tierVal)
	}

	// Unset should show (unset)
	pilotVal := summary["PAYFLUX_PILOT_MODE"]
	if pilotVal != "(unset)" {
		t.Errorf("expected PAYFLUX_PILOT_MODE=(unset), got %s", pilotVal)
	}
}

func TestEnvSummary_MultiKeyRedaction(t *testing.T) {
	env := validEnv()
	env["PAYFLUX_API_KEYS"] = "key1,key2,key3"
	env["PAYFLUX_API_KEY"] = "" // clear single key
	withEnv(t, env)

	summary := EnvSummary()
	val := summary["PAYFLUX_API_KEYS"]
	if val != "<3 keys>" {
		t.Errorf("expected '<3 keys>', got '%s'", val)
	}
}

func TestConfigKeys_AreSorted(t *testing.T) {
	// This also runs via init() panic, but explicit test is clearer
	for i := 1; i < len(configKeys); i++ {
		if configKeys[i-1] >= configKeys[i] {
			t.Errorf("configKeys not sorted: %s >= %s", configKeys[i-1], configKeys[i])
		}
	}
}
