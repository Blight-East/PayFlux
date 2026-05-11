package rac

import (
	"fmt"
	"math/rand"
	"testing"
)

// AssertPermutationInvariance feeds the same event set to the reducer in N
// distinct random orderings and asserts the final state is the same every
// time.
//
// This is the most important RAC property — the one that separates a real
// reducer from a "sequence of writes that pretends to be a reducer." Order
// independence requires the merge function to extract logical ordering
// from event content, not from arrival order.
//
// Note: the property holds for the FINAL state, not for intermediate
// states. Different orderings will produce different intermediate
// projection chains; only the head of the chain (highest event_occurred_at)
// must converge.
func AssertPermutationInvariance[S any, E any](t *testing.T, r Reducer[S, E], events []E, trials int) {
	t.Helper()
	if trials < 2 {
		t.Fatalf("permutation invariance requires at least 2 trials, got %d", trials)
	}
	if len(events) < 2 {
		// Trivially satisfied; nothing to permute.
		return
	}

	baseline := FoldEvents(r, events)

	for trial := 0; trial < trials; trial++ {
		// Use a deterministic seed so test failures are reproducible.
		// Each trial gets a different but predictable permutation.
		rng := rand.New(rand.NewSource(int64(trial + 1)))
		shuffled := make([]E, len(events))
		copy(shuffled, events)
		rng.Shuffle(len(shuffled), func(i, j int) {
			shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
		})

		result := FoldEvents(r, shuffled)
		if !r.Equal(baseline, result) {
			t.Errorf("permutation invariance failed at trial %d\n  baseline:    %s\n  permutation: %s",
				trial,
				safeDescribe(r, baseline),
				safeDescribe(r, result))
		}
	}
}

// AssertIdempotency verifies that applying the same event twice in
// succession produces the same final state as applying it once.
//
// This is a stronger property than dedup-at-the-cursor-layer: it asserts
// the merge function itself does not double-count, even if the cursor
// fails to dedup.
func AssertIdempotency[S any, E any](t *testing.T, r Reducer[S, E], events []E) {
	t.Helper()
	if len(events) == 0 {
		return
	}

	once := FoldEvents(r, events)

	// Construct a "twice" sequence: each event followed by itself.
	twice := make([]E, 0, len(events)*2)
	for _, e := range events {
		twice = append(twice, e, e)
	}
	twiceResult := FoldEvents(r, twice)

	if !r.Equal(once, twiceResult) {
		t.Errorf("idempotency failed: same events applied twice produced different result\n  once:  %s\n  twice: %s",
			safeDescribe(r, once),
			safeDescribe(r, twiceResult))
	}
}

// AssertDeterminism verifies that running the reducer over the same input
// twice produces the same final state. This catches reducers that depend
// on wall-clock time, process state, or other non-deterministic inputs.
func AssertDeterminism[S any, E any](t *testing.T, r Reducer[S, E], events []E, repeats int) {
	t.Helper()
	if repeats < 2 {
		t.Fatalf("determinism requires at least 2 repeats, got %d", repeats)
	}

	first := FoldEvents(r, events)
	for i := 1; i < repeats; i++ {
		result := FoldEvents(r, events)
		if !r.Equal(first, result) {
			t.Errorf("determinism failed at repeat %d\n  first:  %s\n  repeat: %s",
				i,
				safeDescribe(r, first),
				safeDescribe(r, result))
		}
	}
}

// AssertPartialReplayEquivalence verifies that processing a prefix of the
// events, then continuing with the rest, produces the same final state as
// processing all events in one pass.
//
// This guards against reducers that maintain state outside of what gets
// projected — e.g., an in-memory cache that a partial replay can't reach.
// The contract is that the projection itself is the only state; a fresh
// reducer with no in-memory cache plus the current projection must be
// equivalent to a reducer that has processed every prior event.
func AssertPartialReplayEquivalence[S any, E any](t *testing.T, r Reducer[S, E], events []E, splits int) {
	t.Helper()
	if len(events) < 2 {
		return
	}

	whole := FoldEvents(r, events)

	for i := 0; i < splits; i++ {
		splitPoint := (len(events) * (i + 1)) / (splits + 1)
		if splitPoint == 0 || splitPoint == len(events) {
			continue
		}

		// First half.
		partial := FoldEvents(r, events[:splitPoint])
		// Continue from the partial state with the second half.
		continued := partial
		for _, e := range events[splitPoint:] {
			next := r.Merge(continued, e)
			if next != nil {
				continued = next
			}
		}

		if !r.Equal(whole, continued) {
			t.Errorf("partial replay equivalence failed at split %d (%d/%d events)\n  whole:    %s\n  split:    %s",
				i, splitPoint, len(events),
				safeDescribe(r, whole),
				safeDescribe(r, continued))
		}
	}
}

// AssertFutureVersionCompatibility is a placeholder for the future-reducer
// compatibility test. Once reducer v2 exists, the test will run v1 and v2
// over the same event set and either assert identical output or invoke a
// documented migration policy to explain the difference.
//
// For now this is a no-op so tests that include it compile and document
// the intent.
func AssertFutureVersionCompatibility[S any, E any](t *testing.T, r Reducer[S, E], events []E) {
	t.Helper()
	t.Log("future-version compatibility: only one reducer version exists today; placeholder satisfied trivially")
}

func safeDescribe[S any, E any](r Reducer[S, E], s *S) string {
	if s == nil {
		return "<nil>"
	}
	defer func() {
		if rec := recover(); rec != nil {
			fmt.Printf("Describe panicked: %v\n", rec)
		}
	}()
	return r.Describe(s)
}
