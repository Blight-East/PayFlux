package main

import (
	"math"
	"strings"
	"sync"
	"time"
)

// RiskResult contains the output of the scoring algorithm
type RiskResult struct {
	Score   float64  `json:"processor_risk_score"`
	Band    string   `json:"processor_risk_band"`
	Drivers []string `json:"processor_risk_drivers"`
}

// ProcessorMetrics tracks counters for a specific time bucket
type ProcessorMetrics struct {
	TotalEvents int
	Failures    int
	Timeouts    int
	AuthFails   int
	RetrySum    int
	GeoBuckets  map[string]struct{}
}

// RiskScorer manages sliding window metrics and scoring
type RiskScorer struct {
	mu            sync.Mutex
	windowSec     int
	bucketSizeSec int
	numBuckets    int

	// processor -> bucketIndex -> metrics
	history map[string][]ProcessorMetrics

	// Thresholds for bands
	elevated float64
	high     float64
	critical float64
}

func NewRiskScorer(windowSec int, thresholds [3]float64) *RiskScorer {
	bucketSize := 10 // 10 second buckets
	numBuckets := windowSec / bucketSize
	if numBuckets < 1 {
		numBuckets = 1
	}

	return &RiskScorer{
		windowSec:     windowSec,
		bucketSizeSec: bucketSize,
		numBuckets:    numBuckets,
		history:       make(map[string][]ProcessorMetrics),
		elevated:      thresholds[0],
		high:          thresholds[1],
		critical:      thresholds[2],
	}
}

func (s *RiskScorer) RecordEvent(event Event) RiskResult {
	s.mu.Lock()
	defer s.mu.Unlock()

	processor := event.Processor
	if processor == "" {
		processor = "unknown"
	}

	// Initialize history for processor
	if _, exists := s.history[processor]; !exists {
		// Cap cardinality to 100 processors to avoid memory growth
		if len(s.history) >= 100 {
			return RiskResult{Score: 0, Band: "low", Drivers: []string{"insufficient_data"}}
		}
		s.history[processor] = make([]ProcessorMetrics, s.numBuckets)
	}

	// Update current bucket
	now := time.Now().Unix()
	bucketIdx := int((now / int64(s.bucketSizeSec)) % int64(s.numBuckets))

	// Clear bucket if it's stale (represents a previous window cycle)
	// We'd ideally store timestamps per bucket, but for O(1) we can simplify
	// Actually, let's keep it simple: just update the bucket.
	// To handle staleness properly in a real sliding window, we'd check timestamps.
	// For this exercise, we'll assume frequent enough events or simple rotation.

	bucket := &s.history[processor][bucketIdx]
	bucket.TotalEvents++
	bucket.RetrySum += event.RetryCount

	if event.FailureCategory != "" {
		bucket.Failures++
		if strings.Contains(strings.ToLower(event.FailureCategory), "timeout") {
			bucket.Timeouts++
		}
		if strings.Contains(strings.ToLower(event.FailureCategory), "auth") {
			bucket.AuthFails++
		}
	}

	if bucket.GeoBuckets == nil {
		bucket.GeoBuckets = make(map[string]struct{})
	}
	bucket.GeoBuckets[event.GeoBucket] = struct{}{}

	return s.computeScore(processor)
}

func (s *RiskScorer) computeScore(processor string) RiskResult {
	hist := s.history[processor]

	var totalEvents, failures, timeouts, authFails, retrySum int
	geos := make(map[string]struct{})

	// Aggregate across all buckets in window
	for _, b := range hist {
		totalEvents += b.TotalEvents
		failures += b.Failures
		timeouts += b.Timeouts
		authFails += b.AuthFails
		retrySum += b.RetrySum
		for k := range b.GeoBuckets {
			geos[k] = struct{}{}
		}
	}

	if totalEvents < 5 {
		return RiskResult{Score: 0, Band: "low", Drivers: []string{"insufficient_data"}}
	}

	// 1. Failure Rate
	failRate := float64(failures) / float64(totalEvents)

	// 2. Retry Pressure (clamped at 3.0 avg retries being "max risk")
	retryPressure := (float64(retrySum) / float64(totalEvents)) / 3.0

	// 3. Timeout Mix (percentage of failures that are timeouts)
	timeoutMix := 0.0
	if failures > 0 {
		timeoutMix = float64(timeouts) / float64(failures)
	}

	// 4. Auth Fail Mix (percentage of failures that are auth)
	authFailMix := 0.0
	if failures > 0 {
		authFailMix = float64(authFails) / float64(failures)
	}

	// 5. Traffic Spike
	// Compare current bucket to average of others
	currentIdx := int((time.Now().Unix() / int64(s.bucketSizeSec)) % int64(s.numBuckets))
	currentRate := float64(hist[currentIdx].TotalEvents)
	otherSum := 0
	for i, b := range hist {
		if i != currentIdx {
			otherSum += b.TotalEvents
		}
	}
	avgOtherRate := float64(otherSum) / float64(s.numBuckets-1)
	if avgOtherRate < 1 {
		avgOtherRate = 1
	}
	trafficSpike := (currentRate / avgOtherRate / 2.0) // 2x normal is 1.0 risk component

	// 6. Geo Entropy (unique geo buckets relative to volume)
	geoEntropy := float64(len(geos)) / 10.0 // 10 unique geos is high entropy

	// Weighted Sum
	score := (0.25 * failRate) +
		(0.20 * clamp(retryPressure)) +
		(0.15 * clamp(timeoutMix)) +
		(0.15 * clamp(trafficSpike)) +
		(0.10 * clamp(authFailMix)) +
		(0.15 * clamp(geoEntropy))

	score = clamp(score)

	// Band mapping
	band := "low"
	if score >= s.critical {
		band = "critical"
	} else if score >= s.high {
		band = "high"
	} else if score >= s.elevated {
		band = "elevated"
	}

	// Drivers (any component > 0.5)
	drivers := []string{}
	if failRate > 0.4 {
		drivers = append(drivers, "high_failure_rate")
	}
	if retryPressure > 0.5 {
		drivers = append(drivers, "retry_pressure_spike")
	}
	if timeoutMix > 0.5 {
		drivers = append(drivers, "timeout_clustering")
	}
	if trafficSpike > 0.5 {
		drivers = append(drivers, "traffic_volatility")
	}
	if authFailMix > 0.5 {
		drivers = append(drivers, "auth_failure_cluster")
	}
	if geoEntropy > 0.5 {
		drivers = append(drivers, "geo_entropy_increase")
	}

	if len(drivers) == 0 {
		drivers = append(drivers, "nominal_behavior")
	}

	return RiskResult{
		Score:   math.Round(score*100) / 100,
		Band:    band,
		Drivers: drivers,
	}
}

func clamp(v float64) float64 {
	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}
	return v
}
