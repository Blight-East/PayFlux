# Retry Logic Risk

## Definition
Retry Logic Risk is the danger inherent in automated recovery systems. While retrying failed payments is a standard revenue recovery tactic (Smart Dunning), doing it incorrectly violates network rules (Excessive Retries) and provides data to card testers.

## Why it matters
Compliance vs Revenue. You want to recover the 5% of failed payments that are salvageable, without triggering the alarms designed to catch the 95% that are fraud/hard declines. It is a precision game.

## Signals to monitor
- **Recovery Rate**: The % of retries that succeed. (If < 5%, your logic is too aggressive).
- **Retry Interval**: The time wait between attempts.
- **Decline Code Mix**: Are you retrying `Lost/Stolen` (Bad) or `Insufficient Funds` (Good)?

## Breakdown modes
- **Rule Violation**: Retrying a card 16 times in 30 days (Visa limit is 15).
- **Information Leakage**: Allowing fraudsters to "ping" cards repeatedly to determine balances.
- **Reputation Damage**: Issuers lowering your approval rate for *new* customers because your retry traffic is so noisy.

## Where observability fits
- **Safety Audits**: Scanning logs for illegal retry patterns.
- **Optimization**: "Retrying at 2am fails. Retrying at 9am on Payday succeeds. Shift the schedule."
- **Cohort Tracking**: Measuring the long-term value of recovered customers vs the cost of retries.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### When should I retry?
Only on "Soft Declines" (Insufficient Funds, Network Error).

### How often?
A standard Smart Dunning schedule: Day 1, Day 3, Day 7, Day 14.

### does Stripe handle this?
Yes, "Smart Retries" uses ML to optimize timing. But you are still liable if you add your own layer on top.

## See also
- [Retry Amplification](./how-retry-amplification-increases-exposure.md)
- [SaaS Risk](../verticals/payment-risk-observability-for-saas.md)
- [Decline Reason Codes](./understanding-decline-reason-codes.md)
