# How Retry Storms Form in Payment Systems

## Overview
A retry storm occurs when a failure in a payment system triggers a disproportionate volume of re-attempts, overwhelming downstream infrastructure (gateways, card networks). Unlike a DDoS attack, a retry storm is usually self-inflicted by legitimate systems reacting poorly to a temporary outage.

## What a retry storm is
Technically, it creates a feedback loop:
1.  **Initial Failure**: A gateway times out or returns a generic error.
2.  **Application Logic**: The merchant's billing engine automatically retries the payment immediately.
3.  **Customer Action**: The user, seeing a spinner or error, clicks "Pay" repeatedly.
4.  **Amplification**: 1 failed request becomes 10+ attempts in seconds.

## Common technical triggers
- **Timeout Loops**: The merchant's timeout (e.g., 5s) is shorter than the gateway's processing time (e.g., 10s), conducting a retry before the first request finishes.
- **Idempotency Failure**: Retries are not deduplicated, so the network sees them as unique, distinct authorization attempts.
- **Cascading Retries**: Service A retries Service B 3 times; Service B retries Service C 3 times = 9 total calls.

## Relationship to issuer behavior
Issuers view rapid-fire retries as a "velocity attack" (a sign of card testing).
- **Block**: The issuer's firewall bans the merchant's MID or the cardholder's pan.
- **Decline Shift**: A technical timeout evolves into a permanent structural decline (e.g., "Do Not Honor").

## Risk amplification effects
- **Fees**: Merchants pay authorization fees on every retry, even failed ones.
- **Reputation**: High error rates degrade the merchant's health score with the network.
- **False Positives**: Fraud models learn to associate the merchant with "robotic" traffic patterns.

## Operational visibility needs
- **Concurrency Tracking**: Monitoring how many duplicate requests are active for a single cart/user.
- **Error Taxonomy**: Distinguishing between "Busy/Throttled" errors (try later) and "Refused" errors (stop).
- **Circuit Breaking**: Global switches to stop all retries when a specific gateway error rate exceeds 10%.

## Where observability infrastructure fits
Infrastructure detects the *shape* of traffic spikes. It alerts when the ratio of `attempts : unique_orders` deviates from 1:1. By visualizing retry velocity in real-time, operators can identify a storm forming before it triggers network-level blocks.
