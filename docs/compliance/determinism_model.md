# Determinism Model


Last Updated: 2026-02-17
## 1. Determinism Guarantee
PayFlux guarantees that for any given state $S$ and input $I$, the output $O$ and next state $S'$ are strictly determined.
$$ F(S, I) \rightarrow (O, S') $$

## 2. Primitive Contracts
All system primitives declare a determinism level:

- **Deterministic**: Pure functions. No side effects. Output depends solely on input.
    - Examples: `RiskScorer`, `WarningStore`, `EntitlementsRegistry`.
- **Time-Deterministic**: Output depends on input + strictly monotonic clock.
    - Example: `ratelimit.Limiter`.
- **Conditional**: Deterministic given a fixed baseline or snapshot.
    - Examples: `AdaptiveBaseline`, `DecisionEngine`.

## 3. Hash Verification
To ensure code has not drifted from the determinism contract, every primitive is hashed (SHA-256) and validated against `SYSTEM_TAXONOMY.json` at startup and in CI.

### Current Validated Hashes
| Primitive | Hash |
|---|---|
| RiskScorer | `3324be6c...` |
| WarningStore | `459c19bf...` |
| EntitlementsRegistry | `1edcf9af...` |
| GenerateEnvelope | `20c6ab00...` |

## 4. Invariant Validation
The `InvariantValidator` runs after every decision cycle to check:
- Numeric finite-ness (no NaN/Inf).
- Probability bounds (0 <= P <= 1).
- Non-negativity of scores and metrics.
- Valid status transitions.
