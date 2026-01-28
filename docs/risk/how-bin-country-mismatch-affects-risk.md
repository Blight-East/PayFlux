# BIN/Country Mismatch

## Definition
A Mismatch is a geographic discrepancy between the Card (Issuer Country), the User (IP Country), and the Destination (Shipping Country). It is a classic fraud signal. "French Card + Russian IP + Nigerian Shipping Address" = 99.9% Fraud.

## Why it matters
False Positives. While mismatch is a strong fraud signal, it also flags high-value customers: Travelers, Expats, and Digital Nomads. Blocking all mismatches kills valid revenue; allowing all mismatches invites fraud.

## Signals to monitor
- **Distance Calculation**: The physical distance between IP and Shipping Address.
- **Corridor Analysis**: "US Card -> UK IP" (Common/Safe) vs "US Card -> High Risk Country IP" (Dangerous).
- **Billing/Shipping Match**: Does the Billing Address provided match the Shipping Address?

## Breakdown modes
- **VPN Masking**: User appears to be in the US (via VPN) but the latency/timezone suggests otherwise.
- **Digital Goods**: SaaS products have no shipping address, making the signal noisier (only IP vs Card).
- **Corporate Cards**: A Google employee in London using a US-issued AMEX (Legitimate Mismatch).

## Where observability fits
- **Heatmapping**: Visualizing where mismatches are originating.
- **Segmented Rules**: "Allow Mismatch for Returning Customers; Block for New Customers."
- **Outcome Tracking**: Measuring the chargeback rate of the "Allowed Mismatch" cohort.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Should I block all mismatches?
No. You will block tourists and expats. Use 3D Secure for mismatches instead.

### What is AVS?
Address Verification Service. It checks if the numeric street address matches the bank's file. It helps resolve mismatches.

### Why does Crypto have high mismatch?
Because users often use VPNs for privacy, creating false geographic signals.

## See also
- [Geo Velocity](./how-geo-velocity-affects-risk.md)
- [Payment Risk Scoring](./how-payment-risk-scoring-works.md)
- [Transaction Monitoring](./how-transaction-monitoring-works.md)
