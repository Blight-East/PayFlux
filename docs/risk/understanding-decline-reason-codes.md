# Decline Reason Codes

## Definition
Decline Codes are the cryptic messages sent by banks to explain why a transaction failed. They range from specific (`51: Insufficient Funds`) to generic (`05: Do Not Honor`). Understanding them is the key to fixing acceptance rates.

## Why it matters
Retry Logic. If you retry a "Technical Error" (Code 91), you might get paid. If you retry a "Stolen Card" (Code 43), you will get fined or banned. Classifying codes correctly is the difference between "Optimization" and "Abuse."

## Signals to monitor
- **Code Distribution**: The % of declines caused by Insufficient Funds vs Fraud vs Technical.
- **Do Not Honor Rate**: The catch-all generic decline. High DNH usually means the issuer's risk model doesn't like you.
- **Issuer Specifics**: "Why is Chase declining us, but Citi is approving us?"

## Breakdown modes
- **Mapping Errors**: Processors aggregating specific codes into generic "Failed" buckets, hiding the root cause.
- **Velocity Bans**: Retrying a "Do Not Honor" 10 times in a minute, causing the issuer to block the card permanently.
- **Code Drift**: Issuers changing their logic (e.g., using Code 59 for "Suspected Fraud" one day, and Code 05 the next).

## Where observability fits
- **Standardization**: converting raw ISO 8583 codes into human-readable categories.
- **Cluster Analysis**: identifying if a spike in declines is coming from a specific BIN or region.
- **Strategy Tuning**: "Stop retrying Code 05; it never succeeds."

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### What is "Do Not Honor?"
It means "No." The bank refuses to say why, usually for security/risk reasons.

### Can I call the bank?
No. Only the cardholder can call their bank to ask why a charge was declined.

### What is a "Soft" vs "Hard" decline?
Soft = Temporary (Insufficient Funds, Network Timeout). Retry might work. Hard = Permanent (Stolen, Closed Account). Retry will fail.

## See also
- [Issuer Decline Spikes](../use-cases/monitoring-issuer-decline-spikes.md)
- [Differentiating Card Testing](../use-cases/differentiating-card-testing-from-velocity-fraud.md)
- [Retry Logic](./how-retry-logic-affects-risk.md)
