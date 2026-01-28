# How Dispute Aging Curves Work

## Overview
A dispute aging curve (or "vintage curve") visualizes how chargebacks materialize over time for a specific cohort of sales. It answers the critical question: "Of the sales we processed in January, how many have been disputed *so far*, and how many *will be* disputed total?"

## Dispute lifecycle stages
1.  **Sale Date**: The transaction occurs (Day 0).
2.  **Incubation**: The silent period where the cardholder has not yet noticed or acted (Days 1-30).
3.  **Arrival**: The first disputes arrive, usually from "friendly fraud" or immediate regret (Days 31-60).
4.  **Tail**: Late-arriving disputes from statement reviews or compromised cards (Days 61-120).

## Time-based risk accumulation
Risk is not static. A "low risk" month can turn into a "high risk" month 90 days later as the cohort matures.
- **Green Zone**: Early performance looks good (0.1% dispute rate).
- **Red Zone**: Maturation pushes the final rate above 1.0%, triggering fines retroactively.

## Why loss probability changes over time
Different fraud types arrive at different speeds:
- **Friendly Fraud**: Fast. Customers recognize the charge and dispute it immediately.
- **True Fraud**: Slower. Cardholders may not check statements for weeks.
- **Auth Fraud**: Slowest. Stolen cards are often used for months before the account is closed.

## Network-specific timing rules
- **Visa**: Typically monitors the ratio of (Current Month Disputes / Current Month Sales).
- **Mastercard**: Often looks at (Current Month Disputes / Sales from the Transaction Month).
*Note: Understanding which denominator is used is crucial for compliance.*

## Where observability infrastructure fits
Infrastructure models the "expected" vs "actual" curve. It tracks:
- **Vintage Analysis**: Plotting the curve for each sales month independently.
- **Projection**: Using historical decay rates to predict the final landing point of a current month's cohort.
- **Alerting**: Flagging if a recent cohort is "maturing faster" than the historical average (steepening curve).
