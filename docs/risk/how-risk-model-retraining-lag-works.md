# Risk Model Retraining Lag

## Definition
Retraining Lag is the delay between a new fraud pattern emerging and the Risk Model learning to block it. Fraud models are not usually real-time learners; they are retrained in batches (e.g., weekly) using historical data.

## Why it matters
The "Zero Day" Exploit. Fraudsters constantly test new attacks. When they find one that works, they have a window of opportunity (The Lag) to exploit it before the model updates. During this window, your approval rate stays high, but your future chargeback risk is skyrocketing.

## Signals to monitor
- **Approval Rate Stability**: A sudden, unexplained drop in approval rate often means a new model has been deployed.
- **Fraud Vintage**: The date the fraud occurred vs the date the model started blocking it.
- **False Positive Spikes**: New models often "over-correct," blocking good users until tuned.

## Breakdown modes
- **The Open Window**: 48 hours where a specific card bin + email pattern bypasses all checks.
- **The Slam**: The model updates, and suddenly 20% of your valid traffic is declined because it resembles the attack.
- **The Yo-Yo**: Models oscillating between "Too Loose" and "Too Strict" with every deployment.

## Where observability fits
- **Change Detection**: "Risk Score Distribution shifted significantly at 4am UTC."
- **Feedback Loop**: Sending manual review decisions back to the processor to speed up the learning process.
- **Gap Protection**: Implementing manual rules (velocity checks) to cover the gap while waiting for the model to catch up.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### How often do models update?
Processors like Stripe/Adyen update constantly (daily/hourly). Legacy processors might update monthly.

### Can I force an update?
No. But you can add your own "Block Rules" instantly to stop an active attack.

### Why did my good customers get blocked?
Model "Overfitting." The model learned a rule that was too broad (e.g., "Block all Gmail users") to stop the fraud.

## See also
- [Payment Risk Scoring](./how-payment-risk-scoring-works.md)
- [Transaction Monitoring](./how-transaction-monitoring-works.md)
- [Machine Learning Basics](../how-it-works/how-payment-infrastructure-detects-risk-events.md)
