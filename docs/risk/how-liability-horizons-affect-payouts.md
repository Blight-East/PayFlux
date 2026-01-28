# How Liability Horizons Affect Payouts

## Overview
The "Liability Horizon" is the maximum duration for which a transaction remains a potential risk (chargeback or refund) to the processor. This timeline dictates how long a processor feels "nervous" about a specific dollar processed, influencing payout speeds and reserve terms.

## What liability horizons are
The horizon is defined by network rules and local laws.
- **Standard**: 120 days (most chargeback reason codes).
- **Extended**: 540 days (for "Services Not Provided" or delivery delays).
- **Legal**: Statute of limitations for contract disputes (years).

## How long disputes remain open
Even after a dispute is filed, it isn't "closed" instantly.
- **Pre-Arb**: The merchant fights, the issuer responds.
- **Arbitration**: The network acts as judge.
The lifecycle of a single dispute can extend the horizon by another 45-90 days.

## Why payouts lag exposure
If the processor pays the merchant on Day 2 (T+2), but the liability exists until Day 120, the processor is unsecured for 118 days.
- **Credit Risk**: The processor is effectively lending the merchant the money for 4 months, betting the merchant won't disappear.

## Relationship to reserves
Reserves bridge the gap between "Payout Speed" and "Liability Horizon."
- If you want T+1 payouts but have a T+120 liability, you need a reserve.
- If you accept T+30 payouts, the reserve can be lower because the processor holds the funds for a larger chunk of the risk window.

## Why exposure persists after volume drops
If a merchant stops processing today, the liability horizon does *not* disappear. The processor still has 120 days of historical sales that could turn into chargebacks. This is why processors hold funds long after a merchant closes their account.

## Where observability infrastructure fits
Infrastructure models the "Tail." It tracks:
- **Cohort Decay**: "We processed \$1M in Jan. It is now April. \$990k is safe, \$10k is still at risk."
- **Horizon Mapping**: Associating specific transaction types (Subscriptions vs Digital Goods) with their specific network liability windows.
- **Exposure Cap**: Alerting when the "Total Open Liability" exceeds the merchant's collateral or credit limit.
