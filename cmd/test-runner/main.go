package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"payment-node/internal/testharness"
)

var (
	payfluxURL      = flag.String("url", "http://localhost:8080", "PayFlux base URL")
	apiKey          = flag.String("key", "", "PayFlux API key")
	speedMultiplier = flag.Int("speed", 3600, "Time compression (3600 = 1 hour per second)")
	outputDir       = flag.String("output", "./test-outputs", "Output directory for results")
	dryRun          = flag.Bool("dry-run", false, "Generate events but don't send to PayFlux")
)

var sendBatchFunc = sendBatch

const batchSize = 500

// Helper: Validate flags and create output directory
func setupAndValidate() {
	if *apiKey == "" {
		log.Fatal("API key required: --key=your-api-key")
	}

	// Create output directory
	if err := os.MkdirAll(*outputDir, 0755); err != nil {
		log.Fatalf("Failed to create output directory: %v", err)
	}

	log.Println("=== PayFlux Internal System Test ===")
	log.Printf("PayFlux URL: %s", *payfluxURL)
	log.Printf("Speed multiplier: %dx (1 hour = %.1f seconds)", *speedMultiplier, 3600.0/float64(*speedMultiplier))
	log.Printf("Output directory: %s", *outputDir)
	log.Printf("Dry run: %v", *dryRun)
}

// Helper: Generate and save merchant portfolio
func generateMerchantPortfolio() []*testharness.Merchant {
	log.Println("\n--- Phase 1: Generating Merchant Portfolio ---")
	config := testharness.MerchantConfig{
		NumStable: 8,
		NumGrowth: 7,
		NumMessy:  5,
		Processor: "stripe",
	}
	merchants := testharness.GenerateMerchants(config)
	log.Printf("Generated %d merchants:", len(merchants))
	for _, m := range merchants {
		log.Printf("  %s", m)
	}

	// Save merchant profiles
	if err := saveMerchantProfiles(merchants); err != nil {
		log.Fatalf("Failed to save merchant profiles: %v", err)
	}

	return merchants
}

// Helper: Create and save anomaly schedule
func createAnomalySchedule() *testharness.AnomalySchedule {
	log.Println("\n--- Phase 2: Anomaly Injection Schedule ---")
	schedule := testharness.NewAnomalySchedule()
	schedule.PrintSchedule()

	// Save anomaly schedule
	if err := saveAnomalySchedule(schedule); err != nil {
		log.Fatalf("Failed to save anomaly schedule: %v", err)
	}

	return schedule
}

// Helper: Generate telemetry for all merchants
func generateTelemetry(merchants []*testharness.Merchant, schedule *testharness.AnomalySchedule) [][]*testharness.PaymentEvent {
	log.Println("\n--- Phase 3: Generating Telemetry (14 days) ---")
	baseTime := time.Now().Add(-14 * 24 * time.Hour) // Start 14 days ago
	generator := testharness.NewTelemetryGenerator(baseTime)
	totalHours := 14 * 24 // 336 hours
	allEvents := generator.GenerateAllEvents(merchants, schedule, totalHours)

	totalEvents := testharness.GetEventCount(allEvents)
	log.Printf("Generated %d events across %d hours", totalEvents, totalHours)
	log.Printf("Average: %.0f events/hour", float64(totalEvents)/float64(totalHours))

	// Save sample telemetry
	if err := saveSampleTelemetry(allEvents, merchants); err != nil {
		log.Fatalf("Failed to save sample telemetry: %v", err)
	}

	return allEvents
}

// Helper: Send events to PayFlux with progress tracking
func ingestEvents(allEvents [][]*testharness.PaymentEvent) *IngestionStats {
	log.Println("\n--- Phase 5: Sending Events to PayFlux ---")
	log.Printf("Starting event ingestion (compressed time)...")

	stats := &IngestionStats{
		StartTime: time.Now(),
	}

	totalHours := len(allEvents)
	for hourOffset := 0; hourOffset < totalHours; hourOffset++ {
		hourStart := time.Now()
		events := allEvents[hourOffset]

		processHourEvents(events, stats)
		logIngestionProgress(hourOffset, stats)
		throttleIngestion(hourStart)
	}

	stats.EndTime = time.Now()
	stats.Duration = stats.EndTime.Sub(stats.StartTime)

	return stats
}

func processHourEvents(events []*testharness.PaymentEvent, stats *IngestionStats) {
	for i := 0; i < len(events); i += batchSize {
		end := i + batchSize
		if end > len(events) {
			end = len(events)
		}
		batch := events[i:end]

		if err := sendBatchFunc(batch); err != nil {
			stats.Errors += len(batch)
			if stats.Errors < 100 { // Log first 100 errors
				log.Printf("Error sending batch: %v", err)
			}
		} else {
			stats.Sent += len(batch)
		}
	}
}

func logIngestionProgress(hourOffset int, stats *IngestionStats) {
	if (hourOffset+1)%24 == 0 {
		day := (hourOffset + 1) / 24
		elapsed := time.Since(stats.StartTime)
		log.Printf("Day %d complete: %d events sent, %d errors (%.1fs elapsed)",
			day, stats.Sent, stats.Errors, elapsed.Seconds())
	}
}

func throttleIngestion(hourStart time.Time) {
	hourDuration := time.Duration(3600.0 / float64(*speedMultiplier) * float64(time.Second))
	elapsed := time.Since(hourStart)
	if elapsed < hourDuration {
		time.Sleep(hourDuration - elapsed)
	}
}

// Helper: Print completion summary
func printCompletionSummary(stats *IngestionStats) {
	log.Println("\n=== INGESTION COMPLETE ===")
	log.Printf("Total events sent: %d", stats.Sent)
	log.Printf("Total errors: %d", stats.Errors)
	log.Printf("Duration: %.1fs", stats.Duration.Seconds())
	log.Printf("Throughput: %.0f events/sec", float64(stats.Sent)/stats.Duration.Seconds())

	// Save ingestion stats
	if err := saveIngestionStats(stats); err != nil {
		log.Printf("Warning: Failed to save ingestion stats: %v", err)
	}

	log.Println("\n--- Phase 6: Waiting for Processing ---")
	log.Println("Waiting 30 seconds for PayFlux to process events...")
	time.Sleep(30 * time.Second)

	log.Println("\n=== TEST COMPLETE ===")
	log.Printf("Next steps:")
	log.Printf("1. Check PayFlux export output for Tier 1 and Tier 2 enrichment")
	log.Printf("2. Run analysis tool: go run cmd/test-analysis/main.go")
	log.Printf("3. Review outputs in %s", *outputDir)
}

func main() {
	flag.Parse()

	// Phase 0: Setup and validation
	setupAndValidate()

	// Phase 1: Generate merchant portfolio
	merchants := generateMerchantPortfolio()

	// Phase 2: Create anomaly schedule
	schedule := createAnomalySchedule()

	// Phase 3: Generate telemetry
	allEvents := generateTelemetry(merchants, schedule)

	// Early exit for dry run
	if *dryRun {
		log.Println("\n=== DRY RUN COMPLETE ===")
		log.Printf("Telemetry generated but not sent to PayFlux")
		log.Printf("Check %s for outputs", *outputDir)
		return
	}

	// Phase 4: Verify PayFlux connection
	log.Println("\n--- Phase 4: Verifying PayFlux Connection ---")
	if err := verifyPayFlux(); err != nil {
		log.Fatalf("PayFlux health check failed: %v", err)
	}
	log.Println("✓ PayFlux is healthy")

	// Phase 5: Ingest events
	stats := ingestEvents(allEvents)

	// Phase 6: Completion and summary
	printCompletionSummary(stats)
}

type IngestionStats struct {
	StartTime time.Time
	EndTime   time.Time
	Duration  time.Duration
	Sent      int
	Errors    int
}

func verifyPayFlux() error {
	resp, err := http.Get(*payfluxURL + "/health")
	if err != nil {
		return fmt.Errorf("connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("health check returned %d", resp.StatusCode)
	}

	return nil
}

func sendBatch(batch []*testharness.PaymentEvent) error {
	body, err := json.Marshal(batch)
	if err != nil {
		return fmt.Errorf("marshal failed: %w", err)
	}

	req, err := http.NewRequest("POST", *payfluxURL+"/v1/events/batch", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("request creation failed: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+*apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

func saveMerchantProfiles(merchants []*testharness.Merchant) error {
	f, err := os.Create(*outputDir + "/merchant_profiles.json")
	if err != nil {
		return err
	}
	defer f.Close()

	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	return enc.Encode(merchants)
}

func saveAnomalySchedule(schedule *testharness.AnomalySchedule) error {
	f, err := os.Create(*outputDir + "/anomaly_schedule.json")
	if err != nil {
		return err
	}
	defer f.Close()

	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	return enc.Encode(schedule.Anomalies)
}

func saveSampleTelemetry(allEvents [][]*testharness.PaymentEvent, merchants []*testharness.Merchant) error {
	// Save first 100 events from each archetype as samples
	samples := make(map[string][]*testharness.PaymentEvent)

	for _, m := range merchants {
		samples[m.ID] = make([]*testharness.PaymentEvent, 0, 100)
	}

	count := 0
	for _, hourEvents := range allEvents {
		for _, event := range hourEvents {
			if len(samples[event.MerchantIDHash]) < 100 {
				samples[event.MerchantIDHash] = append(samples[event.MerchantIDHash], event)
				count++
			}
		}
		if count >= len(merchants)*100 {
			break
		}
	}

	// Save samples for first merchant of each archetype
	for _, m := range merchants[:3] { // First stable, growth, messy
		filename := fmt.Sprintf("%s/sample_telemetry_%s.json", *outputDir, m.ID)
		f, err := os.Create(filename)
		if err != nil {
			return err
		}

		enc := json.NewEncoder(f)
		enc.SetIndent("", "  ")
		if err := enc.Encode(samples[m.ID]); err != nil {
			f.Close()
			return err
		}
		f.Close()
	}

	return nil
}

func saveIngestionStats(stats *IngestionStats) error {
	f, err := os.Create(*outputDir + "/ingestion_stats.json")
	if err != nil {
		return err
	}
	defer f.Close()

	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	return enc.Encode(map[string]interface{}{
		"start_time":       stats.StartTime.Format(time.RFC3339),
		"end_time":         stats.EndTime.Format(time.RFC3339),
		"duration_seconds": stats.Duration.Seconds(),
		"events_sent":      stats.Sent,
		"errors":           stats.Errors,
		"throughput_eps":   float64(stats.Sent) / stats.Duration.Seconds(),
	})
}
