# Shadow Risk

Shadow risk refers to latent financial and compliance exposure that is not visible in standard payment dashboards but accumulates silently through system behavior.

## What Creates Shadow Risk

Shadow risk forms when:
- Failed payments are retried automatically without visibility
- Disputes propagate across linked accounts
- Reserve balances lag behind real exposure
- Fraud signals are suppressed by aggregation
- Compliance thresholds are crossed without alerts

## Why It Matters

Shadow risk causes:
- Sudden account freezes
- Unexpected reserve increases
- Delayed payouts
- Compliance escalations
- Merchant terminations

These events appear sudden but are usually the result of gradual, unobserved accumulation.

## Observability Implications

Shadow risk cannot be detected by:
- Transaction volume alone
- Revenue metrics
- Simple decline rates

It requires:
- State-aware monitoring
- Exposure tracking
- Threshold drift detection
- Dispute velocity tracking

## Example

A merchant retries failed payments aggressively. Each retry raises dispute probability. The system shows stable revenue, but dispute velocity increases. Shadow risk accumulates until the processor applies a reserve.

## Key Insight

Shadow risk is not a single event. It is an invisible system state.
