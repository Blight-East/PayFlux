package main

import (
	"encoding/json"
	"os"
	"payment-node/internal/evidence"
	"time"
)

func main() {
	merchants := []evidence.Merchant{
		{
			ID:       "m1",
			Name:     "Growth Corp",
			Vol:      "1200",
			Status:   "healthy",
			Severity: "neutral",
			Region:   "US",
			Baseline: "0.9500",
			Segment:  "Enterprise",
		},
		{
			ID:       "m2",
			Name:     "Stable Ltd",
			Vol:      "450",
			Status:   "healthy",
			Severity: "neutral",
			Region:   "US",
			Baseline: "0.9800",
			Segment:  "SME",
		},
	}

	ts1 := time.Date(2026, 1, 25, 10, 0, 0, 0, time.UTC).Format(time.RFC3339)
	ts2 := time.Date(2026, 1, 25, 11, 0, 0, 0, time.UTC).Format(time.RFC3339)

	artifacts := []evidence.ArtifactSource{
		{
			ID:        "a3",
			Timestamp: ts2,
			Entity:    "e3",
			Severity:  "warning",
			Data:      map[string]interface{}{"msg": "secondary alert"},
		},
		{
			ID:        "a2",
			Timestamp: ts2,
			Entity:    "e2",
			Severity:  "critical",
			Data:      map[string]interface{}{"msg": "spike detected"},
		},
		{
			ID:        "a1",
			Timestamp: ts1,
			Entity:    "e1",
			Severity:  "info",
			Data: map[string]interface{}{
				"msg": "baseline trace",
				"nested": map[string]interface{}{
					"ok": "value",
				},
			},
		},
	}

	narratives := []evidence.Narrative{
		{
			ID:        "n2",
			Timestamp: ts2,
			EntityID:  "e2",
			Desc:      "High severity anomaly",
			Type:      "critical",
		},
		{
			ID:        "n1",
			Timestamp: ts1,
			EntityID:  "e1",
			Desc:      "Low severity baseline",
			Type:      "info",
		},
	}

	sys := evidence.SystemState{
		IngestRate:   "850 req/s",
		ActiveModels: 3,
		Uptime:       "12h30m",
		Cluster:      "payflux-main-01",
		NodeCount:    4,
	}

	meta := &evidence.Meta{
		SourceStatus: "OK",
	}

	env := evidence.GenerateEnvelope(merchants, artifacts, narratives, sys, meta)
	env.GeneratedAt = "2026-01-25T10:00:00Z"

	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	enc.Encode(env)
}
