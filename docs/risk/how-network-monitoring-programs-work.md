# How Card Network Monitoring Programs Work

## Overview
Visa and Mastercard operate monitoring programs to police the specialized ecosystem. These programs (like Visa's VFMP/VDMP or Mastercard's ECP) enforce thresholds for disputes and fraud. Entering a program brings fines, intense scrutiny, and the threat of permanent termination.

## What monitoring programs are
They are "penalty boxes" for merchants who exceed network safety limits.
- **Standard Programs**: For general high dispute rates (e.g., >0.9%).
- **Excessive Programs**: For dangerously high rates (e.g., >1.8%).
- **Fraud Programs**: Specifically for fraud-coded chargebacks (TC40/SAFE data).

## How merchants enter them
Entry is automatic based on monthly metrics.
- **Threshold 1 (Count)**: E.g., > 100 disputes/month.
- **Threshold 2 (Ratio)**: E.g., > 0.9% Dispute-to-Sales ratio.
Both must be breached to trigger entry. This protects small merchants (who might have 1 dispute on 10 sales = 10% ratio) from being penalized.

## What metrics trigger escalation
Once in a program, the clock starts ticking.
- **Month 1-3**: Warning / Small Fines.
- **Month 4-6**: Escalating Fines (often \$25k - \$100k per month).
- **Month 7+**: Card brand disqualification (Merchant is banned from accepting Visa/MC).

## Relationship to processor actions
Processors are liable for these fines if the merchant doesn't pay. Therefore, processors will preemptively shut down or reserve a merchant *before* they hit the network limits. The processor's internal threshold is always stricter than the network's threshold.

## Duration and exit conditions
Exiting is harder than entering.
- **The "3-Month Rule"**: Typically, a merchant must be below the threshold for 3 consecutive months to exit.
- **Probation**: One bad month resets the clock.

## Where observability infrastructure fits
Infrastructure serves as the "Speed Limit Warning." It tracks:
- **Projected Ratio**: Forecasting the month-end ratio based on current day's volume.
- **Program Status**: Explicitly tracking "Months in Program" and "Months Clean."
- **Fine Liability**: calculating potential fines based on current tiers to inform reserve logic.
