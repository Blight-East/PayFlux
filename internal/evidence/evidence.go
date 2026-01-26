package evidence

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"reflect"
	"sort"
	"strings"
	"sync/atomic"
	"time"
)

// Allowed severities
var allowedSeverities = map[string]bool{
	"neutral":  true,
	"info":     true,
	"warning":  true,
	"critical": true,
	"success":  true,
	"error":    true,
}

// Forbidden keys set (Canonical)
var forbiddenKeys = map[string]bool{
	"__proto__":   true,
	"proto":       true,
	"constructor": true,
	"prototype":   true,
	"toString":    true,
	"valueOf":     true,
}

func IsForbiddenKey(s string) bool {
	return forbiddenKeys[s]
}

func coerceSeverity(s string) string {
	normalized := strings.ToLower(strings.TrimSpace(s))
	if allowedSeverities[normalized] {
		return normalized
	}
	return "neutral"
}

// Structs
type Envelope struct {
	SchemaVersion string  `json:"schemaVersion"`
	GeneratedAt   string  `json:"generatedAt"`
	Meta          *Meta   `json:"meta,omitempty"`
	Payload       Payload `json:"payload"`
}

type Meta struct {
	LastGoodAt   string   `json:"lastGoodAt,omitempty"`
	SourceStatus string   `json:"sourceStatus,omitempty"`
	Diagnostics  []string `json:"diagnostics,omitempty"`
}

type Payload struct {
	Merchants  []Merchant       `json:"merchants"`
	Artifacts  []ArtifactRecord `json:"artifacts"`
	Narratives []Narrative      `json:"narratives"`
	System     SystemState      `json:"system"`
}

type Merchant struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Vol      string `json:"vol"`
	Status   string `json:"status"`
	Severity string `json:"severity"`
	Region   string `json:"region"`
	Baseline string `json:"baseline"`
	Segment  string `json:"segment"`
}

type ArtifactRecord struct {
	ID        string          `json:"id"`
	Timestamp string          `json:"timestamp"`
	Entity    string          `json:"entity"`
	Data      json.RawMessage `json:"data"`
	Severity  string          `json:"severity"`
}

type Narrative struct {
	ID        string `json:"id"`
	Timestamp string `json:"timestamp"`
	Type      string `json:"type"`
	Desc      string `json:"desc"`
	EntityID  string `json:"entityId"`
}

type SystemState struct {
	IngestRate   string `json:"ingest_rate"`
	ActiveModels int    `json:"active_models"`
	Uptime       string `json:"uptime"`
	Cluster      string `json:"cluster"`
	NodeCount    int    `json:"node_count"`
}

// ArtifactSource is the raw input
type ArtifactSource struct {
	ID        string      `json:"id"`
	Timestamp string      `json:"timestamp"`
	Entity    string      `json:"entity"`
	Data      interface{} `json:"data"`
	Severity  string      `json:"severity"`
}

// Canonicalize produces deterministic JSON bytes by manually sorting map keys.
// It deep-strips forbidden keys during traversal.
func Canonicalize(v interface{}) json.RawMessage {
	if v == nil {
		return json.RawMessage("null")
	}
	val := reflect.ValueOf(v)
	b, err := canonicalizeValue(val)
	if err != nil {
		// Fallback for errors: use stdlib (best effort), though deterministic promise relies on our code.
		// In practice, if reflect fails, stdlib likely fails too or produces non-aligned output.
		// Retain error as empty/null for safety? Or try marshal.
		fallback, _ := json.Marshal(v)
		return json.RawMessage(fallback)
	}
	return json.RawMessage(b)
}

func canonicalizeValue(v reflect.Value) ([]byte, error) {
	if !v.IsValid() {
		return []byte("null"), nil
	}

	// Unwind interfaces and pointers
	for v.Kind() == reflect.Interface || v.Kind() == reflect.Ptr {
		if v.IsNil() {
			return []byte("null"), nil
		}
		v = v.Elem()
	}

	// 1. Explicit json.RawMessage check
	if v.CanInterface() {
		if rm, ok := v.Interface().(json.RawMessage); ok {
			// Unmarshal into interface{} to decode unordered JSON, then re-canonicalize
			var parsed interface{}
			if err := json.Unmarshal(rm, &parsed); err != nil {
				return nil, err
			}
			return canonicalizeValue(reflect.ValueOf(parsed))
		}
	}

	// 2. time.Time (RFC3339)
	if v.Type() == reflect.TypeOf(time.Time{}) {
		t := v.Interface().(time.Time)
		b, err := json.Marshal(t.Format(time.RFC3339))
		return b, err
	}

	switch v.Kind() {
	case reflect.Map:
		if v.Type().Key().Kind() != reflect.String {
			// Fallback: marshal -> unmarshal -> canonicalize
			return safeFallback(v.Interface())
		}

		keys := make([]string, 0, v.Len())
		for _, key := range v.MapKeys() {
			kStr := key.String()
			if !IsForbiddenKey(kStr) {
				keys = append(keys, kStr)
			}
		}
		sort.Strings(keys)

		var buf bytes.Buffer
		buf.WriteByte('{')
		for i, k := range keys {
			if i > 0 {
				buf.WriteByte(',')
			}
			kb, _ := json.Marshal(k)
			buf.Write(kb)
			buf.WriteByte(':')
			vb, err := canonicalizeValue(v.MapIndex(reflect.ValueOf(k)))
			if err != nil {
				return nil, err
			}
			buf.Write(vb)
		}
		buf.WriteByte('}')
		return buf.Bytes(), nil

	case reflect.Slice, reflect.Array:
		// Attempt to detect if it's a byte slice containing JSON
		if v.Type().Elem().Kind() == reflect.Uint8 {
			b := v.Bytes()
			trimmed := bytes.TrimSpace(b)
			if len(trimmed) > 0 && (trimmed[0] == '{' || trimmed[0] == '[') {
				var parsed interface{}
				if err := json.Unmarshal(b, &parsed); err == nil {
					return canonicalizeValue(reflect.ValueOf(parsed))
				}
			}
			// Fallback to standard base64 for bytes
			return json.Marshal(v.Interface())
		}

		var buf bytes.Buffer
		buf.WriteByte('[')
		for i := 0; i < v.Len(); i++ {
			if i > 0 {
				buf.WriteByte(',')
			}
			vb, err := canonicalizeValue(v.Index(i))
			if err != nil {
				return nil, err
			}
			buf.Write(vb)
		}
		buf.WriteByte(']')
		return buf.Bytes(), nil

	case reflect.Struct:
		t := v.Type()
		type fieldInfo struct {
			name  string
			value reflect.Value
		}
		var fields []fieldInfo

		for i := 0; i < t.NumField(); i++ {
			f := t.Field(i)
			if f.PkgPath != "" { // Unexported
				continue
			}

			tag := f.Tag.Get("json")
			parts := strings.Split(tag, ",")
			if parts[0] == "-" {
				continue
			}

			name := f.Name
			if parts[0] != "" {
				name = parts[0]
			}

			if IsForbiddenKey(name) {
				continue
			}

			fv := v.Field(i)
			if !fv.IsValid() {
				continue
			}

			fields = append(fields, fieldInfo{name: name, value: fv})
		}

		sort.Slice(fields, func(i, j int) bool {
			return fields[i].name < fields[j].name
		})

		var buf bytes.Buffer
		buf.WriteByte('{')
		written := 0
		for _, f := range fields {
			if written > 0 {
				buf.WriteByte(',')
			}
			kb, _ := json.Marshal(f.name)
			buf.Write(kb)
			buf.WriteByte(':')
			vb, err := canonicalizeValue(f.value)
			if err != nil {
				return nil, err
			}
			buf.Write(vb)
			written++
		}
		buf.WriteByte('}')
		return buf.Bytes(), nil

	default:
		// Primitives (int, float, bool, string) - standard marshal is deterministic
		return json.Marshal(v.Interface())
	}
}

// safeFallback is used when we can't reflectively traverse (e.g. map with non-string keys)
// It flattens the structure to standard JSON types and re-canonicalizes.
func safeFallback(v interface{}) ([]byte, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return []byte("null"), nil
	}
	var parsed interface{}
	if err := json.Unmarshal(b, &parsed); err != nil {
		return b, nil
	}
	return canonicalizeValue(reflect.ValueOf(parsed))
}

// GenerateEnvelope implements pipeline: FILTER -> NORMALIZE (TS/Sev) -> STABILIZE -> SORT -> CLAMP
func GenerateEnvelope(
	merchants []Merchant,
	artifacts []ArtifactSource,
	narratives []Narrative,
	system SystemState,
	meta *Meta,
) Envelope {
	if meta == nil {
		meta = &Meta{SourceStatus: "OK"}
	}

	if meta.SourceStatus == "DEGRADED" {
		atomic.AddUint64(&DegradedCount, 1)
		slog.Warn("degraded_state_detected",
			"classification", "evidence_source",
			"endpoint", "/api/evidence",
			"sourceStatus", "DEGRADED",
			"reason", "initial_meta_degraded",
		)
	}

	// 1. Merchants: FILTER -> NORMALIZE (Sev) -> SORT -> CLAMP
	filteredMerchants := make([]Merchant, 0)
	for _, m := range merchants {
		if !IsForbiddenKey(m.ID) {
			m.Severity = coerceSeverity(m.Severity)
			filteredMerchants = append(filteredMerchants, m)
		}
	}
	sort.SliceStable(filteredMerchants, func(i, j int) bool {
		return filteredMerchants[i].ID < filteredMerchants[j].ID
	})
	if len(filteredMerchants) > 5000 {
		filteredMerchants = filteredMerchants[:5000]
	}

	// 2. Artifacts: FILTER -> NORMALIZE (TS Check/Sev) -> STABILIZE -> SORT -> CLAMP
	processedArtifacts := make([]ArtifactRecord, 0)
	for _, a := range artifacts {
		if IsForbiddenKey(a.ID) || IsForbiddenKey(a.Entity) {
			continue
		}

		// Timestamp enforcement
		if _, err := time.Parse(time.RFC3339, a.Timestamp); err != nil {
			if meta.SourceStatus != "DEGRADED" {
				meta.SourceStatus = "DEGRADED"
				atomic.AddUint64(&DegradedCount, 1)
			}
			atomic.AddUint64(&DropCount, 1)

			diagMsg := fmt.Sprintf("dropped artifact %s: invalid timestamp %s", a.ID, a.Timestamp)
			meta.Diagnostics = append(meta.Diagnostics, diagMsg)

			slog.Error("evidence_dropped",
				"classification", "artifact",
				"endpoint", "/api/evidence",
				"record_id", a.ID,
				"reason", "invalid_timestamp",
				"timestamp", a.Timestamp,
			)
			continue
		}

		processedArtifacts = append(processedArtifacts, ArtifactRecord{
			ID:        a.ID,
			Timestamp: a.Timestamp,
			Entity:    a.Entity,
			Data:      Canonicalize(a.Data),
			Severity:  coerceSeverity(a.Severity),
		})
	}
	sort.SliceStable(processedArtifacts, func(i, j int) bool {
		if processedArtifacts[i].Timestamp != processedArtifacts[j].Timestamp {
			return processedArtifacts[i].Timestamp > processedArtifacts[j].Timestamp
		}
		return processedArtifacts[i].ID > processedArtifacts[j].ID
	})
	if len(processedArtifacts) > 5000 {
		processedArtifacts = processedArtifacts[:5000]
	}

	// 3. Narratives: FILTER -> NORMALIZE (TS/Type) -> SORT -> CLAMP
	filteredNarratives := make([]Narrative, 0)
	for _, n := range narratives {
		if IsForbiddenKey(n.ID) || IsForbiddenKey(n.EntityID) {
			continue
		}

		// Timestamp enforcement
		if _, err := time.Parse(time.RFC3339, n.Timestamp); err != nil {
			if meta.SourceStatus != "DEGRADED" {
				meta.SourceStatus = "DEGRADED"
				atomic.AddUint64(&DegradedCount, 1)
			}
			atomic.AddUint64(&DropCount, 1)

			diagMsg := fmt.Sprintf("dropped narrative %s: invalid timestamp %s", n.ID, n.Timestamp)
			meta.Diagnostics = append(meta.Diagnostics, diagMsg)

			slog.Error("evidence_dropped",
				"classification", "narrative",
				"endpoint", "/api/evidence",
				"record_id", n.ID,
				"reason", "invalid_timestamp",
				"timestamp", n.Timestamp,
			)
			continue
		}

		n.Type = coerceSeverity(n.Type)
		filteredNarratives = append(filteredNarratives, n)
	}
	sort.SliceStable(filteredNarratives, func(i, j int) bool {
		if filteredNarratives[i].Timestamp != filteredNarratives[j].Timestamp {
			return filteredNarratives[i].Timestamp > filteredNarratives[j].Timestamp
		}
		return filteredNarratives[i].ID > filteredNarratives[j].ID
	})
	if len(filteredNarratives) > 5000 {
		filteredNarratives = filteredNarratives[:5000]
	}

	if meta.SourceStatus == "OK" {
		SetLastGoodAt(time.Now().UTC())
	}

	return Envelope{
		SchemaVersion: "1.0",
		GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
		Meta:          meta,
		Payload: Payload{
			Merchants:  filteredMerchants,
			Artifacts:  processedArtifacts,
			Narratives: filteredNarratives,
			System:     system,
		},
	}
}
