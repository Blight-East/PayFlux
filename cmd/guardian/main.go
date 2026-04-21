package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"payment-node/internal/runtime/guardian"
)

func main() {
	replay := flag.String("replay", "", "path to trace file for deterministic replay")
	flag.Parse()

	// Replay mode: print trace entries and exit
	if *replay != "" {
		entries, err := guardian.ReplayFile(*replay)
		if err != nil {
			log.Fatalf("replay failed: %v", err)
		}
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		for _, e := range entries {
			enc.Encode(e)
		}
		return
	}

	cfg := guardian.Config{
		MetricsURL:   "http://localhost:8080/metrics",
		HealthURL:    "http://localhost:8080/health",
		OutputFile:   "/tmp/payflux.guardian.json",
		BaselinePath: os.Getenv("GUARDIAN_BASELINE_PATH"),
		TimelinePath: os.Getenv("GUARDIAN_TIMELINE_PATH"),
		TracePath:    os.Getenv("GUARDIAN_TRACE_PATH"),
		Interval:     15 * time.Second,
	}

	if cfg.BaselinePath == "" {
		cfg.BaselinePath = "/var/run/payflux/baseline.json"
	}
	if cfg.TimelinePath == "" {
		cfg.TimelinePath = "/var/run/payflux/timeline.json"
	}
	if cfg.TracePath == "" {
		cfg.TracePath = "/var/run/payflux/trace.json"
	}
	if s := os.Getenv("GUARDIAN_TIMELINE_SIZE"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 {
			cfg.TimelineSize = n
		}
	}
	if s := os.Getenv("GUARDIAN_TRACE_SIZE"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 {
			cfg.TraceSize = n
		}
	}

	fmt.Println("guardian observer started")

	if err := guardian.Run(cfg); err != nil {
		log.Fatal(err)
	}
}
