// Package rac defines the Reducer Acceptance Contract — the certification
// harness that every reducer in PayFlux must pass before deployment.
//
// The contract is encoded as a set of properties any reducer's merge
// function must satisfy:
//
//   - Permutation invariance: feeding the same event set in N random orders
//     produces the same final state.
//   - Idempotency: applying the same event twice produces the same state as
//     applying it once.
//   - Determinism: repeating a full run over the same input produces
//     byte-identical projection chains (modulo wall-clock timestamps).
//   - Partial replay equivalence: processing the first half of events then
//     all events produces the same final state as processing all events
//     directly.
//   - Future-version compatibility (placeholder): when reducer vN+1 exists,
//     its output over the vN event set must either be identical to vN's
//     output or differ in ways documented by a migration policy.
//
// Reducers expose themselves to the harness via the Reducer interface
// below. Concrete tests live alongside each reducer's package — this
// package only defines the contracts.
package rac

// Reducer is the minimal surface every reducer must expose to the RAC
// harness. The Event and State types are parameterized via Go generics so
// the harness works across reducers without imposing a single Event or
// State shape.
type Reducer[State any, Event any] interface {
	// Merge applies an event to a current state and returns the new state.
	// A nil current means "no prior state exists." A nil result means
	// "this event did not produce a new state" (skipped — e.g., late
	// event detection). Idempotency, determinism, and order-independence
	// are all properties of this function alone.
	Merge(current *State, event Event) *State

	// Equal compares two states for semantic equality. Implementations
	// should ignore fields that are inherently per-run (timestamps from
	// wall-clock, generated UUIDs, etc.) and compare only the
	// interpreted state fields.
	Equal(a, b *State) bool

	// Describe returns a human-readable description of a state for use
	// in test failure messages. Used by the harness on assertion
	// failures.
	Describe(s *State) string
}

// FoldEvents drives a Reducer through a sequence of events starting from
// nil, returning the final state. Events that the merge function skips
// (returns nil for) leave the state unchanged.
func FoldEvents[S any, E any](r Reducer[S, E], events []E) *S {
	var state *S
	for _, e := range events {
		next := r.Merge(state, e)
		if next != nil {
			state = next
		}
	}
	return state
}
