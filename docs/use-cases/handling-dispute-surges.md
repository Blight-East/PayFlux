# Handling Dispute Surges

## Overview
A dispute surge is a rapid increase in incoming chargebacks that threatens to breach processor monitoring programs (typically >0.9% or >1% dispute rate). Surges require immediate operational attention to identify the root cause—whether it be fraud, a fulfillment error, or a billing confusion.

## Common dispute surge patterns
Surges often manifest as:
- **Fraud Attacks**: A card testing attack resulting in a wave of unauthorized disputes.
- **Shipping Failures**: A logistics breakdown leading to "Item Not Received" claims.
- **Billing Errors**: Double charges or unrecognized descriptor text causing consumer confusion.
- **Subscription Renewals**: Annual renewal cycles triggering "don't recognize" claims.

## How surge detection works
Detection relies on velocity and ratio monitoring:

1.  **Absolute Velocity**: Count of disputes per day/week.
2.  **Relative Ratio**: Disputes divided by sales transaction count (monitoring the crucial 0.9% threshold).
3.  **Cohort Analysis**: Tracking disputes back to the original transaction date to see which "sales vintage" is toxic.

## Operational response requirements
Teams facing a surge need to:
- **Pause traffic**: Stop new transactions if the source is an active fraud attack.
- **Refund aggressively**: Pre-emptively refunding risky transactions before they turn into disputes to lower the ratio.
- **Update descriptors**: If the issue is recognition, clarify the statement descriptor clarity.
- **Submit evidence**: Managing the influx of representments efficiently.

## What infrastructure supports surge management
Effective infrastructure provides:
- **Real-time Alerting**: Notifying teams the moment the ratio trends upward.
- **Root Cause Analysis**: Grouping disputes by BIN, country, product, or affiliate to find the common vector.
- **Threshold Projection**: Forecasting where the dispute rate will be at month-end based on current trends.

## Where PayFlux fits
PayFlux acts as an early warning system for dispute surges. It aggregates dispute data across processors and projects future ratios, giving teams time to react before hard network thresholds are breached. PayFlux provides the analytical view needed to isolate the surge source, though it does not manage the evidence submission process itself.
