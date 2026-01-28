# How Shadow Risk Accumulates

## Overview
"Shadow Risk" refers to financial exposure that exists in reality but has not yet materialized in the primary ledger or dashboard. It is the "dark matter" of payment risk—invisible until it hits the balance sheet all at once.

## What shadow risk is
It is the delta between "Perceived Cash Position" and "Actual Solvency."
- **Example**: A merchant has \$10k in their account. They have processed \$50k in high-risk sales yesterday that are not yet settled but have already been shipped. If those sales turn out to be fraudulent, the merchant is actually \$40k in debt, but the dashboard shows green.

## Common sources of hidden exposure
- **Unsettled Funds**: Transactions that are authorized but not captured/settled.
- **Pending Disputes**: Retrieval requests (pre-disputes) that haven't converted to chargebacks yet.
- **Delayed Reversals**: ACH returns that take 3-5 days to bounce (e.g., R01 - Insufficient Funds).

## Relationship to lagging metrics
Dashboards act as rear-view mirrors.
- **Chargeback Rate**: Reflects sales from 1-3 months ago.
- **Refund Rate**: Reflects operational decisions from 1-7 days ago.
- **Shadow Risk**: Is the *prediction* of future losses based on current activity.

## Why it escapes dashboards
Most dashboards sum up "Settled Transaction Status." They do not sum up "Potential Liability of Open Authorizations." Shadow risk lives in the *state transitions* (Auth -> Settle, Settle -> Dispute), not in the static states.

## How it surfaces suddenly
Shadow risk collapses into real loss during "Settlement Batches."
- **Monday**: 100 R01 returns arrive at once.
- **Impact**: The merchant's balance goes from +\$100k to -\$50k in a single update tick.

## Where observability infrastructure fits
Infrastructure illuminates the shadow. It tracks:
- **Pending Exposure**: Sum of all authorized-but-not-settled funds.
- **Return Probability**: Estimating the % of ACH deposits that will bounce based on bank signaling.
- **Vintage Analysis**: Projecting the "expected chargebacks" of the current month's cohort before they happen.
