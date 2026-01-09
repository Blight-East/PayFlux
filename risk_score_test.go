package main

import (
	"testing"
)

func TestRiskScorer_Deterministic(t *testing.T) {
	thresholds := [3]float64{0.3, 0.6, 0.8}
	scorer := NewRiskScorer(300, thresholds)

	// 1. Nominal traffic
	for i := 0; i < 10; i++ {
		scorer.RecordEvent(Event{Processor: "stripe", GeoBucket: "US"})
	}
	res := scorer.computeScore("stripe")
	if res.Band != "low" {
		t.Errorf("expected low band for nominal traffic, got %s", res.Band)
	}

	// 2. Failure spike
	for i := 0; i < 20; i++ {
		scorer.RecordEvent(Event{
			Processor:       "stripe",
			FailureCategory: "processor_timeout",
			RetryCount:      5,
			GeoBucket:       "EU",
		})
	}
	res = scorer.computeScore("stripe")
	if res.Score < 0.6 {
		t.Errorf("expected high score (>0.6) for failure spike, got %f", res.Score)
	}
	if res.Band != "high" && res.Band != "critical" {
		t.Errorf("expected high/critical band, got %s", res.Band)
	}

	foundTimeout := false
	for _, d := range res.Drivers {
		if d == "timeout_clustering" {
			foundTimeout = true
			break
		}
	}
	if !foundTimeout {
		t.Error("expected 'timeout_clustering' driver to be present")
	}
}

func TestRiskScorer_InsufficientData(t *testing.T) {
	scorer := NewRiskScorer(300, [3]float64{0.3, 0.6, 0.8})
	res := scorer.RecordEvent(Event{Processor: "stripe"})
	if res.Drivers[0] != "insufficient_data" {
		t.Errorf("expected insufficient_data for <5 events, got %v", res.Drivers)
	}
}

func TestRiskScorer_EnrichmentInExport(t *testing.T) {
	// Mock risk scorer
	riskScoreEnabled = true
	riskScorer = NewRiskScorer(300, [3]float64{0.3, 0.6, 0.8})

	// Inject 10 events to ensure we have data
	for i := 0; i < 10; i++ {
		exportEvent(Event{Processor: "stripe", EventID: "550e8400-e29b-41d4-a716-446655440000"}, "msg-1")
	}
}
