# How Rolling Risk Windows Work

## Overview
Risk metrics are almost never evaluated solely on "today's" performance. They are measured over "rolling windows" (backward-looking time periods that move forward by one day every day). This smoothing mechanism prevents knee-jerk reactions to daily volatility but also delays the system's recognition of improvement.

## What rolling windows are
A "Trailing 30-Day Window" includes activity from `Today - 30 days`.
- **Jan 1**: Window covers Dec 2 - Jan 1.
- **Jan 2**: Window covers Dec 3 - Jan 2.
Old data "falls off" the back end as new data enters the front end.

## Why risk systems use them
- **Noise Reduction**: A merchant might have 0 disputes for 29 days and 5 disputes on day 30. A daily metric would panic; a rolling metric dilutes the spike.
- **Trend Detection**: Rolling averages expose the direction of travel (improving or deteriorating) better than raw daily counts.
- **Network Compliance**: Visa and Mastercard monitoring programs are explicitly defined on monthly (rolling or calendar) windows.

## Relationship to thresholds
Breaching a threshold (e.g., 1% dispute rate on a 30-day rolling basis) triggers a penalty. Because the window contains 29 days of history, a single "clean" day of processing has a negligible impact on the overall percentage.

## How decay and overlap behave
The impact of a bad event decays linearly. A dispute on Day 1 stays in the 30-day window for exactly 30 days. It weighs down the score just as heavily on Day 29 as it did on Day 1. It only ceases to matter on Day 31.

## Why recovery is delayed
Merchants often ask, "I stopped the fraud yesterday, why represent my reserve still high?"
**Answer**: Because the fraud from 2 weeks ago is still inside the rolling window. The metric won't reflect the "clean" state until the bad data fully exits the trailing horizon.

## Where observability infrastructure fits
Infrastructure visualizes the window mechanics. It tracks:
- **Window Composition**: "Your current score is X because of these specific events from 20 days ago."
- **Exit Projections**: "This large cluster of disputes will fall out of the window on Oct 14th, improving your score to Y."
- **Future Forecasting**: Simulating how tomorrow's expected volume will change the denominator of the rolling calculation.
