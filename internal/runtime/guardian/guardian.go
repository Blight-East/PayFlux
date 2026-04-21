package guardian

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"syscall"
	"time"
)

type Config struct {
	MetricsURL   string
	HealthURL    string
	OutputFile   string
	BaselinePath string
	TimelinePath string
	TimelineSize int
	TracePath    string
	TraceSize    int
	Interval     time.Duration
}

type Metrics struct {
	ErrorRate float64
	P95       float64
	MemoryMB  float64
}

type Decision struct {
	Status       string      `json:"status"`
	Confidence   float64     `json:"confidence"`
	Reason       string      `json:"reason"`
	Cause        CauseReport `json:"cause"`
	Timestamp    string      `json:"timestamp"`
	DeployAgeSec int64       `json:"deploy_age_sec"`
	Version      string      `json:"version"`
}

func Run(cfg Config) error {
	if cfg.Interval == 0 {
		cfg.Interval = 15 * time.Second
	}

	lock := "/var/run/payflux/guardian.lock"
	_ = os.MkdirAll("/var/run/payflux", 0755)
	lf, err := os.OpenFile(lock, os.O_CREATE|os.O_RDWR|os.O_TRUNC, 0644)
	if err != nil {
		return fmt.Errorf("lock create failed: %w", err)
	}
	if err := syscall.Flock(int(lf.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err != nil {
		return fmt.Errorf("guardian already running")
	}
	defer syscall.Flock(int(lf.Fd()), syscall.LOCK_UN)
	defer lf.Close()

	baseline, _ := LoadBaseline(cfg.BaselinePath)
	timeline := NewTimeline(cfg.TimelineSize, cfg.TimelinePath)
	trace := NewTraceLog(cfg.TraceSize, cfg.TracePath)
	lastSave := time.Now()

	for {
		metrics, unhealthy, err := collect(cfg)
		if err != nil {
			write(cfg, Decision{
				Status:    "WARN",
				Reason:    err.Error(),
				Timestamp: now(),
			})
			time.Sleep(cfg.Interval)
			continue
		}

		age := deployAge()
		score := baseline.deviationScore(metrics)
		learning := age > 300 && metrics.ErrorRate < 0.2 && score < 1.0
		if learning {
			baseline.Update(metrics)
		}

		if unhealthy {
			metrics.ErrorRate += 0.05
		}

		if time.Since(lastSave) > 60*time.Second {
			_ = baseline.Save(cfg.BaselinePath)
			_ = timeline.Save()
			_ = trace.Save()
			lastSave = time.Now()
		}

		if age < 120 {
			score *= 0.4
		}

		decision := evaluate(score, age)

		report := CheckInvariants(metrics, score, decision, age)
		if !report.Valid {
			decision.Status = "WARN"
			decision.Reason = "invariant_violation: " + strings.Join(report.Violations, ",")
		}

		if baseline.snap.Load() != nil {
			snap := baseline.snap.Load().(snapshot)
			decision.Cause = AnalyzeCause(metrics, snap, age)

			entry := Trace{
				Timestamp: now(),
				Metrics:   metrics,
				Baseline:  snap,
				Score:     score,
				Decision:  decision,
			}
			if !report.Valid {
				entry.Invariant = &report
			}
			trace.Add(entry)
		}

		timeline.Add(NowEntry(decision, score))

		write(cfg, decision)

		time.Sleep(cfg.Interval)
	}
}

func collect(cfg Config) (Metrics, bool, error) {
	var m Metrics
	var unhealthy bool

	client := &http.Client{Timeout: 5 * time.Second}

	// 1. Health Check Integration
	healthResp, err := client.Get(cfg.HealthURL)
	if err != nil || healthResp.StatusCode != 200 {
		unhealthy = true
		if healthResp != nil {
			healthResp.Body.Close()
		}
	} else {
		healthResp.Body.Close()
	}

	// 2. Metrics Collection
	res, err := client.Get(cfg.MetricsURL)
	if err != nil {
		return m, unhealthy, fmt.Errorf("metrics request failed: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return m, unhealthy, fmt.Errorf("metrics endpoint status %d", res.StatusCode)
	}

	data, _ := io.ReadAll(res.Body)
	text := string(data)

	m.ErrorRate += parse(text, "http_error_rate")
	m.P95 = parse(text, `http_request_duration_seconds{quantile="0.95"}`)
	m.MemoryMB = parse(text, "process_resident_memory_bytes") / 1024 / 1024

	return m, unhealthy, nil
}

func parse(text, key string) float64 {
	lines := strings.Split(text, "\n")

	for _, line := range lines {
		if len(line) == 0 || line[0] == '#' {
			continue
		}

		// rune-based split: find metric name boundary
		nameEnd := -1
		for i, r := range line {
			if r == ' ' || r == '{' {
				nameEnd = i
				break
			}
		}
		if nameEnd == -1 {
			continue
		}

		name := line[:nameEnd]
		if name != key {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}

		v, err := strconv.ParseFloat(parts[len(parts)-1], 64)
		if err == nil {
			return v
		}
	}
	return 0
}

func evaluate(score float64, age int64) Decision {
	status := "OK"
	reason := "within normal range"

	switch {
	case score > 3:
		status = "ROLLBACK_RECOMMENDED"
		reason = "multi-metric anomaly"
	case score > 2:
		status = "CRITICAL"
		reason = "high anomaly score"
	case score > 1:
		status = "ALERT"
		reason = "moderate deviation"
	case score > 0.5:
		status = "WARN"
		reason = "minor deviation"
	}

	conf := score / (score + 2)

	return Decision{
		Status:       status,
		Confidence:   conf,
		Reason:       reason,
		Timestamp:    now(),
		DeployAgeSec: age,
		Version:      "guardian-1.0.0",
	}
}

func write(cfg Config, d Decision) {
	tmp := cfg.OutputFile + ".tmp"

	f, err := os.Create(tmp)
	if err != nil {
		return
	}

	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	if err := enc.Encode(d); err != nil {
		f.Close()
		return
	}

	f.Sync()
	f.Close()
	os.Rename(tmp, cfg.OutputFile)
}

func now() string {
	return time.Now().UTC().Format(time.RFC3339)
}

func deployAge() int64 {
	data, err := os.ReadFile("/var/run/payflux/deploy.json")
	if err != nil {
		return 999999
	}

	var meta struct {
		DeployTime time.Time `json:"deploy_time"`
	}
	if err := json.Unmarshal(data, &meta); err != nil {
		return 999999
	}

	age := time.Since(meta.DeployTime)
	if age < 0 {
		return 0
	}
	return int64(age.Seconds())
}
