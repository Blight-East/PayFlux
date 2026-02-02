# Detecting Correlated Processor Restrictions

Up: [Multi-PSP Payment Risk Observability](../risk/multi-psp-payment-risk-observability.md)
See also:
- [Detecting Cross-PSP Failures](detecting-cross-psp-failures.md)
- [Payment Incident Detection](../risk/payment-incident-detection.md)
- [Hidden Timeline of a Processor Hold](../risk/hidden-timeline-of-a-processor-hold.md)

---

## What this is

Correlated processor restrictions occur when multiple payment processors (e.g., Stripe, Adyen, Checkout.com) independently apply risk controls — such as payout delays, account reviews, or capability restrictions — to the same merchant or traffic profile within a short time window.

This usually indicates a shared upstream signal (network rules, issuer behavior, fraud model convergence), not a local processor outage.

---

## Why this matters

Correlated restrictions are dangerous because:

- They reduce redundancy across PSPs.
- They accelerate cash-flow interruption.
- They are often misdiagnosed as isolated provider issues.
- They usually precede reserves, freezes, or document requests.

To a merchant, this feels like “every processor suddenly turned hostile.”
Operationally, it is the moment risk becomes systemic instead of local.

---

## What an observability system should surface

An observability layer should make correlation explicit by answering:

- Are restriction events appearing across multiple PSPs for the same merchant or BIN?
- Did the second restriction follow the first within minutes or hours?
- Are restriction types converging (e.g., payout delay → capability removal)?
- Are failure signatures converging (timeouts, fraud declines, compliance flags)?

This turns “weird behavior” into a recognizable risk pattern.

---

## Signals to monitor

Typical signals that indicate correlated restrictions:

- Payout delays or holds across more than one processor
- Simultaneous capability downgrades (e.g., card payments disabled)
- Document requests from multiple providers
- Network-level decline code shifts (05, 62, 63, 65)
- Rapid increase in compliance-coded failures
- BIN-level failure concentration across processors
- Sudden disappearance of settlement events

These are not outages.
They are risk reactions.

---

## Breakdown modes

How correlated restrictions usually form:

**Mode 1 — Network trigger**
- Card network or issuer rule activates
- Processors receive independent risk signals
- Each applies controls locally
- Merchant experiences multi-PSP restriction

**Mode 2 — Model convergence**
- Fraud or compliance models retrain on shared data
- Similar thresholds trip across providers
- Restrictions appear “coincidentally” synchronized

**Mode 3 — Retry amplification**
- Failed traffic reroutes between PSPs
- Models interpret retries as attack behavior
- Risk scores spike across stack

**Mode 4 — Evidence gap**
- One processor requests documents
- Merchant stalls
- Other processors escalate preemptively

---

## How this differs from cross-PSP failures

| Failures | Restrictions |
| :--- | :--- |
| Technical symptoms | Policy reactions |
| Latency, 5xx, auth errors | Reviews, holds, disablements |
| Infrastructure-driven | Risk-driven |
| Often transient | Often persistent |
| Fixed by routing | Fixed by remediation |

Cross-PSP failures break payments.
Correlated restrictions freeze businesses.

---

## How PayFlux would detect this pattern

A detection system would:

- Normalize restriction and control-plane events across PSPs
- Track timing relationships between them
- Compare merchant-level and BIN-level exposure
- Identify when controls appear on multiple processors
- Classify the event as “correlated restriction”

Alert shape:

“Multiple processors have applied risk controls to the same traffic profile within a 4-hour window. This suggests network-level or model-level risk escalation, not a local outage.”

This allows teams to:

- Stop retry routing
- Prepare compliance responses
- Preserve liquidity
- Communicate cause correctly to merchants

---

## Common misinterpretations

- “Stripe is down” → actually risk controls
- “Adyen bug” → actually issuer behavior
- “Random review” → actually convergence
- “We need another PSP” → actually same signal

Without correlation, every restriction looks isolated.
With correlation, risk becomes visible as a system.

---

## FAQ

**How do I know if restrictions are correlated or coincidental?**
By measuring timing, merchant overlap, and control-type similarity across PSPs.

**Can correlated restrictions happen without failures?**
Yes. Often the first signal is payout delay, not transaction decline.

**Are correlated restrictions reversible?**
Usually, but only after remediation and time-based cooling periods.

**Should I reroute traffic when this happens?**
Often no. Rerouting can amplify risk scores across the stack.

---

## Why this exists

Processors do not share decisions.
But risk signals converge.

Correlated restrictions are where hidden network rules surface.
They are invisible without multi-PSP observability.

This page exists to name that pattern.
