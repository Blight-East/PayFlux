# Risk Event Detection

## Definition
Risk Event Detection is the automated process by which payment processors identify accounts that pose financial capability. It is a state transition triggered when objective metrics (velocity, failure rates, disputes) cross predefined safety thresholds, moving an account from "Active" to "Restricted" or "Reserved."

## Why it matters
These detections are the "immune system" of payment processing. They protect the settlement network from insolvency. For merchants, they are the primary mechanism of operation disruption. Understanding them removes the mystery of "sudden" account closures.

## Signals to monitor
- **Transaction Velocity**: Volume per hour/day exceeding historical baselines.
- **Authorization Rates**: A sudden drop in approval rates (often indicating a carding attack).
- **Dispute Activity**: Inbound chargeback counts and TC40/SAFE fraud reports.
- **Refund Patterns**: High refund-to-sales ratios indicating fulfillment failure.

## Breakdown modes
- **Immediate Suspension**: A "kill switch" triggered by extreme signals (e.g., 90% decline rate).
- **Latent Queue**: An account being flagged for manual review without immediate suspension.
- **Reserve Trigger**: Automatically applying a 10-25% hold once a dispute threshold (e.g., 0.6%) is crossed.

## Where observability fits
- **Signal Surface**: Exposing the specific metric that triggered the event (e.g., "Velocity Limit Exceeded").
- **Timeline Tracking**: Logging exactly when the state transition occurred to correlate with deploys or marketing pushes.
- **Pattern Correlation**: Proving that a spike was a known marketing event, not a fraud attack.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Is detection manual or automated?
90% automated. Human analysts usually only get involved *after* the system has already flagged or restricted the account.

### Why does it feel sudden?
Because risk signals accumulate silently (like filling a bucket). You only notice when the bucket overflows (the restriction).

### Can I prevent detection?
No, but you can avoid *triggering* it by keeping metrics healthy and notifying processors of legitimate spikes in advance.

## See also
- [Payment Risk Events](../pillars/payment-risk-events.md)
- [Transaction Monitoring](../risk/how-transaction-monitoring-works.md)
- [Why Risk Events Follow Growth](./why-risk-events-follow-growth.md)
