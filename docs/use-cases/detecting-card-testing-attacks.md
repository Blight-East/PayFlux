# Detecting Card Testing Attacks

## Overview
Card testing is a programmatic attack where fraudsters use a merchant's checkout page to validate stolen credit card numbers. These attacks generate thousands of small transactions, often resulting in high decline rates and authorization fees. Detection relies on identifying non-human velocity patterns and clustering anomalies.

## Common card testing patterns
Attacks are characterized by:
- **Velocity Spikes**: A sudden increase in transaction attempts within a short window.
- **Low Values**: Thousands of transactions for $1.00 or similar small amounts.
- **BIN Clustering**: High concentration of cards from the same issuing bank (BIN) or country.
- **Decline Rate Anomalies**: A decline rate shifting from a standard 5-10% to 80-90%.

## How detection works
Detection infrastructure monitors the "shape" of traffic:
1.  **Metric Aggregation**: Counting attempts per IP, session, or device fingerprint.
2.  **Ratio Monitoring**: Comparing successful authorizations vs. declines in real-time.
3.  **Pattern Recognition**: Identifying sequential card numbers or repetitive billing fields.

## Operational response requirements
When an attack is detected, operations teams need to:
- **Enable CAPTCHA**: Adding friction to the checkout flow to stop bots.
- **Refund Successes**: Immediately refunding the few "successful" test charges to avoid disputes.
- **Block Vectors**: Blacklisting the attacking IPs or BIN ranges.

## What infrastructure supports attack visibility
Robust infrastructure ensures:
- **Real-time Alerting**: Notifying teams within seconds of a velocity spike.
- **Cost Estimation**: tracking the authorization fees incurred during the attack.
- **Source Identification**: Grouping the attack by common attributes (IP, User Agent, etc.).

## Where PayFlux fits
PayFlux operates as an observatory for authorization traffic. It visualizes velocity and decline rates in real-time, allowing teams to spot the "signature" of a card testing attack instantly. PayFlux preserves the timeline of the attack for post-mortem analysis but does not block transactions directly.
