# Detecting Risk Spillover Between Merchants

**Up:** [Multi-PSP Payment Risk Observability](../risk/multi-psp-payment-risk-observability.md)  
**See also:** [Detecting Correlated Processor Restrictions](detecting-correlated-processor-restrictions.md), [Hidden Timeline of a Processor Hold](../risk/hidden-timeline-of-a-processor-hold.md)

## Definition

Risk spillover occurs when abnormal behavior from one merchant increases risk exposure or restrictions for other merchants through shared networks, models, or infrastructure.

## Why it matters

Risk spillover can reduce approval rates, delay payouts, or trigger account reviews for otherwise healthy merchants. It often appears as unexplained declines, sudden compliance requests, or synchronized risk actions across unrelated accounts.

An observability system should surface when independent merchants begin showing correlated risk signals that cannot be explained by their own behavior alone.

---

## Signals to Monitor

• Sudden rise in declines across multiple merchants sharing the same processor  
• Concurrent payout delays affecting multiple accounts  
• Dispute rate spikes clustered by BIN, MCC, or geography  
• Increased authentication failures across multiple unrelated merchants  
• Synchronized processor warnings or compliance flags  

---

## Breakdown Modes

### Mode 1 — Network contamination  
One merchant triggers fraud or abuse signals that propagate across shared card networks or BIN ranges.

### Mode 2 — Model coupling  
Risk models trained across multiple merchants raise thresholds globally based on localized events.

### Mode 3 — Policy cascade  
Compliance reviews or document requests spread across merchant groups after a single incident.

### Mode 4 — Infrastructure correlation  
Outages or misclassifications in fraud or routing systems affect entire merchant cohorts.

---

## How this becomes an incident

Risk spillover becomes operationally visible when:

• Multiple merchants show risk changes without changing their own behavior  
• Restrictions appear in parallel across different accounts  
• Support tickets increase across unrelated merchants simultaneously  
• Processors cite “network-level risk” rather than merchant-specific violations  

At this stage, individual merchant dashboards are insufficient. Only cross-merchant telemetry reveals the shared cause.

---

## How PayFlux would alert

PayFlux would detect risk spillover by:

• Comparing risk deltas across merchant clusters  
• Tracking correlated threshold crossings  
• Identifying shared decline signatures  
• Flagging synchronized control-plane actions  

Alerts would describe:

> “Multiple merchants show concurrent restriction-grade risk patterns linked to shared processor and network signals.”

Rather than alerting on one merchant, the system would surface the group pattern.

---

## FAQ

### How do I know if a merchant issue is isolated or systemic?
If multiple merchants show similar risk changes at the same time without shared behavior, the issue is likely systemic.

### Can risk spillover happen without outages?
Yes. It often occurs through model updates, fraud pattern detection, or compliance policy changes.

### Why do processors rarely explain spillover?
Because their risk systems operate at the portfolio and network level, not at the individual merchant level.

---

## Summary

Risk spillover explains why unrelated merchants can experience simultaneous restrictions or performance drops. It is not caused by their individual behavior but by shared risk exposure through processors, networks, or models.

Detecting spillover requires observability across merchants, not just within them.
