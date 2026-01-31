package main

import (
	"math"
	"reflect"
	"testing"
)

const floatTolerance = 0.001

func TestRiskScorer_ScoringLogic_Deterministic(t *testing.T) {
	thresholds := [3]float64{0.3, 0.6, 0.8}

	// fixedNow is chosen to be a multiple of bucketSize and numBuckets
	// to ensure a stable currentIdx across tests.
	fixedNow := int64(1000000200)

	tests := []struct {
		name      string
		windowSec int
		setup     func(s *RiskScorer, currentIdx int)
		want      RiskResult
	}{
		{
			name:      "Insufficient Data (< 5 events)",
			windowSec: 300,
			setup: func(s *RiskScorer, currentIdx int) {
				s.history["stripe"] = []ProcessorMetrics{
					{TotalEvents: 4},
				}
			},
			want: RiskResult{
				Score:   0,
				Band:    "low",
				Drivers: []string{"insufficient_data"},
			},
		},
		{
			name:      "Nominal Traffic (Health Baseline)",
			windowSec: 300,
			setup: func(s *RiskScorer, currentIdx int) {
				s.history["stripe"] = make([]ProcessorMetrics, s.numBuckets)
				s.history["stripe"][currentIdx] = ProcessorMetrics{TotalEvents: 5, LastUpdate: fixedNow}

				// Baseline: 4 other buckets with 10 events each
				for i := 1; i < 5; i++ {
					idx := (currentIdx + i) % s.numBuckets
					s.history["stripe"][idx] = ProcessorMetrics{TotalEvents: 10, LastUpdate: fixedNow - int64(i*10)}
				}
			},
			want: RiskResult{
				Score:                0.15,
				Band:                 "low",
				Drivers:              []string{"traffic_volatility"},
				TrajectoryMultiplier: 1.0,
				TrajectoryDirection:  "stable",
				TrajectoryWindowSec:  300,
				CurrentFailureRate:   0.0,
				BaselineFailureRate:  0.0,
			},
		},
		{
			name:      "High Risk (Multi-Driver Failure Spike)",
			windowSec: 300,
			setup: func(s *RiskScorer, currentIdx int) {
				s.history["stripe"] = make([]ProcessorMetrics, s.numBuckets)
				// Current bucket: 20 events, 10 fails, 5 timeouts, 40 retries, 2 geos
				s.history["stripe"][currentIdx] = ProcessorMetrics{
					TotalEvents: 20,
					Failures:    10,
					Timeouts:    5,
					RetrySum:    40,
					GeoBuckets:  map[string]struct{}{"US": {}, "CA": {}},
					LastUpdate:  fixedNow,
				}
				// Baseline: 4 buckets with 20 events, 2 failures each
				for i := 1; i < 5; i++ {
					idx := (currentIdx + i) % s.numBuckets
					s.history["stripe"][idx] = ProcessorMetrics{
						TotalEvents: 20,
						Failures:    2,
						LastUpdate:  fixedNow - int64(i*10),
					}
				}
			},
			want: RiskResult{
				Score:                0.29,
				Band:                 "low",
				Drivers:              []string{"traffic_volatility"},
				TrajectoryMultiplier: 5.0,
				TrajectoryDirection:  "accelerating",
				TrajectoryWindowSec:  300,
				CurrentFailureRate:   0.5,
				BaselineFailureRate:  0.1,
			},
		},
		{
			name:      "Empty Window Edge Case",
			windowSec: 300,
			setup: func(s *RiskScorer, currentIdx int) {
				s.history["stripe"] = make([]ProcessorMetrics, s.numBuckets)
			},
			want: RiskResult{
				Score:   0,
				Band:    "low",
				Drivers: []string{"insufficient_data"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := NewRiskScorer(tt.windowSec, thresholds)
			s.nowFunc = func() int64 { return fixedNow }

			currentIdx := int((fixedNow / int64(s.bucketSizeSec)) % int64(s.numBuckets))

			if tt.setup != nil {
				tt.setup(s, currentIdx)
			}

			got := s.computeScore("stripe")

			// Structural comparison with float tolerance
			if math.Abs(got.Score-tt.want.Score) > floatTolerance {
				t.Errorf("%s: Score mismatch: got %f, want %f", tt.name, got.Score, tt.want.Score)
			}
			if got.Band != tt.want.Band {
				t.Errorf("%s: Band mismatch: got %s, want %s", tt.name, got.Band, tt.want.Band)
			}
			// Exact match for Drivers to ensure zero behavior change in ordering or list
			if !reflect.DeepEqual(got.Drivers, tt.want.Drivers) {
				t.Errorf("%s: Drivers mismatch: got %v, want %v", tt.name, got.Drivers, tt.want.Drivers)
			}
			if math.Abs(got.TrajectoryMultiplier-tt.want.TrajectoryMultiplier) > floatTolerance {
				t.Errorf("%s: Multiplier mismatch: got %f, want %f", tt.name, got.TrajectoryMultiplier, tt.want.TrajectoryMultiplier)
			}
			if got.TrajectoryDirection != tt.want.TrajectoryDirection {
				t.Errorf("%s: Direction mismatch: got %s, want %s", tt.name, got.TrajectoryDirection, tt.want.TrajectoryDirection)
			}
			if got.TrajectoryWindowSec != tt.want.TrajectoryWindowSec {
				t.Errorf("%s: Window mismatch: got %d, want %d", tt.name, got.TrajectoryWindowSec, tt.want.TrajectoryWindowSec)
			}
			if math.Abs(got.CurrentFailureRate-tt.want.CurrentFailureRate) > floatTolerance {
				t.Errorf("%s: CurrentFR mismatch: got %f, want %f", tt.name, got.CurrentFailureRate, tt.want.CurrentFailureRate)
			}
			if math.Abs(got.BaselineFailureRate-tt.want.BaselineFailureRate) > floatTolerance {
				t.Errorf("%s: BaselineFR mismatch: got %f, want %f", tt.name, got.BaselineFailureRate, tt.want.BaselineFailureRate)
			}
		})
	}
}
