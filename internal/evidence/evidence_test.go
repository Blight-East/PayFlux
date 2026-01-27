package evidence

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"testing"
)

// Helper struct for deterministic struct test
type NestStruct struct {
	Prototype string `json:"prototype"` // forbidden
	Safe      string `json:"safe"`
}
type StructData struct {
	Z        int             `json:"z"`
	A        int             `json:"a"`
	Proto    string          `json:"__proto__"` // forbidden
	Nested   NestStruct      `json:"nested"`
	Unsorted json.RawMessage `json:"unsorted"`
}

func TestDeterminism(t *testing.T) {
	merchants := []Merchant{{ID: "m1", Name: "M1", Vol: "100", Status: "ok", Severity: "neutral", Region: "US", Baseline: "0.1", Segment: "A"}}

	// Create map with unsorted keys and mixed types (via interface{})
	rawMap := map[string]interface{}{
		"z": 1,
		"a": 2,
		"m": map[string]interface{}{"y": 10, "b": 5},
	}

	// Create another map but strongly typed map[string]string (Supported via reflection now)
	strMap := map[string]string{
		"z": "last",
		"a": "first",
	}

	// Create JSON raw message with unsorted keys
	// This will be re-canonicalized to {"a":2,"z":1}
	unsortedJSON := json.RawMessage(`{"z":1, "a":2}`)

	// Byte slice containing JSON (should be detected and re-canonicalized)
	byteJSON := []byte(`{"z":1, "a":2}`)

	structVal := StructData{
		Z: 1, A: 2, Proto: "bad",
		Nested:   NestStruct{Prototype: "bad", Safe: "ok"},
		Unsorted: unsortedJSON,
	}

	artifacts := []ArtifactSource{
		{
			ID: "reflect_map_interface", Timestamp: "2026-01-25T10:00:00Z", Entity: "e1", Severity: "Info",
			Data: rawMap,
		},
		{
			ID: "reflect_map_string", Timestamp: "2026-01-25T10:00:00Z", Entity: "e2", Severity: " warning ", // Test coercion
			Data: strMap,
		},
		{
			ID: "raw_json_recan", Timestamp: "2026-01-25T10:00:00Z", Entity: "e3", Severity: "critical",
			Data: unsortedJSON,
		},
		{
			ID: "struct_deep_strip", Timestamp: "2026-01-25T10:00:00Z", Entity: "e4", Severity: "info",
			Data: structVal,
		},
		{
			ID: "byte_slice_json", Timestamp: "2026-01-25T10:00:00Z", Entity: "e5", Severity: "info",
			Data: byteJSON,
		},
	}

	narratives := []Narrative{{ID: "n1", Timestamp: "2026-01-25T10:00:00Z", Type: "info", Desc: "d1", EntityID: "e1"}}
	sys := SystemState{IngestRate: "10", ActiveModels: 1, Uptime: "1h", Cluster: "c1", NodeCount: 1}

	env1 := GenerateEnvelope(merchants, artifacts, narratives, sys, nil)
	env2 := GenerateEnvelope(merchants, artifacts, narratives, sys, nil)

	// Normalize generatedAt before hashing
	env1.GeneratedAt = ""
	env2.GeneratedAt = ""

	j1, _ := json.Marshal(env1)
	j2, _ := json.Marshal(env2)

	h1 := sha256.Sum256(j1)
	h2 := sha256.Sum256(j2)

	if hex.EncodeToString(h1[:]) != hex.EncodeToString(h2[:]) {
		t.Errorf("Determinism failed:\n%s\nvs\n%s", string(j1), string(j2))
	}

	// Verify Canonical Output Strings

	// Helper to find record
	find := func(id string) ArtifactRecord {
		for _, a := range env1.Payload.Artifacts {
			if a.ID == id {
				return a
			}
		}
		t.Fatalf("Artifact %s not found", id)
		return ArtifactRecord{}
	}

	// SORT ORDER CHECK: TS DESC, then ID DESC
	// All TS=2026-01-25T10:00:00Z
	// IDs:
	// 1. time_rfc3339 (removed from new test data, oops, let's look at current)
	//
	// Current IDs in artifacts slice:
	// - reflect_map_interface
	// - reflect_map_string
	// - raw_json_recan
	// - struct_deep_strip
	// - byte_slice_json
	//
	// Expected Sort Order (ID Descending):
	// 1. struct_deep_strip
	// 2. reflect_map_string
	// 3. reflect_map_interface
	// 4. raw_json_recan
	// 5. byte_slice_json

	if env1.Payload.Artifacts[0].ID != "struct_deep_strip" {
		t.Errorf("Sort order failed. Expected first ID struct_deep_strip, got %s", env1.Payload.Artifacts[0].ID)
	}

	// Check 1: Recursive Sort (Map Interface)
	r1 := find("reflect_map_interface")
	expected1 := `{"a":2,"m":{"b":5,"y":10},"z":1}`
	if string(r1.Data) != expected1 {
		t.Errorf("Reflect map sorting failed. Expected %s, Got %s", expected1, string(r1.Data))
	}

	// Check 2: Strong Typed Map (Map String)
	r2 := find("reflect_map_string")
	expected2 := `{"a":"first","z":"last"}`
	if string(r2.Data) != expected2 {
		t.Errorf("Strong map sorting failed. Got %s", string(r2.Data))
	}

	// Check 3: RawMessage Re-Canonicalization
	r3 := find("raw_json_recan")
	expected3 := `{"a":2,"z":1}`
	if string(r3.Data) != expected3 {
		t.Errorf("RawMessage re-canonicalization failed. Expected %s, Got %s", expected3, string(r3.Data))
	}

	// Check 4: Struct Deep Strip & Sort
	// StructData: Z(1), A(2), Proto(bad->strip), Nested(Prototype->strip, Safe->ok), Unsorted({"z":1,"a":2}->{"a":2,"z":1})
	// Sorted Fields order: a, nested, unsorted, z (lexicographic by json tag name)
	r4 := find("struct_deep_strip")
	// nested: {"safe":"ok"}
	// unsorted: {"a":2,"z":1}

	// NOTE: Depending on stable sort of fields (A vs a? case sensitive?)
	// Our code uses fields[i].name < fields[j].name comparison.
	// ASCII: 'a' > 'Z'. So 'Z' ("z") comes after 'a'.
	// Wait: "z" (122) > "a" (97). "nested" (110). "unsorted" (117)
	// Order: "a", "nested", "unsorted", "z"

	expectedStruct := `{"a":2,"nested":{"safe":"ok"},"unsorted":{"a":2,"z":1},"z":1}`
	if string(r4.Data) != expectedStruct {
		t.Errorf("Struct deep strip failed. Expected %s, Got %s", expectedStruct, string(r4.Data))
	}

	// Check 5: Byte Slice JSON detection
	r5 := find("byte_slice_json")
	expectedBytes := `{"a":2,"z":1}`
	if string(r5.Data) != expectedBytes {
		t.Errorf("Byte slice JSON detection failed. Expected %s, Got %s", expectedBytes, string(r5.Data))
	}

}

// ... Rest of tests (ForbiddenKeys, Enforcement) remain same
func TestEnforcement(t *testing.T) {
	// Setup with invalid values
	artifacts := []ArtifactSource{
		{
			ID: "bad_ts", Timestamp: "invalid-time", Entity: "e1", Severity: "info",
		},
		{
			ID: "bad_sev", Timestamp: "2026-01-25T10:00:00Z", Entity: "e2", Severity: "mega-critical",
		},
	}
	narratives := []Narrative{
		{ID: "n_bad_ts", Timestamp: "not-a-date", Type: "info", Desc: "d"},
		{ID: "n_bad_sev", Timestamp: "2026-01-25T10:00:00Z", Type: "unknown", Desc: "d"},
	}

	meta := &Meta{SourceStatus: "OK"}
	env := GenerateEnvelope(nil, artifacts, narratives, SystemState{}, meta)

	// 1. Timestamp Enforcement (Drop + Diagnostic)
	if len(env.Payload.Artifacts) != 1 {
		t.Errorf("Expected 1 valid artifact (bad_sev), got %d", len(env.Payload.Artifacts))
	}
	if env.Payload.Artifacts[0].ID != "bad_sev" {
		t.Error("Wrong artifact preserved")
	}

	if len(env.Payload.Narratives) != 1 {
		t.Errorf("Expected 1 valid narrative (n_bad_sev), got %d", len(env.Payload.Narratives))
	}

	if meta.SourceStatus != "DEGRADED" {
		t.Error("SourceStatus not set to DEGRADED on invalid timestamp")
	}
	if len(meta.Diagnostics) != 2 {
		t.Errorf("Expected 2 diagnostics, got %d", len(meta.Diagnostics))
	}

	// 2. Severity Enforcement (Coercion)
	if env.Payload.Artifacts[0].Severity != "neutral" {
		t.Errorf("Artifact severity not coerced. Got %s", env.Payload.Artifacts[0].Severity)
	}
	if env.Payload.Narratives[0].Type != "neutral" {
		t.Errorf("Narrative type not coerced. Got %s", env.Payload.Narratives[0].Type)
	}
}
