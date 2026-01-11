package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// PilotOutcomeAnnotation is the JSON structure emitted to stdout for proof capture
type PilotOutcomeAnnotation struct {
	Type             string    `json:"type"`
	WarningID        string    `json:"warning_id"`
	EventID          string    `json:"event_id"`
	Processor        string    `json:"processor"`
	RiskBand         string    `json:"risk_band"`
	RiskScore        float64   `json:"risk_score"`
	WarningAt        time.Time `json:"warning_at"`
	OutcomeType      string    `json:"outcome_type"`
	OutcomeTimestamp string    `json:"outcome_timestamp"`
	OutcomeSource    string    `json:"outcome_source"`
	OutcomeNotes     string    `json:"outcome_notes,omitempty"`
	LeadTimeSeconds  float64   `json:"lead_time_seconds,omitempty"`
	AnnotatedAt      time.Time `json:"annotated_at"`
}

// OutcomeRequest is the request body for setting an outcome
type OutcomeRequest struct {
	OutcomeType string `json:"outcome_type"`
	ObservedAt  string `json:"observed_at"`
	Source      string `json:"source,omitempty"` // manual|stripe_webhook|adyen_webhook|other_webhook (default: manual)
	Notes       string `json:"notes,omitempty"`
}

// pilotDashboardHandler serves the minimal HTML dashboard
func pilotDashboardHandler(store *WarningStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		warnings := store.List(100, "") // Last 100 warnings

		tmpl := template.Must(template.New("dashboard").Parse(pilotDashboardHTML))
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		if err := tmpl.Execute(w, warnings); err != nil {
			log.Printf("pilot_dashboard_render_error: %v", err)
			http.Error(w, "Internal error", http.StatusInternalServerError)
		}
	}
}

// pilotWarningsListHandler returns JSON list of warnings
func pilotWarningsListHandler(store *WarningStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		processor := r.URL.Query().Get("processor")
		warnings := store.List(100, processor)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(warnings)
	}
}

// pilotWarningGetHandler returns a single warning by ID
func pilotWarningGetHandler(store *WarningStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Extract warning_id from path: /pilot/warnings/{warning_id}
		path := strings.TrimPrefix(r.URL.Path, "/pilot/warnings/")
		warningID := strings.TrimSuffix(path, "/outcome")

		warning, found := store.Get(warningID)
		if !found {
			http.Error(w, `{"error":"warning not found"}`, http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(warning)
	}
}

// pilotOutcomeHandler handles POST /pilot/warnings/{warning_id}/outcome
func pilotOutcomeHandler(store *WarningStore, outcomeSetCounter func(outcomeType, source string), leadTimeHist func(seconds float64)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
			return
		}

		// Extract warning_id from path: /pilot/warnings/{warning_id}/outcome
		path := strings.TrimPrefix(r.URL.Path, "/pilot/warnings/")
		warningID := strings.TrimSuffix(path, "/outcome")

		if warningID == "" {
			http.Error(w, `{"error":"warning_id required"}`, http.StatusBadRequest)
			return
		}

		// Parse request body
		var req OutcomeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid JSON"}`, http.StatusBadRequest)
			return
		}

		// Validate outcome_type
		if !ValidOutcomeType(req.OutcomeType) {
			http.Error(w, `{"error":"invalid outcome_type"}`, http.StatusBadRequest)
			return
		}

		// Default observed_at to now if not provided
		observedAt := req.ObservedAt
		if observedAt == "" {
			observedAt = time.Now().UTC().Format(time.RFC3339)
		}

		// Default source to manual if not provided, validate if provided
		source := req.Source
		if source == "" {
			source = OutcomeSourceManual
		} else if !ValidOutcomeSource(source) {
			http.Error(w, `{"error":"invalid source"}`, http.StatusBadRequest)
			return
		}

		// Set outcome
		warning, found := store.SetOutcome(warningID, req.OutcomeType, observedAt, source, req.Notes)
		if !found {
			http.Error(w, `{"error":"warning not found"}`, http.StatusNotFound)
			return
		}

		// Increment Prometheus counter
		if outcomeSetCounter != nil {
			outcomeSetCounter(req.OutcomeType, source)
		}

		// Calculate and observe lead time
		var leadTimeSeconds float64
		if !warning.ProcessedAt.IsZero() && observedAt != "" {
			outcomeTime, err := time.Parse(time.RFC3339, observedAt)
			if err == nil {
				leadTimeSeconds = outcomeTime.Sub(warning.ProcessedAt).Seconds()
				if leadTimeSeconds > 0 && leadTimeHist != nil {
					leadTimeHist(leadTimeSeconds)
				}
			}
		}

		// Emit proof capture to stdout
		annotation := PilotOutcomeAnnotation{
			Type:             "pilot_outcome_annotation",
			WarningID:        warning.WarningID,
			EventID:          warning.EventID,
			Processor:        warning.Processor,
			RiskBand:         warning.RiskBand,
			RiskScore:        warning.RiskScore,
			WarningAt:        warning.ProcessedAt,
			OutcomeType:      warning.OutcomeType,
			OutcomeTimestamp: warning.OutcomeTimestamp,
			OutcomeSource:    warning.OutcomeSource,
			OutcomeNotes:     warning.OutcomeNotes,
			LeadTimeSeconds:  leadTimeSeconds,
			AnnotatedAt:      time.Now().UTC(),
		}

		annotationJSON, _ := json.Marshal(annotation)
		fmt.Fprintln(os.Stdout, string(annotationJSON))

		// Return updated warning
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(warning)
	}
}

const pilotDashboardHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PayFlux Pilot Dashboard</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0d1117; color: #c9d1d9; padding: 20px;
        }
        h1 { color: #58a6ff; margin-bottom: 8px; font-size: 24px; }
        .subtitle { color: #8b949e; margin-bottom: 20px; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #161b22; text-align: left; padding: 12px 8px; color: #8b949e; font-weight: 500; }
        td { padding: 10px 8px; border-bottom: 1px solid #21262d; vertical-align: top; }
        tr:hover { background: #161b22; }
        .band-elevated { color: #d29922; }
        .band-high { color: #f85149; }
        .band-critical { color: #ff7b72; font-weight: bold; }
        .score { font-family: monospace; }
        .drivers { font-size: 11px; color: #8b949e; }
        .context { font-size: 11px; color: #7ee787; max-width: 300px; }
        .trajectory { font-size: 11px; color: #a5d6ff; }
        .outcome-form { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
        select, input[type="text"], input[type="datetime-local"] { 
            background: #21262d; border: 1px solid #30363d; color: #c9d1d9;
            padding: 4px 8px; border-radius: 4px; font-size: 12px;
        }
        select { min-width: 120px; }
        input[type="text"] { width: 150px; }
        button { 
            background: #238636; border: none; color: white; padding: 4px 12px;
            border-radius: 4px; cursor: pointer; font-size: 12px;
        }
        button:hover { background: #2ea043; }
        button:disabled { background: #21262d; cursor: not-allowed; }
        .saved { color: #3fb950; font-size: 11px; }
        .outcome-set { background: #1a2f23; }
        .timestamp { font-size: 11px; color: #8b949e; font-family: monospace; }
        .empty { color: #8b949e; text-align: center; padding: 40px; }
        .refresh { float: right; background: #21262d; }
        .refresh:hover { background: #30363d; }
    </style>
</head>
<body>
    <h1>PayFlux Pilot Dashboard</h1>
    <p class="subtitle">Outcome annotation for pilot proof capture. Observed outcomes after warning — not causal claims.</p>
    <button class="refresh" onclick="location.reload()">↻ Refresh</button>
    
    {{if .}}
    <table>
        <thead>
            <tr>
                <th>Time</th>
                <th>Processor</th>
                <th>Band</th>
                <th>Score</th>
                <th>Drivers</th>
                <th>Context / Trajectory</th>
                <th>Observed Outcome</th>
            </tr>
        </thead>
        <tbody>
            {{range .}}
            <tr class="{{if .OutcomeObserved}}outcome-set{{end}}">
                <td class="timestamp">{{.ProcessedAt.Format "Jan 02 15:04:05"}}</td>
                <td>{{.Processor}}</td>
                <td class="band-{{.RiskBand}}">{{.RiskBand}}</td>
                <td class="score">{{printf "%.2f" .RiskScore}}</td>
                <td class="drivers">{{range .RiskDrivers}}{{.}}<br/>{{end}}</td>
                <td>
                    {{if .PlaybookContext}}<div class="context">{{.PlaybookContext}}</div>{{end}}
                    {{if .RiskTrajectory}}<div class="trajectory">{{.RiskTrajectory}}</div>{{end}}
                </td>
                <td>
                    {{if .OutcomeObserved}}
                        <div class="saved">✓ {{.OutcomeType}}</div>
                        <div class="timestamp">{{.OutcomeTimestamp}}</div>
                        {{if .OutcomeNotes}}<div class="drivers">{{.OutcomeNotes}}</div>{{end}}
                    {{else}}
                    <form class="outcome-form" onsubmit="return saveOutcome(event, '{{.WarningID}}')">
                        <select name="outcome_type" required>
                            <option value="">Select...</option>
                            <option value="throttle">Throttle</option>
                            <option value="review">Review</option>
                            <option value="hold">Hold</option>
                            <option value="auth_degradation">Auth Degradation</option>
                            <option value="rate_limit">Rate Limit</option>
                            <option value="other">Other</option>
                            <option value="none">None observed</option>
                        </select>
                        <input type="text" name="notes" placeholder="Notes (optional)">
                        <button type="submit">Save</button>
                    </form>
                    {{end}}
                </td>
            </tr>
            {{end}}
        </tbody>
    </table>
    {{else}}
    <div class="empty">No warnings yet. Send events with elevated+ risk to see them here.</div>
    {{end}}

    <script>
        async function saveOutcome(event, warningId) {
            event.preventDefault();
            const form = event.target;
            const outcomeType = form.outcome_type.value;
            const notes = form.notes.value;
            
            const btn = form.querySelector('button');
            btn.disabled = true;
            btn.textContent = '...';
            
            try {
                const resp = await fetch('/pilot/warnings/' + warningId + '/outcome', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + (localStorage.getItem('payflux_api_key') || prompt('Enter API key:'))
                    },
                    body: JSON.stringify({
                        outcome_type: outcomeType,
                        observed_at: new Date().toISOString(),
                        notes: notes
                    })
                });
                
                if (resp.ok) {
                    localStorage.setItem('payflux_api_key', resp.headers.get('X-Used-Key') || localStorage.getItem('payflux_api_key'));
                    location.reload();
                } else {
                    const err = await resp.json();
                    alert('Error: ' + (err.error || 'Unknown error'));
                    btn.disabled = false;
                    btn.textContent = 'Save';
                }
            } catch (e) {
                alert('Network error: ' + e.message);
                btn.disabled = false;
                btn.textContent = 'Save';
            }
            return false;
        }
    </script>
</body>
</html>`
