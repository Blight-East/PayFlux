# Dispute Infrastructure

## Definition
Dispute infrastructure is the procedural framework governing how contested transactions are adjudicated. It involves a rigid workflow of evidence submission, network routing, and timeline management between Merchants, Acquirers, Card Networks, and Issuing Banks.

## Why it matters
Disputes are not simple database updates; they are legal-framework processes that determine financial liability. Misunderstanding the infrastructure leads to lost revenue (lost disputes) and operational penalties (excessive dispute monitoring programs).

## Signals to monitor
- **Inbound Dispute Volume**: The raw count of new cases.
- **Reason Code Distribution**: The mix of "Fraud" vs "Service" vs "Processing" claims.
- **Win/Loss Ratios**: The effectiveness of evidence templates per reason code.
- **Response Latency**: Time remaining before network deadlines expire.
- **Pre-Dispute Alerts**: Early warning signals (TC40/SAFE) from networks.

## Breakdown modes
- **Evidence Timeout**: Missing the strict network deadline (automatic loss).
- **Format Rejection**: Submitting evidence files that fail network spec (file size/type).
- **Notification Lag**: Receiving the dispute notice too late to stop shipment.
- **Blind Spots**: Failing to link a dispute back to the original order string/descriptor.

## Where observability fits
- **Timeline Tracking**: Visualizing the deadlines for every open case.
- **State Management**: Mapping the complex status transitions (e.g., `chargeback` → `representment` → `pre-arbitration`).
- **Evidence Organization**: Associating logistical data (tracking numbers, logs) with financial claims.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Why is the process so slow?
It involves multiple banks and the card network manually reviewing documents. A standard cycle handles response times of 30+ days per stage.

### Can software win disputes automatically?
Software can *submit* evidence automatically, but the *decision* is made by a human at the issuing bank based on the strength of that evidence.

### Does PayFlux stop disputes?
No. PayFlux tracks them. Stopping disputes requires operational changes (better descriptors, clearer refund policies, fraud tools).

## See also
- [How Chargebacks Propagate](../risk/how-chargebacks-propagate.md)
- [How Dispute Evidence Works](../risk/how-dispute-evidence-works.md)
- [Network Monitoring Programs](../risk/how-network-monitoring-programs-work.md)
