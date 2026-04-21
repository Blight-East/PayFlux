package forecast

import (
	"math"
	"testing"
)

const epsilon = 1e-9

func almostEqual(a, b float64) bool {
	return math.Abs(a-b) <= epsilon
}

func TestMathFunctions(t *testing.T) {
	t.Run("slope", func(t *testing.T) {
		data := []float64{1, 2, 3, 4, 5}
		s := slope(data)
		if !almostEqual(s, 1.0) {
			t.Errorf("expected slope 1.0, got %f", s)
		}

		data2 := []float64{5, 4, 3, 2, 1}
		s2 := slope(data2)
		if !almostEqual(s2, -1.0) {
			t.Errorf("expected slope -1.0, got %f", s2)
		}

		empty := slope([]float64{1})
		if empty != 0 {
			t.Errorf("expected 0 for insufficient data, got %f", empty)
		}
	})

	t.Run("stddev", func(t *testing.T) {
		data := []float64{2, 4, 4, 4, 5, 5, 7, 9}
		sd := stddev(data)
		// Sample stddev for this dataset should be exactly 2.138089935299395
		expected := 2.138089935299395
		if !almostEqual(sd, expected) {
			t.Errorf("expected stddev %f, got %f", expected, sd)
		}
	})

	t.Run("clamp", func(t *testing.T) {
		if v := clamp(5, 0, 10); v != 5 {
			t.Errorf("expected 5, got %v", v)
		}
		if v := clamp(-5, 0, 10); v != 0 {
			t.Errorf("expected 0, got %v", v)
		}
		if v := clamp(15, 0, 10); v != 10 {
			t.Errorf("expected 10, got %v", v)
		}
	})

	t.Run("normalize", func(t *testing.T) {
		if v := normalize(5, 0, 10); !almostEqual(v, 0.5) {
			t.Errorf("expected 0.5, got %v", v)
		}
		if v := normalize(10, 10, 10); v != 0 {
			t.Errorf("expected 0, got %v", v)
		}
	})

	t.Run("sigmoid", func(t *testing.T) {
		if v := sigmoid(0); !almostEqual(v, 0.5) {
			t.Errorf("expected 0.5, got %v", v)
		}
	})
}

func TestForecastComputeAccount(t *testing.T) {
	t.Run("empty history", func(t *testing.T) {
		fc := ComputeAccountForecast(nil)
		if fc.ExpectedVolume != 0 {
			t.Errorf("expected 0, got %v", fc.ExpectedVolume)
		}
	})

	t.Run("consistent growth", func(t *testing.T) {
		history := []float64{100, 110, 120, 130, 140}
		fc := ComputeAccountForecast(history)

		if !almostEqual(fc.GrowthTrend, 10.0) {
			t.Errorf("expected growth 10, got %f", fc.GrowthTrend)
		}
		if !almostEqual(fc.ExpectedVolume, 150.0) {
			t.Errorf("expected volume 150, got %f", fc.ExpectedVolume)
		}
		if fc.Confidence <= 0.8 { // Highly stable dataset, confidence should be high
			t.Errorf("expected high confidence, got %f", fc.Confidence)
		}
	})
}

func TestForecastComputeProcessor(t *testing.T) {
	t.Run("consistent performance", func(t *testing.T) {
		latHistory := []float64{50, 52, 51, 50, 49}
		sucHistory := []float64{0.99, 1.0, 0.99, 0.98, 0.99}

		fc := ComputeProcessorForecasts(latHistory, sucHistory)

		if fc.FailureTrend > 0.01 {
			t.Errorf("expected low failure trend, got %f", fc.FailureTrend)
		}
		if fc.ExpectedLatency > 55 {
			t.Errorf("expected stable latency around 50, got %f", fc.ExpectedLatency)
		}
	})
}

func TestComputeReserveProjection(t *testing.T) {
	t.Run("low risk - no reserve shock", func(t *testing.T) {
		// Low failure rate, low volatility, zero slope
		rp := ComputeReserveProjection(10000.0, 0.01, 0.02, 0.0, 0.0)

		if rp.ExpectedReservePercent != 0.0 {
			t.Errorf("expected 0%% reserve, got %f", rp.ExpectedReservePercent)
		}
		if rp.ProjectedReserveHold != 0.0 {
			t.Errorf("expected 0 hold, got %f", rp.ProjectedReserveHold)
		}
	})

	t.Run("elevated risk - moderate reserve", func(t *testing.T) {
		// Failure rate at 7%, volatility 1.5, slightly negative slope (-0.1)
		// riskIndex = (0.07 * 5.0) + 1.5 + (0.1 * 2.0) - 1.0 = 0.35 + 1.5 + 0.2 - 1.0 = 1.05
		// sigmoid(1.05) ~ 0.74 => > 0.60 => 5%
		rp := ComputeReserveProjection(10000.0, 0.07, 1.5, -0.1, 0.0)

		if rp.ExpectedReservePercent != 0.05 {
			t.Errorf("expected 5%% reserve, got %f", rp.ExpectedReservePercent)
		}
		if rp.ProjectedReserveHold != 500.0 {
			t.Errorf("expected 500 hold, got %f", rp.ProjectedReserveHold)
		}
	})

	t.Run("critical risk - maximum reserve", func(t *testing.T) {
		// High failure rate 25%, volatility 2.5, worsening slope (-0.5)
		// riskIndex = (0.25 * 5.0) + 2.5 + (0.5 * 2.0) - 1.0 = 1.25 + 2.5 + 1.0 - 1.0 = 3.75
		// sigmoid(3.75) ~ 0.97 => > 0.95 => 20%
		rp := ComputeReserveProjection(10000.0, 0.25, 2.5, -0.5, 0.0)

		if rp.ExpectedReservePercent != 0.20 {
			t.Errorf("expected 20%% reserve, got %f", rp.ExpectedReservePercent)
		}
		if rp.ProjectedReserveHold != 2000.0 {
			t.Errorf("expected 2000 hold, got %f", rp.ProjectedReserveHold)
		}
	})

	t.Run("edge cases - zero volume", func(t *testing.T) {
		rp := ComputeReserveProjection(0.0, 1.0, 10.0, -10.0, 0.0)
		if rp.ExpectedReservePercent != 0.0 || rp.ProjectedReserveHold != 0.0 || rp.ShockProbability != 0.0 {
			t.Errorf("expected empty reserve projection for zero volume, got %+v", rp)
		}
	})
}

func TestInstabilityModeling(t *testing.T) {
	t.Run("acceleration math", func(t *testing.T) {
		// Linear velocity (constant slope) => 0 acceleration
		dataLinear := []float64{10, 20, 30, 40, 50}
		accelLinear := acceleration(dataLinear)
		if !almostEqual(accelLinear, 0.0) {
			t.Errorf("expected 0 acceleration for linear data, got %f", accelLinear)
		}

		// Quadratic velocity => positive acceleration
		// 10, 20, 40, 70, 110. Differences: 10, 20, 30, 40. Slope of diffs: 10
		dataQuad := []float64{10, 20, 40, 70, 110}
		accelQuad := acceleration(dataQuad)
		if !almostEqual(accelQuad, 10.0) {
			t.Errorf("expected 10 acceleration for quadratic data, got %f", accelQuad)
		}
	})

	t.Run("zero instability without acceleration", func(t *testing.T) {
		rp := ComputeReserveProjection(10000.0, 0.05, 1.0, -0.1, 0.0)
		if rp.InstabilityIndex != 0.0 {
			t.Errorf("expected 0 instability, got %f", rp.InstabilityIndex)
		}
	})

	t.Run("negative acceleration does not increase instability", func(t *testing.T) {
		rp := ComputeReserveProjection(10000.0, 0.05, 1.0, -0.1, -5.0)
		if rp.InstabilityIndex != 0.0 {
			t.Errorf("expected 0 instability for negative acceleration, got %f", rp.InstabilityIndex)
		}
	})

	t.Run("high instability triggers critical reserve", func(t *testing.T) {
		// Even with moderate failure and slightly negative slope, severe acceleration bumps it.
		// riskIndex: (0.05 * 5) + 1.0 + (0.1 * 2.0) + (1.0 * 2.0 * 10) - 1.0
		// riskIndex: 0.25 + 1.0 + 0.2 + 20.0 - 1.0 = 20.45
		// sigmoid(20.45) ~ 1.0 (> 0.95 => 20% hold)
		rp := ComputeReserveProjection(10000.0, 0.05, 1.0, -0.1, 2.0)

		if !almostEqual(rp.InstabilityIndex, 2.0) {
			t.Errorf("expected instability 2.0, got %f", rp.InstabilityIndex)
		}
		if rp.ExpectedReservePercent != 0.20 {
			t.Errorf("expected 20%% reserve due to shock, got %f", rp.ExpectedReservePercent)
		}
		if rp.ProjectedReserveHold != 2000.0 {
			t.Errorf("expected 2000 hold, got %f", rp.ProjectedReserveHold)
		}
	})
}

func TestConfidenceBands(t *testing.T) {
	t.Run("zero hold implies zero bands", func(t *testing.T) {
		// Low failure rate -> 0% reserve percent -> 0 reserve hold
		rp := ComputeReserveProjection(10000.0, 0.01, 0.02, 0.0, 0.0)
		if rp.ConfidenceLow != 0.0 || rp.ConfidenceHigh != 0.0 {
			t.Errorf("expected 0 value bands for 0 reserve, got [%f, %f]", rp.ConfidenceLow, rp.ConfidenceHigh)
		}
	})

	t.Run("zero uncertainty provides exact projection", func(t *testing.T) {
		// Set high failure rate to trigger reserve, but 0 volatility and 0 acceleration
		// riskIndex = (0.3 * 5.0) + 0 - 1.0 = 0.5. sigmoid(0.5) ~ 0.622 => 5% hold.
		// 10000 * 0.05 = 500. uncertainty = clamp(0 + 0, 0, 1) = 0. spread = 0.
		rp := ComputeReserveProjection(10000.0, 0.3, 0.0, 0.0, 0.0)
		if rp.ExpectedReservePercent != 0.05 {
			t.Fatalf("test condition not met: expected 5%% reserve, got %f", rp.ExpectedReservePercent)
		}
		if rp.ConfidenceLow != 500.0 || rp.ConfidenceHigh != 500.0 {
			t.Errorf("expected bands to match projection [500, 500] for 0 uncertainty, got [%f, %f]",
				rp.ConfidenceLow, rp.ConfidenceHigh)
		}
	})

	t.Run("max uncertainty gives 50 percent spread", func(t *testing.T) {
		// Set volatility to 1.0 to max out uncertaintyFactor = clamp(1.0 + instability, 0, 1) = 1.0
		// Failure rate 0.3, vol 1.0 => riskIndex = (0.3*5) + 1.0 - 1.0 = 1.5. sigmoid(1.5) = 0.817 => > 0.80 => 10% hold.
		// Hold = 10% of 10000 = 1000. Spread = 1000 * 1.0 * 0.5 = 500.
		// ConfidenceLow = 1000 - 500 = 500. ConfidenceHigh = 1000 + 500 = 1500.
		rp := ComputeReserveProjection(10000.0, 0.3, 1.0, 0.0, 0.0)

		if rp.ExpectedReservePercent != 0.10 {
			t.Fatalf("test condition not met: expected 10%% reserve, got %f", rp.ExpectedReservePercent)
		}
		if rp.ConfidenceLow != 500.0 || rp.ConfidenceHigh != 1500.0 {
			t.Errorf("expected [500, 1500] spread for max uncertainty, got [%f, %f]", rp.ConfidenceLow, rp.ConfidenceHigh)
		}
	})

	t.Run("partial uncertainty gives proportional spread", func(t *testing.T) {
		// Volatility = 0.4. Failure rate 0.3 => riskIndex = 1.5 - 1.0 + 0.4 = 0.9. sigmoid(0.9) = 0.71 => >0.6 => 5% hold.
		// Hold = 500. uncertainty = 0.4. spread = 500 * 0.4 * 0.5 = 100.
		// ConfidenceLow = 400. ConfidenceHigh = 600.
		rp := ComputeReserveProjection(10000.0, 0.3, 0.4, 0.0, 0.0)

		if rp.ExpectedReservePercent != 0.05 {
			t.Fatalf("test condition not met: expected 5%% reserve, got %f", rp.ExpectedReservePercent)
		}
		if rp.ConfidenceLow != 400.0 || rp.ConfidenceHigh != 600.0 {
			t.Errorf("expected [400, 600] spread for 0.4 uncertainty, got [%f, %f]", rp.ConfidenceLow, rp.ConfidenceHigh)
		}
	})
}
