package forecast

import "math"

// ComputeAccountForecast projects the future state of an account given its volume history.
// Pure function: no globals, no external state mutability, pure math.
func ComputeAccountForecast(volumeHistory []float64) AccountForecast {
	if len(volumeHistory) == 0 {
		return AccountForecast{}
	}

	s := slope(volumeHistory)
	sd := stddev(volumeHistory)
	lastVol := volumeHistory[len(volumeHistory)-1]

	// Expected volume is simply the last volume projected forward by the slope
	expectedVal := lastVol + s
	if expectedVal < 0 {
		expectedVal = 0
	}

	// Calculate a crude risk probability using the normalized variance mapped to a sigmoid
	risk := sigmoid(sd / (lastVol + 1.0))

	// Confidence is inversely related to the coefficient of variation
	confidence := clamp(1.0-(sd/(expectedVal+1.0)), 0, 1)

	return AccountForecast{
		ExpectedVolume:  expectedVal,
		GrowthTrend:     s,
		RiskProbability: risk,
		Confidence:      confidence,
	}
}

// ComputeProcessorForecasts projects the future state of a processor given its telemetry histories.
// Pure function: no globals, no external state mutability, pure math.
func ComputeProcessorForecasts(latencyHistory, successHistory []float64) ProcessorForecast {
	if len(latencyHistory) == 0 && len(successHistory) == 0 {
		return ProcessorForecast{}
	}

	latSlope := slope(latencyHistory)
	sucSlope := slope(successHistory)

	var lastLat float64
	if len(latencyHistory) > 0 {
		lastLat = latencyHistory[len(latencyHistory)-1]
	}

	var lastSuc float64
	if len(successHistory) > 0 {
		lastSuc = successHistory[len(successHistory)-1]
	}

	expectedLatency := lastLat + latSlope
	if expectedLatency < 0 {
		expectedLatency = 0 // Latency can't be negative
	}

	expectedSuccess := clamp(lastSuc+sucSlope, 0, 1)

	failureTrend := 0.0
	if sucSlope < 0 {
		failureTrend = math.Abs(sucSlope)
	}

	latSd := stddev(latencyHistory)
	sucSd := stddev(successHistory)
	confidence := clamp(1.0-(latSd/(expectedLatency+1.0))-(sucSd), 0, 1)

	return ProcessorForecast{
		ExpectedLatency: expectedLatency,
		ExpectedSuccess: expectedSuccess,
		FailureTrend:    failureTrend,
		Confidence:      confidence,
	}
}

// ComputeSystemReserve projects the required systemic reserve hold by safely aggregating
// expected volumes and worst-case failure trajectories across all processors.
// Pure function: no globals, deterministic output.
func ComputeSystemReserve(accountVol []float64, procSuccess map[string][]float64, procVol map[string][]float64) ReserveProjection {
	if len(accountVol) == 0 {
		return ReserveProjection{}
	}

	volForecast := ComputeAccountForecast(accountVol)
	if volForecast.ExpectedVolume <= 0 {
		return ReserveProjection{}
	}

	var totalSystemProjectedVol float64
	var maxProcessorShock float64
	var weightedShockSum float64

	var maxInstability float64
	var maxVolatility float64
	var globalMaxAcceleration float64

	// Systemic shock is driven by the weakest link processor + volume-weighted average
	for proc, history := range procSuccess {
		if len(history) == 0 {
			continue
		}

		volHistory := procVol[proc]
		if len(volHistory) == 0 {
			continue
		}
		procVolForecast := ComputeAccountForecast(volHistory)

		sucSlope := slope(history)
		volatility := stddev(history) // stddev of success rate represents volatility
		lastSuc := history[len(history)-1]

		failureRate := 1.0 - lastSuc
		if failureRate < 0 {
			failureRate = 0
		}

		accel := acceleration(history)

		// If success is accelerating DOWNWARD, failure is accelerating UPWARD.
		// So we flip the sign of the success acceleration to get failure acceleration.
		failureAccel := -accel

		// Re-use ComputeReserveProjection to get each processor's shock probability and instability
		procRawProj := ComputeReserveProjection(
			procVolForecast.ExpectedVolume,
			failureRate,
			volatility,
			sucSlope,
			failureAccel,
		)

		procShock := procRawProj.ShockProbability

		if procShock > maxProcessorShock {
			maxProcessorShock = procShock
		}
		if procRawProj.InstabilityIndex > maxInstability {
			maxInstability = procRawProj.InstabilityIndex
		}
		if volatility > maxVolatility {
			maxVolatility = volatility
		}
		if procRawProj.Acceleration > globalMaxAcceleration {
			globalMaxAcceleration = procRawProj.Acceleration
		}

		totalSystemProjectedVol += procVolForecast.ExpectedVolume
		weightedShockSum += procShock * procVolForecast.ExpectedVolume
	}

	systemShock := 0.0
	if totalSystemProjectedVol > 0 {
		weightedAverageShock := weightedShockSum / totalSystemProjectedVol
		systemShock = 0.7*weightedAverageShock + 0.3*maxProcessorShock
	}

	// Threshold-based step function for reserve percentage.
	reservePercent := 0.0
	if systemShock > 0.95 {
		reservePercent = 0.20 // 20% hold for critical shock probability
	} else if systemShock > 0.80 {
		reservePercent = 0.10 // 10% hold for high shock probability
	} else if systemShock > 0.60 {
		reservePercent = 0.05 // 5% hold for elevated shock probability
	}

	reserveHold := volForecast.ExpectedVolume * reservePercent

	uncertaintyFactor := clamp(maxVolatility+maxInstability, 0, 1)
	spread := reserveHold * uncertaintyFactor * 0.5

	confidenceLow := clamp(reserveHold-spread, 0, reserveHold)
	confidenceHigh := reserveHold + spread

	return ReserveProjection{
		ShockProbability:       clamp(systemShock, 0, 1),
		ExpectedReservePercent: reservePercent,
		ProjectedReserveHold:   math.Round(reserveHold*100) / 100, // Round to two decimals
		Acceleration:           globalMaxAcceleration,
		InstabilityIndex:       maxInstability,
		ConfidenceLow:          math.Round(confidenceLow*100) / 100,
		ConfidenceHigh:         math.Round(confidenceHigh*100) / 100,
	}
}

// ComputeReserveProjection calculates the expected reserve holding requirements
// based purely on projected systemic shock indicators.
// Pure function: deterministic math over given inputs.
func ComputeReserveProjection(projectedVol, projectedFailureRate, volatility, slope, acceleration float64) ReserveProjection {
	if projectedVol <= 0 {
		return ReserveProjection{}
	}

	// Calculate instability index heavily weighting positive acceleration.
	// Only positive acceleration (worsening velocity of failure/success curves) drives instability up.
	instabilityIndex := 0.0
	if acceleration > 0 {
		instabilityIndex = volatility * acceleration
	}

	// ShockProbability is derived from a sigmoid over a risk index.
	// The risk index gets higher with higher failure rates, volatility, worsening (negative) slopes,
	// and highly weighted instability.
	slopeRisk := 0.0
	if slope < 0 {
		// A negative slope (e.g., success dropping) increases risk index.
		slopeRisk = math.Abs(slope) * 2.0
	}

	// Instability acts as a strong modifier on the risk profile.
	riskIndex := (projectedFailureRate * 5.0) + volatility + slopeRisk + (instabilityIndex * 10.0) - 1.0
	shockProbability := sigmoid(riskIndex)

	// Threshold-based step function for reserve percentage.
	reservePercent := 0.0
	if shockProbability > 0.95 {
		reservePercent = 0.20 // 20% hold for critical shock probability
	} else if shockProbability > 0.80 {
		reservePercent = 0.10 // 10% hold for high shock probability
	} else if shockProbability > 0.60 {
		reservePercent = 0.05 // 5% hold for elevated shock probability
	}

	reserveHold := projectedVol * reservePercent

	uncertaintyFactor := clamp(volatility+instabilityIndex, 0, 1)
	spread := reserveHold * uncertaintyFactor * 0.5

	confidenceLow := clamp(reserveHold-spread, 0, reserveHold)
	confidenceHigh := reserveHold + spread

	return ReserveProjection{
		ShockProbability:       clamp(shockProbability, 0, 1),
		ExpectedReservePercent: reservePercent,
		ProjectedReserveHold:   math.Round(reserveHold*100) / 100, // Round to two decimals
		Acceleration:           acceleration,
		InstabilityIndex:       instabilityIndex,
		ConfidenceLow:          math.Round(confidenceLow*100) / 100,
		ConfidenceHigh:         math.Round(confidenceHigh*100) / 100,
	}
}
