# Payment Incident Detection for Modern PSP Stacks

**Up:** Payment risk mechanics  
**See also:** Preventing processor holds and freezes, Retry storms and amplification, Multi-PSP risk observability, [Detecting Stripe Incidents](../use-cases/detecting-stripe-payment-incidents.md)

---

## Definition

Payment incident detection is the practice of identifying abnormal transaction failure patterns in real time so payment teams can intervene before merchants experience outages, processor restrictions, or revenue loss.

These incidents surface as sudden drops in approval rate, spikes in retries, rising dispute volume, or delayed payouts. An observability system should surface these patterns before processors escalate risk controls or merchants churn.

---

## What is a payment incident?

A payment incident is a deviation from a processor’s normal transaction behavior that materially impacts merchant operations.

Unlike a single failed charge, a payment incident reflects:
- correlated failures across many transactions,
- persistence over a time window,
- and risk signals that propagate into disputes, reserves, or payout delays.

Examples include issuer-side declines, timeout cascades, authentication failures, and retry storms.

---

## Why payment incidents matter

Payment incidents directly affect:

- **Transaction volume (TPV):** Fewer successful charges reduce revenue immediately.
- **Approval rates:** Persistent declines damage issuer trust and routing performance.
- **Disputes:** Failed retries and delayed settlements increase chargeback risk.
- **Reserves and holds:** Processors raise risk controls when instability is detected.
- **Merchant churn:** Merchants attribute silent failures to platform instability.

Early detection determines whether an issue becomes an operational event or a financial incident.

---

## What an observability system should surface

An observability system should not only count failures, but detect **patterns** that indicate incident formation.

It should surface:

- when failure rates diverge from baseline,
- when retries amplify load instead of resolving errors,
- when issues correlate by BIN, region, or merchant cohort,
- and when processor behavior shifts before formal alerts are issued.

The goal is to detect instability before external actors (issuers, networks, or processors) enforce restrictions.

---

## Signals to monitor

An observability system should track:

- **Failure rate delta:** change versus rolling baseline.
- **Retry pressure:** retries per successful transaction.
- **Timeout mix:** proportion of failures caused by latency.
- **Authorization decline clustering:** correlated issuer responses.
- **Geo entropy:** increase in regional dispersion of failures.
- **Payout latency:** delay between capture and settlement.
- **Dispute aging:** accumulation of unresolved disputes.

These signals indicate whether failures are isolated or systemic.

---

## Breakdown modes

Payment incidents typically evolve through identifiable modes:

- **Gradual degradation:** approval rates fall slowly over hours or days.
- **Spike events:** abrupt failure surges tied to network or issuer issues.
- **Retry amplification:** retries worsen processor load instead of resolving errors.
- **Correlated failure:** multiple merchants or regions fail simultaneously.
- **Secondary effects:** disputes and payout delays appear after initial failure.

Each mode represents a different operational risk profile.

---

## How an observability system would alert

An observability system would generate an incident when:

- failure rate exceeds its historical baseline within a sliding window,
- retry pressure rises without corresponding recovery,
- or correlated failures appear across independent merchants or geographies.

Alerts should express:
- the dominant failure driver,
- the trajectory (stable, accelerating, decelerating),
- and the affected scope (merchant, processor, region, network).

This allows operators to distinguish between transient noise and structural failure.

---

## Frequently asked questions

### How do I detect Stripe payment incidents in real time?
By monitoring failure rate deltas, retry amplification, and correlated issuer declines rather than raw error counts.

### What metrics indicate a processor problem versus a merchant problem?
Processor problems manifest as correlated failures across merchants or geographies, while merchant problems are localized.

### How early can payment incidents be detected?
Most incidents can be detected within minutes once failure patterns diverge from baseline behavior.

### Why don’t processors notify merchants immediately?
Processors prioritize internal risk controls and stability before issuing public incident communications.

---

## Related concepts

- Preventing processor holds and freezes  
- Retry storms and amplification  
- Multi-PSP risk observability  
- Geo entropy and regional risk
