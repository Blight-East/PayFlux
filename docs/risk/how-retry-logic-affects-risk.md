# How Retry Logic Affects Risk

## Overview
Retry logic is the automated process of re-submitting a declined transaction. While retries can recover lost revenue from temporary failures (like "Insufficient Funds"), aggressive or improper retries amplify risk signals and can trigger network enforcement.

## What retry logic is
Retry strategies define:
- **Timing**: How long to wait before trying again (Dunning cycle).
- **Frequency**: How many times to retry total.
- **Conditionals**: Which decline codes are eligible for retry.

## How retries change network signals
Every retry counts as a new authorization attempt.
- **Good Retry**: Retrying a "Soft Decline" (temporary issue) leads to an improved approval rate.
- **Bad Retry**: Retrying a "Hard Decline" (e.g., Stolen Card, Account Closed) is forbidden by network rules.
- **Signal Noise**: Excessive retries inflate the transaction count, artificially lowering the overall approval rate ratio.

## Balance and dispute effects
- **Balance**: Successful retries increase revenue.
- **Disputes**: Retrying a customer too aggressively can lead to a "Processing Error" or "Authorization" dispute if the customer believed the service was cancelled.

## Operational tradeoffs
Merchants must balance recovery vs. compliance:
- **Too Passive**: Leaving revenue on the table.
- **Too Aggressive**: Triggering excessive retry fines and damaging network reputation.

## Where observability infrastructure fits
Infrastructure audits the retry loop to ensure compliance. It tracks:
- **Retry Success Rate**: The % of retries that convert to success.
- **Error Code Compliance**: Alerting if a hard decline code is ever retried.
- **Velocity Limits**: Ensuring retries do not exceed network frequency caps (e.g., 15 attempts in 30 days).
