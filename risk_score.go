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

	// Trajectory data (computed from sliding window, used for Tier 2 exports)
	TrajectoryMultiplier float64 `json:"-"` // e.g., 3.0 means "3× above baseline"
	TrajectoryDirection  string  `json:"-"` // "accelerating" / "stable" / "decelerating"
	TrajectoryWindowSec  int     `json:"-"` // window size in seconds
	CurrentFailureRate   float64 `json:"-"` // current bucket failure rate
	BaselineFailureRate  float64 `json:"-"` // baseline (other buckets) failure rate
}

// ProcessorMetrics tracks counters for a specific time bucket
type ProcessorMetrics struct {
	TotalEvents int
	Failures    int
	Timeouts    int
	AuthFails   int
	RetrySum    int
	GeoBuckets  map[string]struct{}
	LastUpdate  int64 // Unix timestamp of last update
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

	// nowFunc returns current unix timestamp (useful for testing)
	nowFunc func() int64
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
		nowFunc:       func() int64 { return time.Now().Unix() },
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
	now := s.nowFunc()
	bucketIdx := int((now / int64(s.bucketSizeSec)) % int64(s.numBuckets))

	bucket := &s.history[processor][bucketIdx]

	// If bucket is older than one bucketSizeSec, it's stale (left over from previous window cycle)
	if now-bucket.LastUpdate >= int64(s.bucketSizeSec) {
		bucket.TotalEvents = 0
		bucket.Failures = 0
		bucket.Timeouts = 0
		bucket.AuthFails = 0
		bucket.RetrySum = 0
		bucket.GeoBuckets = make(map[string]struct{})
		bucket.LastUpdate = now
	}

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
	// Cap geo buckets per bucket to avoid unbounded map growth
	if len(bucket.GeoBuckets) < 50 {
		bucket.GeoBuckets[event.GeoBucket] = struct{}{}
	}

	return s.computeScore(processor)
}

type riskStats struct {
	TotalEvents int
	Failures    int
	Timeouts    int
	AuthFails   int
	RetrySum    int
	GeoCount    int
	Geos        map[string]struct{}
}

type riskComponents struct {
	FailRate      float64
	RetryPressure float64
	TimeoutMix    float64
	AuthFailMix   float64
	TrafficSpike  float64
	GeoEntropy    float64
}

func aggregateHistory(hist []ProcessorMetrics) riskStats {
	var stats riskStats
	stats.Geos = make(map[string]struct{})
	for _, b := range hist {
		stats.TotalEvents += b.TotalEvents
		stats.Failures += b.Failures
		stats.Timeouts += b.Timeouts
		stats.AuthFails += b.AuthFails
		stats.RetrySum += b.RetrySum
		for k := range b.GeoBuckets {
			stats.Geos[k] = struct{}{}
		}
	}
	stats.GeoCount = len(stats.Geos)
	return stats
}

func (s *RiskScorer) computeComponentScores(stats riskStats, currentBucket ProcessorMetrics) riskComponents {
	var c riskComponents

	// 1. Failure Rate
	c.FailRate = float64(stats.Failures) / float64(stats.TotalEvents)

	// 2. Retry Pressure
	c.RetryPressure = (float64(stats.RetrySum) / float64(stats.TotalEvents)) / 3.0

	// 3. Timeout Mix
	if stats.Failures > 0 {
		c.TimeoutMix = float64(stats.Timeouts) / float64(stats.Failures)
	}

	// 4. Auth Fail Mix
	if stats.Failures > 0 {
		c.AuthFailMix = float64(stats.AuthFails) / float64(stats.Failures)
	}

	// 5. Traffic Spike
	currentRate := float64(currentBucket.TotalEvents)
	avgOtherRate := 1.0
	otherSum := stats.TotalEvents - currentBucket.TotalEvents
	if s.numBuckets > 1 {
		avgOtherRate = float64(otherSum) / float64(s.numBuckets-1)
	}
	if avgOtherRate < 1 {
		avgOtherRate = 1
	}
	c.TrafficSpike = currentRate / avgOtherRate / 2.0

	// 6. Geo Entropy
	c.GeoEntropy = float64(stats.GeoCount) / 10.0

	return c
}

func calculateWeightedScore(c riskComponents) float64 {
	score := (0.25 * c.FailRate) +
		(0.20 * clamp(c.RetryPressure)) +
		(0.15 * clamp(c.TimeoutMix)) +
		(0.15 * clamp(c.TrafficSpike)) +
		(0.10 * clamp(c.AuthFailMix)) +
		(0.15 * clamp(c.GeoEntropy))
	return clamp(score)
}

func (s *RiskScorer) mapScoreToBand(score float64) string {
	if score >= s.critical {
		return "critical"
	} else if score >= s.high {
		return "high"
	} else if score >= s.elevated {
		return "elevated"
	}
	return "low"
}

func identifyRiskDrivers(c riskComponents) []string {
	drivers := []string{}
	if c.FailRate > 0.4 {
		drivers = append(drivers, "high_failure_rate")
	}
	if c.RetryPressure > 0.5 {
		drivers = append(drivers, "retry_pressure_spike")
	}
	if c.TimeoutMix > 0.5 {
		drivers = append(drivers, "timeout_clustering")
	}
	if c.TrafficSpike > 0.5 {
		drivers = append(drivers, "traffic_volatility")
	}
	if c.AuthFailMix > 0.5 {
		drivers = append(drivers, "auth_failure_cluster")
	}
	if c.GeoEntropy > 0.5 {
		drivers = append(drivers, "geo_entropy_increase")
	}
	if len(drivers) == 0 {
		drivers = append(drivers, "nominal_behavior")
	}
	return drivers
}

func (s *RiskScorer) calculateTrajectory(hist []ProcessorMetrics, currentIdx int) (multiplier float64, direction string, curFR, baseFR float64) {
	currentBucket := hist[currentIdx]
	if currentBucket.TotalEvents > 0 {
		curFR = float64(currentBucket.Failures) / float64(currentBucket.TotalEvents)
	}

	otherFailures, otherEvents := 0, 0
	for i, b := range hist {
		if i != currentIdx {
			otherFailures += b.Failures
			otherEvents += b.TotalEvents
		}
	}

	if otherEvents > 0 {
		baseFR = float64(otherFailures) / float64(otherEvents)
	}

	multiplier = 1.0
	if baseFR > 0.01 {
		multiplier = curFR / baseFR
	} else if curFR > 0.1 {
		multiplier = 10.0
	}
	multiplier = math.Round(multiplier*10) / 10

	direction = "stable"
	if multiplier >= 2.0 {
		direction = "accelerating"
	} else if multiplier <= 0.5 && baseFR > 0.05 {
		direction = "decelerating"
	}

	return multiplier, direction, curFR, baseFR
}

func (s *RiskScorer) computeScore(processor string) RiskResult {
	hist := s.history[processor]
	stats := aggregateHistory(hist)

	if stats.TotalEvents < 5 {
		return RiskResult{Score: 0, Band: "low", Drivers: []string{"insufficient_data"}}
	}

	// Calculate scores and metadata
	now := s.nowFunc()
	currentIdx := int((now / int64(s.bucketSizeSec)) % int64(s.numBuckets))
	components := s.computeComponentScores(stats, hist[currentIdx])
	score := calculateWeightedScore(components)
	multiplier, direction, curFR, baseFR := s.calculateTrajectory(hist, currentIdx)

	return RiskResult{
		Score:                math.Round(score*100) / 100,
		Band:                 s.mapScoreToBand(score),
		Drivers:              identifyRiskDrivers(components),
		TrajectoryMultiplier: multiplier,
		TrajectoryDirection:  direction,
		TrajectoryWindowSec:  s.windowSec,
		CurrentFailureRate:   math.Round(curFR*1000) / 1000,
		BaselineFailureRate:  math.Round(baseFR*1000) / 1000,
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
