package api

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"
)

type EvaluateReq struct {
	WorkspaceID string `json:"workspace_id"`
}

type EvaluateRes struct {
	Anomaly         bool    `json:"anomaly"`
	CurrentCount    int     `json:"current_count"`
	BaselineAverage float64 `json:"baseline_average"`
}

func EvaluateFailureVelocityHandler(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req EvaluateReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if req.WorkspaceID == "" {
			http.Error(w, "workspace_id is required", http.StatusBadRequest)
			return
		}

		anomaly, cur, base, err := EvaluateAndAlert(r.Context(), db, req.WorkspaceID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		res := EvaluateRes{
			Anomaly:         anomaly,
			CurrentCount:    cur,
			BaselineAverage: base,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(res)
	}
}

func EvaluateAndAlert(ctx context.Context, db *sql.DB, workspaceID string) (bool, int, float64, error) {
	now := time.Now().UTC()
	currentHour := time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), 0, 0, 0, time.UTC)
	sevenDaysAgo := currentHour.Add(-7 * 24 * time.Hour)

	query := `
		SELECT hour_bucket, failure_count
		FROM signal_failure_velocity
		WHERE workspace_id = $1 AND hour_bucket >= $2
	`

	rows, err := db.QueryContext(ctx, query, workspaceID, sevenDaysAgo)
	if err != nil {
		return false, 0, 0, err
	}
	defer rows.Close()

	var currentCount int
	historicalCounts := make(map[time.Time]int)

	for rows.Next() {
		var hourBucket time.Time
		var count int
		if err := rows.Scan(&hourBucket, &count); err != nil {
			return false, 0, 0, err
		}

		if hourBucket.Equal(currentHour) {
			currentCount = count
		} else if hourBucket.Hour() == currentHour.Hour() {
			historicalCounts[hourBucket] = count
		}
	}

	historicalTotal := 0
	for _, count := range historicalCounts {
		historicalTotal += count
	}

	baselineAverage := float64(historicalTotal) / 7.0

	anomaly := false
	if baselineAverage > 0 && float64(currentCount) > baselineAverage*2.5 {
		anomaly = true
	}

	if anomaly {
		go sendAlert(workspaceID, currentCount, baselineAverage)
	}

	return anomaly, currentCount, baselineAverage, nil
}

func sendAlert(workspaceID string, currentCount int, baselineAverage float64) {
	payload := map[string]interface{}{
		"workspace_id":     workspaceID,
		"signal":           "payment_failure_velocity",
		"current_count":    currentCount,
		"baseline_average": baselineAverage,
	}
	body, _ := json.Marshal(payload)
	resp, err := http.Post("http://localhost:3000/api/v1/alerts", "application/json", bytes.NewReader(body))
	if err != nil {
		slog.Error("failed_to_send_alert", "error", err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		slog.Error("alert_endpoint_returned_error", "status", resp.StatusCode)
	}
}

func ScheduleEvaluations(ctx context.Context, db *sql.DB) {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			rows, err := db.QueryContext(ctx, "SELECT id FROM workspaces WHERE activation_state = 'active'")
			if err != nil {
				slog.Error("scheduler_failed_to_get_workspaces", "error", err)
				continue
			}
			var workspaces []string
			for rows.Next() {
				var id string
				if err := rows.Scan(&id); err == nil {
					workspaces = append(workspaces, id)
				}
			}
			rows.Close()

			for _, wid := range workspaces {
				EvaluateAndAlert(ctx, db, wid)
			}
		}
	}
}
