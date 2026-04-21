package guardian

import "math"

type Cause string

const (
	CauseTrafficSpike   Cause = "traffic_spike"
	CauseMemoryLeak     Cause = "memory_leak"
	CauseSlowDependency Cause = "slow_dependency"
	CauseColdStart      Cause = "cold_start"
	CauseDeployImpact   Cause = "deploy_impact"
	CauseUnknown        Cause = "unknown"
)

type CauseReport struct {
	Primary      Cause             `json:"primary"`
	Confidence   float64           `json:"confidence"`
	Contributors map[Cause]float64 `json:"contributors"`
}

func AnalyzeCause(m Metrics, base snapshot, deployAge int64) CauseReport {
	scores := map[Cause]float64{}

	// --- Traffic Spike ---
	scores[CauseTrafficSpike] =
		zScore(m.ErrorRate, base.ErrMean, base.ErrVar)*0.7 +
			zScore(m.P95, base.P95Mean, base.P95Var)*0.3

	// --- Memory Leak ---
	scores[CauseMemoryLeak] =
		zScore(m.MemoryMB, base.MemMean, base.MemVar)

	// --- Slow Dependency ---
	scores[CauseSlowDependency] =
		zScore(m.P95, base.P95Mean, base.P95Var)

	// --- Cold Start ---
	if deployAge < 120 {
		scores[CauseColdStart] =
			zScore(m.P95, base.P95Mean, base.P95Var)
	}

	// --- Deploy Impact ---
	if deployAge < 300 {
		scores[CauseDeployImpact] =
			zScore(m.ErrorRate, base.ErrMean, base.ErrVar) +
				zScore(m.P95, base.P95Mean, base.P95Var)
	}

	// --- Select highest score ---
	var top Cause = CauseUnknown
	var topScore float64

	for c, s := range scores {
		if s > topScore {
			topScore = s
			top = c
		}
	}

	conf := math.Min(topScore/4.0, 1)

	return CauseReport{
		Primary:      top,
		Confidence:   conf,
		Contributors: scores,
	}
}

func zScore(x, mean, variance float64) float64 {
	if variance <= 0 {
		return 0
	}
	std := math.Sqrt(variance)
	if std == 0 {
		return 0
	}
	return math.Abs(x-mean) / std
}
