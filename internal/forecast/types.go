package forecast

// AccountForecast represents a purely mathematical projection of an account's metrics.
type AccountForecast struct {
	ExpectedVolume  float64
	GrowthTrend     float64
	RiskProbability float64
	Confidence      float64
}

// ProcessorForecast represents a purely mathematical projection of a processor's metrics.
type ProcessorForecast struct {
	ExpectedLatency float64
	ExpectedSuccess float64
	FailureTrend    float64
	Confidence      float64
}

// ReserveProjection represents a purely mathematical projection of required reserve holds
// based on predicted systemic shocks and volatility.
type ReserveProjection struct {
	ShockProbability       float64
	ExpectedReservePercent float64
	ProjectedReserveHold   float64
	Acceleration           float64
	InstabilityIndex       float64
	ConfidenceLow          float64
	ConfidenceHigh         float64
}
