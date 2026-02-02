# Risk Thresholds & Hysteresis

**Definition:**  
Risk thresholds are numerical limits (e.g., 1% dispute rate) that trigger enforcement actions. Hysteresis is the lag between crossing a threshold and reversing its effect—meaning it takes less risk to enter a penalty box than to exit it.

**Impact:**  
Threshold systems create discontinuous behavior: small metric changes can cause large operational shifts. Once crossed, thresholds can cause delayed payouts, reserve requirements, or account restrictions that persist even after metrics improve.

**What an observability system should surface:**  
An observability system should show when thresholds are crossed, how long systems remain in restricted states, and whether recovery is actually occurring—not just point-in-time metrics.

---

## Up
Payment Risk Mechanics

## See also
- [The Hidden Timeline of a Processor Hold](hidden-timeline-of-a-processor-hold.md)
- [Risk Debt and Compounding Anomalies](risk-debt-and-compounding-anomalies.md)
- [Payment Incident Detection](payment-incident-detection.md)

---

## What is hysteresis?

Hysteresis means a system responds differently to increasing risk than to decreasing risk.

In payments:
- It takes **less** to enter a restricted state
- It takes **more** to exit it

This prevents rapid oscillation between “safe” and “unsafe” states.

---

## Why hysteresis exists in payment systems

Processors use hysteresis to:
- Prevent repeated enable/disable cycles  
- Reduce fraud model instability  
- Protect network standing  
- Preserve operational predictability  

Risk models are designed for **stability**, not speed.

---

## How thresholds work

Thresholds are applied to signals such as:
- Failure rates  
- Dispute ratios  
- Retry pressure  
- Auth failure clustering  
- Velocity of change  

When thresholds are crossed:
- Payouts may be delayed  
- Reserves may be introduced  
- Account permissions may change  

These actions are often automatic.

---

## Signals to monitor

Signals that indicate hysteresis behavior and threshold proximity:

- **State Persistence:** Time spent above/below threshold
- **Risk Slope:** Direction and velocity of risk score changes
- **Recovery Lag:** Time-to-recovery after a breach
- **Retry Ratio:** Retry pressure relative to success
- **Dispute Velocity:** Aging curve slope

These describe **state persistence**, not just spikes.

---

## Breakdown modes

Common failure patterns:

- **Sudden account freezes:** Step-function enforcement changes
- **Repeated crossing:** Oscillating near the limit without triggering recovery
- **Delayed de-escalation:** Reserves remaining high despite traffic normalization
- **Retry storms:** Masking underlying recovery signals
- **Threshold stacking:** Multiple rules triggered simultaneously

These prolong restricted states.

---

## Why recovery is slower than failure

Recovery usually requires:
- Sustained baseline behavior  
- Reduced variance  
- Evidence of resolution  
- Network review windows  

A single clean hour is not sufficient.  
Multiple stable windows are required.

---

## How PayFlux would alert

A detection system should not wait for the freeze. It should alert on:

- **Threshold Crossings:** Momentum towards a limit
- **State Transitions:** Entering or exiting a penalty state
- **Duration:** Time spent in restricted state
- **Recovery Failure:** Divergence from expected recovery trajectory

Alerts should describe the trajectory of the risk debt, not just the static value.

---

## Why this feels arbitrary to merchants

From the merchant side:
- Metrics look improved  
- Action remains in place  
- Cause is unclear  

This is because:
- Risk evaluation is windowed  
- Models have memory  
- Recovery rules differ from trigger rules  

---

## Upstream Causes

Risk thresholds are triggered by:
- elevated dispute ratios
- sudden traffic velocity changes
- retry amplification
- model confidence shifts
- abnormal refund rates
- delayed settlement confirmation

Threshold hysteresis is caused by:
- rolling evaluation windows
- asymmetric trigger and release conditions
- delayed risk model retraining
- enforcement cooldown timers

These inputs cause thresholds to behave as stateful control systems rather than simple limits.

---

## Downstream Effects

Threshold crossings result in:
- step-function enforcement changes
- reserve imposition
- payout delays
- transaction blocking
- manual review escalation

Hysteresis causes:
- delayed recovery after traffic normalizes
- prolonged enforcement after incidents resolve
- risk memory effects across time windows

This converts transient failures into persistent operational constraints.

---

## Common Failure Chains

**Retry Storm → Threshold Breach → Reserve Formation**

**Model Drift → Threshold Shift → Higher Decline Rates**

**Dispute Cluster → Threshold Trigger → Account Review**

**Traffic Spike → Velocity Threshold → Enforcement Lock**

These chains explain why risk controls behave non-linearly during incidents.

---

## FAQ

**Is hysteresis a bug?**  
No. It is intentional and designed to prevent system instability.

**Can hysteresis be tuned?**  
Yes, but only within safety margins defined by networks and processors.

**Why can’t support reverse it immediately?**  
Because many controls are automated and tied to model confidence windows.

**What is threshold hysteresis?**  
It is the delay between breaching a risk limit and being released from its effects.

**Why do thresholds cause sudden freezes?**  
Because enforcement activates when a numeric boundary is crossed.

**Can thresholds reverse immediately?**  
No. Release requires sustained metric improvement.

**Are thresholds the same across processors?**  
No. Each processor defines its own threshold logic.

---

## Summary

Risk thresholds define when action begins (the trigger).  
Hysteresis defines when action ends (the persistence).

Understanding both explains why recovery is slower than failure and why observability must track state, not just metrics.
