# How Reserve Release Logic Works

## Overview
A "Rolling Reserve" holds a percentage of a merchant's daily processing volume (e.g., 10%) for a fixed duration (e.g., 180 days) to cover potential future chargebacks. "Release Logic" dictates when and how that money is returned to the merchant.

## What reserves are designed to cover
Reserves are collateral against "Tail Risk."
- **The Gap**: A merchant processes \$1M in January and goes bankrupt in February.
- **The Liability**: Cardholders dispute the January charges in March. The processor must refund them. The reserve pays for this.

## Why release is delayed
Release logic mirrors the "Dispute Aging Curve."
- **Day 1**: 100% risk (Sale just happened).
- **Day 90**: 20% risk (Most disputes would have happened by now).
- **Day 180**: 1% risk (Chargeback window is effectively closed).
Processors hold funds until the probability of a chargeback drops to near zero (typically 180 days).

## Relationship to dispute aging
The release schedule is often tied to the specific "Vintage" of the funds.
- **Fixed Release**: "On July 1st, release the funds captured on January 1st."
- **Performance Release**: "If the dispute rate stays below 0.5%, release funds early. If it spikes, extend the hold."

## Risk of early release
Releasing reserves too early is the #1 cause of processor losses. If the processor releases the collateral and then a wave of disputes arrives, the processor is left holding the bag.

## Why reserves feel opaque
Merchants see a "Negative Balance" or "Unavailable Funds" but often lack a detailed ledger showing *exactly* which bucket of money is scheduled for release on which date. This lack of transparency causes immense friction.

## Where observability infrastructure fits
Infrastructure provides the "Collateral Ledger." It tracks:
- **Bucket Aging**: Tracking the age of every dollar held in reserve.
- **Release Schedule**: projecting future cash flows ("You will receive \$50k on Monday from the Jan 1-7 bucket").
- **Net Position**: Real-time calculation of `(Total Reserves - Expected Liabilities)`.
