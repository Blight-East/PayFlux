package guardian

import (
	"encoding/json"
	"math"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"time"
)

type snapshot struct {
	Samples int

	ErrMean float64
	ErrVar  float64

	P95Mean float64
	P95Var  float64

	MemMean float64
	MemVar  float64
}

type AdaptiveBaseline struct {
	mu sync.Mutex

	samples int

	errMean float64
	errVar  float64

	p95Mean float64
	p95Var  float64

	memMean float64
	memVar  float64

	lastUpdated time.Time

	snap atomic.Value // snapshot
}

func LoadBaseline(path string) (*AdaptiveBaseline, error) {
	b := &AdaptiveBaseline{}

	data, err := os.ReadFile(path)
	if err != nil {
		return b, nil
	}

	var s snapshot
	if err := json.Unmarshal(data, &s); err != nil {
		return b, err
	}

	b.samples = s.Samples
	b.errMean = s.ErrMean
	b.errVar = s.ErrVar
	b.p95Mean = s.P95Mean
	b.p95Var = s.P95Var
	b.memMean = s.MemMean
	b.memVar = s.MemVar

	if b.samples > 0 {
		b.snap.Store(b.currentSnapshot())
	}

	return b, nil
}

func (b *AdaptiveBaseline) Save(path string) error {
	s := b.currentSnapshot()

	tmp := path + ".tmp"
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	f, err := os.Create(tmp)
	if err != nil {
		return err
	}

	if err := json.NewEncoder(f).Encode(s); err != nil {
		f.Close()
		return err
	}

	f.Sync()
	f.Close()

	if err := os.Rename(tmp, path); err != nil {
		return err
	}

	dir, err := os.Open(filepath.Dir(path))
	if err == nil {
		dir.Sync()
		dir.Close()
	}

	return nil
}

func (b *AdaptiveBaseline) Update(m Metrics) {
	b.mu.Lock()
	defer b.mu.Unlock()

	b.samples++
	if b.samples > 100000 {
		b.samples = 50000
	}

	update := func(mean, variance, x float64) (float64, float64) {
		if math.IsNaN(x) || x <= 0 {
			return mean, variance
		}

		// exponential smoothing (stable learning)
		const alpha = 0.05

		if b.samples == 1 {
			return x, 0
		}

		delta := x - mean
		mean = mean + alpha*delta
		variance = (1-alpha)*variance + alpha*(delta*delta)

		return mean, variance
	}

	b.errMean, b.errVar = update(b.errMean, b.errVar, m.ErrorRate)
	b.p95Mean, b.p95Var = update(b.p95Mean, b.p95Var, m.P95)
	b.memMean, b.memVar = update(b.memMean, b.memVar, m.MemoryMB)

	b.lastUpdated = time.Now().UTC()

	b.snap.Store(b.currentSnapshot())
}

func (b *AdaptiveBaseline) deviationScore(m Metrics) float64 {
	v := b.snap.Load()
	if v == nil {
		return 0
	}
	s := v.(snapshot)

	if s.Samples < 20 {
		return 0
	}

	score := 0.0

	score += z(m.ErrorRate, s.ErrMean, s.ErrVar, s.Samples)
	score += z(m.P95, s.P95Mean, s.P95Var, s.Samples)
	score += z(m.MemoryMB, s.MemMean, s.MemVar, s.Samples)

	return score
}

func z(x, mean, variance float64, n int) float64 {
	if variance <= 0 {
		return 0
	}

	std := math.Sqrt(variance)
	if std == 0 {
		return 0
	}

	return math.Abs(x-mean) / std
}

func (b *AdaptiveBaseline) currentSnapshot() snapshot {
	return snapshot{
		Samples: b.samples,
		ErrMean: b.errMean,
		ErrVar:  b.errVar,
		P95Mean: b.p95Mean,
		P95Var:  b.p95Var,
		MemMean: b.memMean,
		MemVar:  b.memVar,
	}
}
