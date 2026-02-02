# Multi-PSP Payment Risk Observability

**Definition:**  
Multi-PSP payment risk observability is the practice of monitoring and correlating risk signals across multiple payment processors (e.g., Stripe, Adyen, Checkout.com) to detect incidents that are invisible when each processor is viewed in isolation.

It exists because payment failures, holds, and restrictions often emerge as patterns across providers, not as a single API error from one processor.

An observability system for multi-PSP risk must surface cross-processor divergence, not just per-provider metrics.

---

## Up
Payment Risk Mechanics

## See also
- [Cross-PSP Failures Use Case](../use-cases/detecting-cross-psp-failures.md)
- [Payment Incident Detection](payment-incident-detection.md)
- [Risk Thresholds & Hysteresis](mechanics-risk-thresholds-and-hysteresis.md)
- [The Hidden Timeline of a Processor Hold](hidden-timeline-of-a-processor-hold.md)

---

## Why this matters

Most modern platforms use more than one PSP for:
- redundancy,
- geography,
- vertical specialization,
- or regulatory separation.

But risk systems operate independently per PSP.

This creates blind spots where:
- Stripe declines increase,
- Adyen approvals stay flat,
- Checkout shows reserve pressure,

and no single dashboard indicates that the system as a whole is degrading.

Multi-PSP observability exists to answer:
“Is this a processor issue, or a merchant-level risk event propagating across providers?”

---

## What an observability system must surface

A multi-PSP risk system should expose:
- Cross-PSP approval rate divergence
- Processor-specific failure category skew
- Time-to-payout differences between PSPs
- Risk threshold crossings that occur in one PSP before others
- Retry migration patterns (traffic shifting between processors)

This allows operators to distinguish:
- network incidents
- model-driven restrictions
- merchant-specific degradation
- routing feedback loops

---

## Signals to monitor

Across all PSPs, track:

- Approval rate per processor
- Failure category distribution (auth, risk, timeout, velocity)
- Payout delay and reserve growth
- Dispute inflow rate per processor
- Retry volume per PSP
- Geographic approval skew
- Capability or account restriction events

These signals only become meaningful when viewed side-by-side.

---

## Breakdown modes

Multi-PSP risk usually breaks down in stages:

### Stage 1 — Silent divergence
One PSP’s approvals degrade while others remain stable.

### Stage 2 — Routing amplification
Traffic shifts to the “healthy” PSP, accelerating its own thresholds.

### Stage 3 — Correlated restrictions
Risk flags propagate across processors due to shared merchant behavior.

### Stage 4 — Liquidity asymmetry
One PSP holds funds while others continue settling.

### Stage 5 — Operator blindness
Teams see local metrics but miss global risk posture.

---

## How PayFlux would alert

A multi-PSP observability layer would:
- Detect divergence between processors beyond a baseline delta
- Trigger alerts on correlated threshold crossings
- Flag routing-driven amplification
- Identify which PSP first entered risk state
- Preserve timeline ordering across providers

Instead of:

“Stripe error rate increased”

It surfaces:

“Stripe entered elevated risk 14 minutes before Adyen, correlated with retry migration from Checkout.”

---

## Relationship to other mechanics

Multi-PSP observability connects directly to:
- Payment incident detection
- Risk thresholds & hysteresis
- Retry storms and amplification
- Processor holds and freezes
- Reserve formation

It is not a replacement for per-PSP monitoring.
It is the layer above it.

---

## FAQ

**How do I detect risk across Stripe and Adyen at the same time?**  
By correlating approval rates, failure categories, and threshold events across both processors instead of analyzing them separately.

**Why do processor holds often appear staggered?**  
Because each PSP evaluates risk independently, but the underlying merchant behavior is shared.

**Can routing cause risk escalation?**  
Yes. Shifting traffic to a “healthy” PSP can accelerate its own risk thresholds.

---

## Summary

Multi-PSP payment risk observability treats processors as sensors, not silos.

It exists to detect:
- divergence,
- correlation,
- and propagation

before restrictions, holds, or outages become irreversible.

It is the control plane for multi-processor payment systems.
