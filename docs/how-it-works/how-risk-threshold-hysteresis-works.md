# How Risk Threshold Hysteresis Works

## Overview
In physics, hysteresis is the dependence of the state of a system on its history. In payment risk, it means the threshold to *enter* a penalty box is different from the threshold to *exit* it. Once a merchant is flagged as high-risk, returning to "normal" status is structurally difficult.

## What hysteresis means in risk systems
- **Entry Threshold**: Dispute rate > 1.0%.
- **Exit Threshold**: Dispute rate < 0.6% for 3 consecutive months.
Just fixing the problem isn't enough; the merchant must "over-correct" to prove stability.

## Why thresholds are sticky
Risk teams are conservative. If a merchant breaches a safety limit, trust is broken. The system requires a "cooling-off period" or meaningful data to rebuild that trust. The lower exit threshold acts as a buffer against volatility.

## Relationship to incident cascades
Hysteresis creates a "trap." A short-term incident (e.g., one bad week of fraud) can trigger a penalty state (Reserve) that lasts for months. The punishment outlives the crime.

## Why recovery takes longer than failure
- **Observation Window**: To prove a dispute rate is <0.9%, the processor needs to wait 90 days for the cohort to mature.
- **Manual Review**: Exiting a penalty state often requires human sign-off, which is slower than the automated trigger that applied the penalty.

## Operational impact
Merchants must plan for "Recovery Mode," where they drastically reduce risk tolerance (blocking even borderline good sales) to drive metrics down far enough to escape the hysteresis zone.

## Where observability infrastructure fits
Infrastructure visualizes the gap between "Current Status" and "Target Status." It tracks:
- **Distance to Healthy**: "You are at 0.8%, you need to be at 0.5% to release the reserve."
- **Burn-down**: projecting when the metric will cross the exit threshold based on current volume.
PayFlux prevents the "Mission Accomplished" fallacy, reminding teams that hitting the *normal* limit isn't enough—they have to hit the *recovery* limit.
