package forecast

import "math"

// slope calculates the linear regression slope of a series of points, assuming x increments by 1.
func slope(data []float64) float64 {
	n := float64(len(data))
	if n < 2 {
		return 0
	}
	var sumX, sumY, sumXY, sumX2 float64
	for i, val := range data {
		x := float64(i)
		sumX += x
		sumY += val
		sumXY += x * val
		sumX2 += x * x
	}
	meanX := sumX / n
	meanY := sumY / n

	denominator := sumX2 - n*meanX*meanX
	if denominator == 0 {
		return 0
	}

	return (sumXY - n*meanX*meanY) / denominator
}

// stddev calculates the sample standard deviation of a dataset.
func stddev(data []float64) float64 {
	n := float64(len(data))
	if n < 2 {
		return 0
	}
	var sum float64
	for _, val := range data {
		sum += val
	}
	mean := sum / n
	var vSum float64
	for _, val := range data {
		vSum += (val - mean) * (val - mean)
	}
	return math.Sqrt(vSum / (n - 1))
}

// normalize applies min-max normalization to val. Return 0 if min == max.
func normalize(val, min, max float64) float64 {
	if min == max {
		return 0
	}
	return (val - min) / (max - min)
}

// clamp restricts val to the range [min, max].
func clamp(val, min, max float64) float64 {
	if val < min {
		return min
	}
	if val > max {
		return max
	}
	return val
}

// sigmoid applies the logistic sigmoid function to val.
func sigmoid(val float64) float64 {
	return 1.0 / (1.0 + math.Exp(-val))
}

// acceleration calculates the discrete second derivative (slope of the velocity) of a series.
func acceleration(data []float64) float64 {
	n := len(data)
	if n < 3 {
		return 0
	}

	velocity := make([]float64, n-1)
	for i := 1; i < n; i++ {
		velocity[i-1] = data[i] - data[i-1]
	}

	return slope(velocity)
}
