package main

import (
	"io"
	"os"
	"strings"
	"testing"
)

func TestExportEvent_StdoutModeDoesNotPanic(t *testing.T) {
	origExporterInstance := exporterInstance
	origConsumerName := consumerNameGlobal
	origExportMode := exportMode
	origExportWriter := exportWriter
	origExportFile := exportFile
	origRiskScoreEnabled := riskScoreEnabled
	origRiskScorer := riskScorer
	origExportTier := exportTier
	origTier2Enabled := tier2Enabled
	origPilotModeEnabled := pilotModeEnabled
	origWarningsEnabled := warningsEnabled
	origWarningStore := warningStore
	origStdout := os.Stdout

	t.Cleanup(func() {
		exporterInstance = origExporterInstance
		consumerNameGlobal = origConsumerName
		exportMode = origExportMode
		exportWriter = origExportWriter
		exportFile = origExportFile
		riskScoreEnabled = origRiskScoreEnabled
		riskScorer = origRiskScorer
		exportTier = origExportTier
		tier2Enabled = origTier2Enabled
		pilotModeEnabled = origPilotModeEnabled
		warningsEnabled = origWarningsEnabled
		warningStore = origWarningStore
		os.Stdout = origStdout
	})

	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("failed to create stdout pipe: %v", err)
	}
	os.Stdout = w

	consumerNameGlobal = "test-consumer"
	exportMode = "stdout"
	exportWriter = nil
	exportFile = nil
	riskScoreEnabled = false
	riskScorer = nil
	exportTier = "tier1"
	tier2Enabled = true
	pilotModeEnabled = false
	warningsEnabled = false
	warningStore = nil

	exporterInstance = buildExporter()

	event := Event{
		EventType:           "payment_failed",
		EventTimestamp:      "2026-04-08T00:00:00Z",
		EventID:             "550e8400-e29b-41d4-a716-446655440000",
		Processor:           "stripe",
		MerchantIDHash:      "abc123",
		PaymentIntentIDHash: "pi_abc",
		FailureCategory:     "card_declined",
		RetryCount:          0,
		GeoBucket:           "US",
	}

	if err := exportEvent(event, "1-0"); err != nil {
		t.Fatalf("exportEvent returned unexpected error in stdout mode: %v", err)
	}

	if err := w.Close(); err != nil {
		t.Fatalf("failed to close stdout writer: %v", err)
	}

	output, err := io.ReadAll(r)
	if err != nil {
		t.Fatalf("failed to read stdout capture: %v", err)
	}

	if !strings.Contains(string(output), `"event_id":"550e8400-e29b-41d4-a716-446655440000"`) {
		t.Fatalf("stdout export missing event payload: %s", string(output))
	}
}
