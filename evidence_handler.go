package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"payment-node/internal/evidence"
	"strconv"
	"sync/atomic"
	"time"
)

var appStartTime = time.Now()

func mapSeverity(band string) string {
	switch band {
	case "low":
		return "info"
	case "elevated":
		return "warning"
	case "high":
		return "critical"
	case "critical":
		return "error"
	default:
		return "neutral"
	}
}

func gatherMerchants() []evidence.Merchant {
	var merchants []evidence.Merchant
	if rdb == nil {
		return merchants
	}

	iter := rdb.Scan(ctx, 0, "mctx:*", 1000).Iterator()
	for iter.Next(ctx) {
		key := iter.Val()
		if len(key) <= 5 {
			continue
		}
		merchantID := key[5:]
		mctx := getMerchantContext(merchantID)
		if mctx == nil {
			continue
		}

		status := "healthy"
		sev := "neutral"
		if mctx.AnomalyType != "" {
			status = "degraded"
			sev = "warning"
		}
		merchants = append(merchants, evidence.Merchant{
			ID:       merchantID,
			Name:     fmt.Sprintf("Merchant %s", merchantID[:8]),
			Vol:      strconv.Itoa(mctx.RecurrenceCount),
			Status:   status,
			Severity: sev,
			Region:   "US",
			Baseline: fmt.Sprintf("%.4f", mctx.BaselineApproval),
			Segment:  "Enterprise", // Default for core
		})
	}
	return merchants
}

func handleEvidence(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 1. Gather Merchants
	merchants := gatherMerchants()

	// 2. Gather Artifacts & Narratives
	var artifacts []evidence.ArtifactSource
	var narratives []evidence.Narrative

	meta := &evidence.Meta{
		SourceStatus: "OK",
	}

	if warningStore != nil {
		allWarnings := warningStore.List(5000, "")
		for _, rw := range allWarnings {
			sev := mapSeverity(rw.RiskBand)

			// Artifact
			artifacts = append(artifacts, evidence.ArtifactSource{
				ID:        rw.WarningID,
				Timestamp: rw.ProcessedAt.UTC().Format(time.RFC3339),
				Entity:    rw.MerchantIDHash,
				Severity:  sev,
				Data:      rw,
			})

			// Narrative
			narrativeID := fmt.Sprintf("narr_%s", rw.WarningID)
			narratives = append(narratives, evidence.Narrative{
				ID:        narrativeID,
				Timestamp: rw.ProcessedAt.UTC().Format(time.RFC3339),
				EntityID:  rw.MerchantIDHash,
				Type:      sev,
				Desc:      fmt.Sprintf("%s anomaly detected by %s scorer. Drivers: %v", rw.RiskBand, rw.Processor, rw.RiskDrivers),
			})
		}
	} else {
		meta.SourceStatus = "DEGRADED"
		meta.Diagnostics = append(meta.Diagnostics, "warningStore not initialized")
	}

	// 3. System State
	sys := evidence.SystemState{
		IngestRate:   "850 req/s", // Example value, could be pulled from metrics
		ActiveModels: 3,           // riskScorer, warnings, tier2
		Uptime:       time.Since(appStartTime).String(),
		Cluster:      "payflux-main-01",
		NodeCount:    4,
	}

	// 4. Generate Envelope (Applies FILTER -> NORMALIZE -> SORT -> CLAMP)
	env := evidence.GenerateEnvelope(merchants, artifacts, narratives, sys, meta)

	// 5. Emit
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	json.NewEncoder(w).Encode(env)
}

func handleEvidenceFixture(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract name from path /api/evidence/fixtures/{name}
	name := r.URL.Path[len("/api/evidence/fixtures/"):]
	if name == "" {
		http.Error(w, "missing fixture name", http.StatusBadRequest)
		return
	}

	// Basic security check
	if name == "." || name == ".." {
		http.Error(w, "invalid fixture name", http.StatusBadRequest)
		return
	}

	// Construct path relative to CWD
	path := fmt.Sprintf("internal/evidence/fixtures/%s.json", name)

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "fixture not found", http.StatusNotFound)
			return
		}
		http.Error(w, fmt.Sprintf("internal error: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.Write(data)
}

func handleEvidenceHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	status := "OK"
	if atomic.LoadUint64(&evidence.DegradedCount) > 0 {
		status = "DEGRADED"
	}

	lastGood := evidence.GetLastGoodAt()
	lastGoodStr := "never"
	if !lastGood.IsZero() {
		lastGoodStr = lastGood.Format(time.RFC3339)
	}

	health := map[string]interface{}{
		"status":     status,
		"lastGoodAt": lastGoodStr,
		"uptime":     time.Since(appStartTime).String(),
		"errorCounts": map[string]uint64{
			"degraded":          atomic.LoadUint64(&evidence.DegradedCount),
			"drop":              atomic.LoadUint64(&evidence.DropCount),
			"contractViolation": atomic.LoadUint64(&evidence.ContractViolationCount),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	json.NewEncoder(w).Encode(health)
}
