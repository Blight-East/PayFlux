# Tier Gating (v0.2.2+)

PayFlux exports support tier-based authority gating. Same data, same pipeline—different explanatory power.

## Tiers

| Tier | Label | Purpose |
|------|-------|---------|
| `tier1` | Processor Exposure Monitor | Detection only |
| `tier2` | Revenue Protection | Interpretation + foresight |

## Configuration

```bash
PAYFLUX_TIER=tier1   # Default: detection only
PAYFLUX_TIER=tier2   # Adds processor_playbook_context + risk_trajectory
```

## Tier 1 — Detection Only

Tier 1 exports include:
- Risk score, band, and drivers
- Raw metrics and timestamps
- Neutral descriptions of what was detected

Tier 1 exports do **not** include:
- `processor_playbook_context`
- `risk_trajectory`

## Tier 2 — Interpretation + Foresight

Tier 2 exports include everything in Tier 1, plus:

### 1. Processor Playbook Context

**Field:** `processor_playbook_context`

Answers: "Why processors care."

Rules:
- Probabilistic language only ("typically," "commonly observed")
- No guarantees
- No prescriptive actions
- No processor-specific rules stated as fact

Example:
```
"This pattern typically correlates with processor-side monitoring escalation. Rate limiting or velocity checks are commonly triggered at this threshold."
```

### 2. Risk Trajectory

**Field:** `risk_trajectory`

Answers: "Is this getting worse—and how fast?"

Shows:
- Directional trend (accelerating / stable / decelerating)
- Magnitude relative to baseline (e.g., "3× above baseline")
- Time-based framing

Example:
```
"Pattern accelerating: ~3.2× above baseline over the last 5 minutes."
```

## Export Examples

### Tier 1 Export

```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_type": "payment_failed",
  "processor": "stripe",
  "processor_risk_score": 0.72,
  "processor_risk_band": "high",
  "processor_risk_drivers": ["high_failure_rate", "retry_pressure_spike"]
}
```

### Tier 2 Export

```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_type": "payment_failed",
  "processor": "stripe",
  "processor_risk_score": 0.72,
  "processor_risk_band": "high",
  "processor_risk_drivers": ["high_failure_rate", "retry_pressure_spike"],
  "processor_playbook_context": "This pattern typically correlates with processor-side monitoring escalation. Rate limiting or velocity checks are commonly triggered at this threshold. Elevated failure rates are commonly interpreted as degraded transaction quality. Retry clustering typically signals infrastructure stress or integration issues to processor risk systems.",
  "risk_trajectory": "Pattern accelerating: ~3.2× above baseline over the last 5 minutes."
}
```

## Guardrails (Non-Negotiable)

- PayFlux does **not** recommend actions
- PayFlux does **not** claim insider processor rules
- PayFlux does **not** make decisions
- Everything is framed as observed behavior + momentum
