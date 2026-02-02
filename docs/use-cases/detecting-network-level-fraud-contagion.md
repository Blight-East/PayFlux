# Detecting Network-Level Fraud Contagion

Up: [Multi-PSP Payment Risk Observability](../risk/multi-psp-payment-risk-observability.md)
See also: [Detecting Risk Spillover Between Merchants](detecting-risk-spillover-between-merchants.md), [Detecting Cross-PSP Failures](detecting-cross-psp-failures.md), [Hidden Timeline of a Processor Hold](../risk/hidden-timeline-of-a-processor-hold.md)

---

## Definition

Network-level fraud contagion is when the same fraud pattern spreads across multiple merchants through shared cards, devices, IP ranges, or BINs, causing simultaneous or cascading risk responses from processors.

Unlike isolated merchant fraud, contagion reflects attacker reuse of infrastructure, not merchant behavior.

---

## Why this matters

Fraud contagion causes:
- Sudden spikes in declines across unrelated merchants
- Unexpected account reviews or monitoring programs
- Elevated dispute ratios without local product changes
- Processor model retraining that affects entire cohorts

To merchants, this looks like “random risk.”
To processors, it looks like pattern reuse at network scale.

---

## What an observability system should surface

A payment observability system should show:
- Whether multiple merchants are experiencing similar fraud signatures
- Whether failure patterns correlate by BIN, country, or device class
- Whether restrictions are propagating across processor boundaries
- Whether the risk is local (merchant) or systemic (network)

---

## Signals to monitor

- Shared BINs showing synchronized decline spikes
- Identical failure reason distributions across merchants
- Burst increases in retries with low authorization success
- Dispute spikes clustered by region or card brand
- Increased auth failures without volume growth
- Cross-merchant correlation in fraud category labels

---

## Breakdown modes

Fraud contagion typically progresses in stages:

**Stage 0 — Local probing**
Attackers test cards on small merchants.

**Stage 1 — Pattern reuse**
The same cards/devices/IPs appear across multiple merchants.

**Stage 2 — Network detection**
Issuer or processor models flag the pattern.

**Stage 3 — Model response**
Approval rates fall across all exposed merchants.

**Stage 4 — Policy escalation**
Processors impose restrictions, reviews, or reserves on affected cohorts.

---

## How this differs from risk spillover

- Fraud contagion originates from attackers
- Risk spillover originates from processor controls

Fraud contagion = attack-plane propagation
Risk spillover = control-plane propagation

They often reinforce each other.

---

## How PayFlux would detect this

PayFlux would detect fraud contagion by:
- Correlating failure and dispute signatures across merchants
- Identifying shared attributes driving declines
- Classifying patterns as merchant-local vs network-level
- Alerting when similarity exceeds historical baselines

Alert shape:
“Multiple merchants show synchronized fraud indicators tied to shared BINs and devices.”

---

## Why this feels random to merchants

Merchants see:
- No change in traffic
- No change in products
- No change in onboarding
- But approval rates collapse

Because the cause exists outside their stack.

---

## FAQ

**How do I know if fraud is spreading across merchants?**
Look for synchronized decline and dispute patterns across unrelated accounts.

**Is this the same as card testing?**
Card testing is one cause. Fraud contagion describes the system-wide effect.

**Can this happen across processors?**
Yes. Attackers reuse patterns across PSPs.
