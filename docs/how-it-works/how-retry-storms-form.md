# Retry Storms

## Definition
A Retry Storm is a constructive interference failure where a system outage triggers aggressive automated retries, amplifying traffic volume and prolonging the outage. It is a feedback loop: Failure → Retry → More Load → More Failure.

## Why it matters
It turns a minor hiccup into a major incident. It can cause:
1.  **Self-DoS**: Crashing your own services.
2.  **Fee Explosion**: Paying auth fees on thousands of failed retries.
3.  **Network Bans**: Issuers banning your MID because they see the retries as a "Velocity Attack."

## Signals to monitor
- **Attempts per Order**: The ratio of `payment_attempts` to `unique_order_ids`. (Should be close to 1.1; storms push it to 10+).
- **Error Consistency**: Seeing the same error code (e.g., `503 Service Unavailable`) repeating.
- **Gateway Latency**: Response times spiking alongside request counts.

## Breakdown modes
- **Timeout Loops**: Client times out at 5s, Gateway takes 6s. Client retries. Gateway is now processing 2 requests for 1 result.
- **Idempotency Leaks**: Retrying without unique keys, creating duplicate charges.
- **Cascading Retries**: Service A retries Service B, which retries Service C (Multiplicative load).

## Where observability fits
- **Shape Detection**: Alerting on the "slope" of retry volume.
- **Cost Estimation**: Real-time ticker of "Wasted Fees" from failed retries.
- **Circuit Breaking**: Triggering a "Stop the Line" alert when retry ratios hit a danger zone.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Should I auto-retry declines?
Only specific "soft" declines (like networking errors). Never auto-retry "hard" declines (like "Insufficient Funds") instantly.

### What is "Exponential Backoff"?
Waiting longer between each retry (1s, 2s, 4s, 8s). This lets the downstream system recover.

### Can retries get me banned?
Yes. Visa/Mastercard have "Excessive Retry" monitoring programs. It looks like card testing.

## See also
- [Retry Logic](../risk/how-retry-logic-affects-risk.md)
- [Retry Amplification](../risk/how-retry-amplification-increases-exposure.md)
- [Transaction Monitoring](../risk/how-transaction-monitoring-works.md)
