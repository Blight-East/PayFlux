# Retry Amplification

## Definition
Retry Amplification is the multiplier effect where a single failed transaction spawns multiple additional attempts. If a merchant retries a decline 5 times, the network sees 6 total attempts. This amplifies the "error signal" the merchant is broadcasting to the ecosystem.

## Why it matters
Network Health. Visa and Mastercard equate "High Retry Rates" with "Bot Attacks." A valid merchant with a buggy retry loop looks exactly like a brute-force attack. This leads to MID blocking and fines.

## Signals to monitor
- **Amplification Factor**: `Total Attempts / Unique Orders`. (Should be ~1.1. If > 2.0, you have a problem).
- **Retry Compliance**: The % of retries performed on "Hard Declines" (Illegal) vs "Soft Declines" (Legal).
- **Error Cascades**: One gateway outage causing a 10x spike in traffic to the backup gateway.

## Breakdown modes
- **The Hammer**: Retrying 100 times in 1 second (Buggy Loop).
- **The Zombie**: Retrying a transaction that failed 30 days ago (Stale Logic).
- **Cross-PSP Leaks**: Retrying a blocked card on Stripe, then Adyen, then PayPal (maximizing exposure).

## Where observability fits
- **Circuit Breakers**: Detecting when the Amplification Factor spikes and auto-killing the retry worker.
- **Cost Estimation**: "We spent $5,000 in auth fees on failed retries this month."
- **Root Cause**: Identifying *which* decline code is triggering the loop.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Why do networks care?
Capacity. Useless retries clog the global payment rails (TPS) and look like potential DDoS or card testing.

### Is there a safe retry limit?
General rule: Max 4 retries over 15 days. Never retry a hard decline.

### What is a "Hard Decline?"
A permanent rejection (Stolen Card, Account Closed). No amount of retrying will fix it.

## See also
- [Retry Logic](./how-retry-logic-affects-risk.md)
- [Retry Storms](../how-it-works/how-retry-storms-form.md)
- [Transaction Monitoring](./how-transaction-monitoring-works.md)
