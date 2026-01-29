# Model Drift

Model drift describes the degradation of fraud and risk model accuracy as real-world behavior changes.

## Causes of Drift

Drift occurs when:
- Merchant behavior changes
- Fraud patterns evolve
- Network policies shift
- Data distributions move
- Models are not retrained

The model still runs, but its assumptions become wrong.

## Consequences

Drift produces:
- False positives
- False negatives
- Delayed interventions
- Mispriced reserves
- Unstable thresholds

## Detection

Drift can be detected by:
- Rising override rates
- Performance decay over time
- Divergence between prediction and outcome
- Threshold instability

## Example

A fraud model trained on card testing patterns fails to detect synthetic identity fraud, allowing exposure to grow.

## Key Insight

Models fail silently before they fail visibly.
