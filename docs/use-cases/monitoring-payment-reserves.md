# Monitoring Payment Reserves

## Overview
Payment reserves are funds held back by a processor to cover potential future liabilities (refunds, chargebacks). Reserves are a standard risk control mechanism but can create significant cash flow unpredictability if not monitored.

## Common reserve structures
Reserves typically follow one of three models:
- **Rolling Reserve**: A percentage (e.g., 10%) of every transaction is held and released after a fixed period (e.g., 180 days).
- **Fixed Reserve**: A static amount (e.g., $50,000) is held permanently in a separate balance.
- **Minimum Balance**: The account must maintain a minimum available balance before payouts are released.

## How reserve changes occur
Reserves are dynamic controls:
- **Imposition**: A processor activates a reserve based on a risk review.
- **Adjustment**: The percentage or duration increases if risk signals (disputes) worsen.
- **Release**: Funds are released back to the available balance as they mature or if the reserve is lifted.

## Operational response requirements
When a reserve changes, finance and ops teams need to:
- **Forecast Cash Flow**: Update models to account for the reduced immediate liquidity.
- **Audit Triggers**: Understand *why* the reserve was imposed (e.g., did dispute rates spike?).
- **Verify Release**: Ensure that funds are actually becoming available on the promised schedule.

## What infrastructure supports reserve visibility
Effective infrastructure provides:
- **Balance Segmentation**: Clearly distinguishing between "available" and "reserved" funds.
- **Change Alerting**: Notifying stakeholders when reserve terms are modified.
- **Release Tracking**: Monitoring the "unlocking" of rolling reserve buckets over time.

## Where PayFlux fits
PayFlux provides structural visibility into processor reserve accounts. It tracks the balance state and logs term changes, ensuring finance teams have an accurate view of liquidity. PayFlux operationalizes reserve data, independent of the processor's dashboard, to support better financial planning.
