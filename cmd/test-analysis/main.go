package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"
)

var (
	exportFile = flag.String("export", "", "Path to PayFlux export file (stdout capture)")
	outputDir  = flag.String("output", "./test-outputs", "Output directory for analysis results")
)

// ExportedEvent represents a PayFlux export (Tier 1 or Tier 2)
type ExportedEvent struct {
	EventID              string   `json:"event_id"`
	EventType            string   `json:"event_type"`
	EventTimestamp       string   `json:"event_timestamp"`
	Processor            string   `json:"processor"`
	MerchantIDHash       string   `json:"merchant_id_hash"`
	ProcessorRiskScore   float64  `json:"processor_risk_score"`
	ProcessorRiskBand    string   `json:"processor_risk_band"`
	ProcessorRiskDrivers []string `json:"processor_risk_drivers"`

	// Tier 2 fields
	ProcessorPlaybookContext string `json:"processor_playbook_context,omitempty"`
	RiskTrajectory           string `json:"risk_trajectory,omitempty"`

	// Metadata
	ProcessedAt string `json:"processed_at"`
}

type AnalysisReport struct {
	TotalEvents           int
	Tier1Events           int
	Tier2Events           int
	RiskBandDistribution  map[string]int
	MerchantStats         map[string]*MerchantAnalysis
	InterpretationTests   []*InterpretationTest
	ArtifactQualityIssues []string
	HistoricalMemoryTests []*HistoricalMemoryTest
	Summary               string
}

type MerchantAnalysis struct {
	MerchantID       string
	TotalEvents      int
	RiskDistribution map[string]int
	AvgRiskScore     float64
	Tier2Count       int
}

type InterpretationTest struct {
	Anomaly         string
	Merchants       []string
	Interpretations map[string]string // merchantID -> context
	Differentiated  bool
	FailureReason   string
}

type HistoricalMemoryTest struct {
	MerchantID     string
	Day3Event      *ExportedEvent
	Day9Event      *ExportedEvent
	MemoryDetected bool
	FailureReason  string
}

func main() {
	flag.Parse()

	if *exportFile == "" {
		log.Fatal("Export file required: --export=/path/to/export.jsonl")
	}

	log.Println("=== PayFlux Export Analysis ===")
	log.Printf("Export file: %s", *exportFile)
	log.Printf("Output directory: %s", *outputDir)

	// Parse export file
	log.Println("\n--- Parsing Export File ---")
	events, err := parseExportFile(*exportFile)
	if err != nil {
		log.Fatalf("Failed to parse export file: %v", err)
	}
	log.Printf("Parsed %d exported events", len(events))

	// Initialize report
	report := &AnalysisReport{
		TotalEvents:          len(events),
		RiskBandDistribution: make(map[string]int),
		MerchantStats:        make(map[string]*MerchantAnalysis),
	}

	// Analyze events
	log.Println("\n--- Analyzing Events ---")
	for _, event := range events {
		// Count tier
		if event.ProcessorPlaybookContext != "" || event.RiskTrajectory != "" {
			report.Tier2Events++
		} else {
			report.Tier1Events++
		}

		// Risk band distribution
		report.RiskBandDistribution[event.ProcessorRiskBand]++

		// Merchant stats
		if _, exists := report.MerchantStats[event.MerchantIDHash]; !exists {
			report.MerchantStats[event.MerchantIDHash] = &MerchantAnalysis{
				MerchantID:       event.MerchantIDHash,
				RiskDistribution: make(map[string]int),
			}
		}
		stats := report.MerchantStats[event.MerchantIDHash]
		stats.TotalEvents++
		stats.RiskDistribution[event.ProcessorRiskBand]++
		stats.AvgRiskScore += event.ProcessorRiskScore
		if event.ProcessorPlaybookContext != "" {
			stats.Tier2Count++
		}
	}

	// Finalize merchant stats
	for _, stats := range report.MerchantStats {
		if stats.TotalEvents > 0 {
			stats.AvgRiskScore /= float64(stats.TotalEvents)
		}
	}

	log.Printf("Tier 1 events: %d", report.Tier1Events)
	log.Printf("Tier 2 events: %d", report.Tier2Events)
	log.Printf("Risk band distribution: %v", report.RiskBandDistribution)

	// Phase 4: Interpretation Consistency Test
	log.Println("\n--- Phase 4: Interpretation Consistency Test ---")
	report.InterpretationTests = testInterpretationConsistency(events)
	for _, test := range report.InterpretationTests {
		if test.Differentiated {
			log.Printf("✓ PASS: %s - Interpretations are differentiated", test.Anomaly)
		} else {
			log.Printf("✗ FAIL: %s - %s", test.Anomaly, test.FailureReason)
		}
	}

	// Phase 5: Artifact Quality Test
	log.Println("\n--- Phase 5: Artifact Quality Test ---")
	report.ArtifactQualityIssues = testArtifactQuality(events)
	if len(report.ArtifactQualityIssues) == 0 {
		log.Println("✓ PASS: All artifacts meet quality standards")
	} else {
		log.Printf("✗ FAIL: Found %d artifact quality issues:", len(report.ArtifactQualityIssues))
		for _, issue := range report.ArtifactQualityIssues {
			log.Printf("  - %s", issue)
		}
	}

	// Phase 6: Historical Memory Test
	log.Println("\n--- Phase 6: Historical Memory Test ---")
	report.HistoricalMemoryTests = testHistoricalMemory(events)
	for _, test := range report.HistoricalMemoryTests {
		if test.MemoryDetected {
			log.Printf("✓ PASS: %s - Historical context detected", test.MerchantID)
		} else {
			log.Printf("✗ FAIL: %s - %s", test.MerchantID, test.FailureReason)
		}
	}

	// Generate summary
	report.Summary = generateSummary(report)

	// Save report
	log.Println("\n--- Saving Analysis Report ---")
	if err := saveReport(report); err != nil {
		log.Fatalf("Failed to save report: %v", err)
	}

	log.Println("\n=== ANALYSIS COMPLETE ===")
	log.Printf("Report saved to %s/analysis_report.json", *outputDir)
	log.Println("\nSummary:")
	log.Println(report.Summary)
}

func parseExportFile(path string) ([]*ExportedEvent, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	events := make([]*ExportedEvent, 0)
	scanner := bufio.NewScanner(f)

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}

		var event ExportedEvent
		if err := json.Unmarshal([]byte(line), &event); err != nil {
			// Skip non-JSON lines (e.g., log messages)
			continue
		}

		events = append(events, &event)
	}

	return events, scanner.Err()
}

// Helper: Check if merchant is in the test set
func isMerchantInTestSet(merchantID string, merchants []string) bool {
	for _, m := range merchants {
		if merchantID == m {
			return true
		}
	}
	return false
}

// Helper: Check if interpretations are differentiated
func validateInterpretations(interpretations map[string]string) (bool, string) {
	if len(interpretations) < 2 {
		return false, "Insufficient data (need at least 2 merchants with Tier 2 output)"
	}

	// Check if all interpretations are identical
	unique := make(map[string]bool)
	for _, interp := range interpretations {
		unique[interp] = true
	}

	if len(unique) == 1 {
		return false, "All interpretations are identical (templated output)"
	}

	return true, ""
}

// Helper: Process event and extract interpretation if applicable
func processEventForInterpretation(event *ExportedEvent, test *InterpretationTest) {
	// Skip Tier 1 events
	if event.ProcessorPlaybookContext == "" {
		return
	}

	// Skip if merchant not in test set
	if !isMerchantInTestSet(event.MerchantIDHash, test.Merchants) {
		return
	}

	// Validate timestamp (skip if invalid)
	_, err := time.Parse(time.RFC3339, event.EventTimestamp)
	if err != nil {
		return
	}

	// Store interpretation if not already present
	if _, exists := test.Interpretations[event.MerchantIDHash]; !exists {
		test.Interpretations[event.MerchantIDHash] = event.ProcessorPlaybookContext
	}
}

func testInterpretationConsistency(events []*ExportedEvent) []*InterpretationTest {
	// Test: Day 3 retry spike across merchant_stable_001, merchant_growth_003, merchant_messy_001
	test := &InterpretationTest{
		Anomaly:         "retry_spike_day3",
		Merchants:       []string{"merchant_stable_001", "merchant_growth_003", "merchant_messy_001"},
		Interpretations: make(map[string]string),
	}

	// Find events from Day 3 for these merchants
	for _, event := range events {
		processEventForInterpretation(event, test)
	}

	// Validate interpretations
	differentiated, failureReason := validateInterpretations(test.Interpretations)
	test.Differentiated = differentiated
	test.FailureReason = failureReason

	return []*InterpretationTest{test}
}

func testArtifactQuality(events []*ExportedEvent) []string {
	issues := make([]string, 0)

	// Forbidden phrases (outcome guarantees, insider knowledge)
	forbiddenPhrases := []string{
		"will be throttled",
		"will be rate limited",
		"guaranteed",
		"insider",
		"stripe requires",
		"stripe's internal threshold",
		"processor rule",
		"must",
		"you should",
		"recommend",
	}

	for _, event := range events {
		if event.ProcessorPlaybookContext == "" {
			continue // Skip Tier 1
		}

		context := strings.ToLower(event.ProcessorPlaybookContext)

		// Check for forbidden phrases
		for _, phrase := range forbiddenPhrases {
			if strings.Contains(context, phrase) {
				issues = append(issues, fmt.Sprintf("Event %s contains forbidden phrase: '%s'",
					event.EventID, phrase))
			}
		}

		// Check for probabilistic language (should contain "typically", "commonly", "often", etc.)
		hasProbabilistic := strings.Contains(context, "typically") ||
			strings.Contains(context, "commonly") ||
			strings.Contains(context, "often") ||
			strings.Contains(context, "may") ||
			strings.Contains(context, "generally")

		if !hasProbabilistic && len(context) > 50 {
			issues = append(issues, fmt.Sprintf("Event %s lacks probabilistic language",
				event.EventID))
		}
	}

	return issues
}

func testHistoricalMemory(events []*ExportedEvent) []*HistoricalMemoryTest {
	// Test: merchant_growth_003 has anomalies on Day 3 and Day 9
	test := &HistoricalMemoryTest{
		MerchantID: "merchant_growth_003",
	}

	// Find events from Day 3 and Day 9
	for _, event := range events {
		if event.MerchantIDHash != test.MerchantID {
			continue
		}

		eventTime, err := time.Parse(time.RFC3339, event.EventTimestamp)
		if err != nil {
			continue
		}

		// Day 3: hours 72-95
		// Day 9: hours 216-239
		// (Simplified: just check if we have elevated+ events from both periods)

		if event.ProcessorRiskBand == "elevated" || event.ProcessorRiskBand == "high" || event.ProcessorRiskBand == "critical" {
			if test.Day3Event == nil {
				test.Day3Event = event
			} else if test.Day9Event == nil && eventTime.After(mustParse(test.Day3Event.EventTimestamp).Add(5*24*time.Hour)) {
				test.Day9Event = event
			}
		}
	}

	// Check if Day 9 event references earlier context
	if test.Day9Event != nil && test.Day9Event.ProcessorPlaybookContext != "" {
		// Simple heuristic: does it mention "earlier", "previous", "prior", "history"?
		context := strings.ToLower(test.Day9Event.ProcessorPlaybookContext)
		if strings.Contains(context, "earlier") ||
			strings.Contains(context, "previous") ||
			strings.Contains(context, "prior") ||
			strings.Contains(context, "history") ||
			strings.Contains(context, "recurring") {
			test.MemoryDetected = true
		} else {
			test.MemoryDetected = false
			test.FailureReason = "Day 9 interpretation does not reference earlier context"
		}
	} else {
		test.MemoryDetected = false
		test.FailureReason = "Insufficient data (need elevated+ events on both Day 3 and Day 9)"
	}

	return []*HistoricalMemoryTest{test}
}

func generateSummary(report *AnalysisReport) string {
	var sb strings.Builder

	sb.WriteString("PayFlux Internal System Test - Analysis Summary\n")
	sb.WriteString("================================================\n\n")

	sb.WriteString(fmt.Sprintf("Total Events Analyzed: %d\n", report.TotalEvents))
	sb.WriteString(fmt.Sprintf("Tier 1 Events: %d (%.1f%%)\n", report.Tier1Events,
		float64(report.Tier1Events)/float64(report.TotalEvents)*100))
	sb.WriteString(fmt.Sprintf("Tier 2 Events: %d (%.1f%%)\n\n", report.Tier2Events,
		float64(report.Tier2Events)/float64(report.TotalEvents)*100))

	sb.WriteString("Risk Band Distribution:\n")
	for band, count := range report.RiskBandDistribution {
		sb.WriteString(fmt.Sprintf("  %s: %d\n", band, count))
	}
	sb.WriteString("\n")

	// Interpretation tests
	passedInterp := 0
	for _, test := range report.InterpretationTests {
		if test.Differentiated {
			passedInterp++
		}
	}
	sb.WriteString(fmt.Sprintf("Interpretation Consistency: %d/%d tests passed\n",
		passedInterp, len(report.InterpretationTests)))

	// Artifact quality
	if len(report.ArtifactQualityIssues) == 0 {
		sb.WriteString("Artifact Quality: PASS (no issues found)\n")
	} else {
		sb.WriteString(fmt.Sprintf("Artifact Quality: FAIL (%d issues found)\n",
			len(report.ArtifactQualityIssues)))
	}

	// Historical memory
	passedMemory := 0
	for _, test := range report.HistoricalMemoryTests {
		if test.MemoryDetected {
			passedMemory++
		}
	}
	sb.WriteString(fmt.Sprintf("Historical Memory: %d/%d tests passed\n",
		passedMemory, len(report.HistoricalMemoryTests)))

	return sb.String()
}

func saveReport(report *AnalysisReport) error {
	// Create output directory
	if err := os.MkdirAll(*outputDir, 0755); err != nil {
		return err
	}

	// Save JSON report
	f, err := os.Create(*outputDir + "/analysis_report.json")
	if err != nil {
		return err
	}
	defer f.Close()

	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	if err := enc.Encode(report); err != nil {
		return err
	}

	// Save text summary
	summaryFile, err := os.Create(*outputDir + "/analysis_summary.txt")
	if err != nil {
		return err
	}
	defer summaryFile.Close()

	_, err = summaryFile.WriteString(report.Summary)
	return err
}

func mustParse(ts string) time.Time {
	t, _ := time.Parse(time.RFC3339, ts)
	return t
}
