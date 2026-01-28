# Monitoring Dispute Ratios

## Overview
The dispute ratio is the primary metric used by card networks (Visa, Mastercard) to monitor merchant health. It typically compares the count of disputes to the count of sales transactions. Breaching specific thresholds (e.g., 0.9% for Visa, 1.0% for Mastercard) triggers monitoring programs, fines, or account closure.

## How dispute ratios are calculated
Calculations vary by network:
- **Count-based**: Number of disputes / Number of sales.
- **Volume-based**: Dollar value of disputes / Dollar value of sales.
- **Time Lag**: Most programs match disputes received in the current month against sales processed in the *same* month (or a prior window).

*Note: The denominator (sales count) is critical. A drop in sales volume can artificially spike the dispute ratio even if dispute count remains flat.*

## Why ratios change over time
Ratios fluctuate due to:
- **Seasonality**: High sales volume (e.g., Black Friday) dilutes the ratio; low volume (e.g., January) amplifies it.
- **Attack Cohorts**: A fraud attack from 3 months ago finally maturing into chargebacks.
- **Product Mix**: Launching a higher-risk product line or expanding into a new geography.

## Operational response requirements
When ratios trend high, operations teams need to:
- **Project Month-End**: Estimate where the ratio will land based on current velocity.
- **Increase Sales**: Legitimate transaction volume helps dilute the ratio (the "denominator effect").
- **Aggressive Refunds**: Pre-emptively refunding at-risk transactions to prevent them from becoming disputes.

## What infrastructure supports ratio tracking
Effective infrastructure provides:
- **Multi-Window Calculation**: Tracking daily, weekly, and monthly rolling ratios.
- **Threshold Alerting**: "Yellow zone" alerts (e.g., at 0.6%) before the "Red zone" (0.9%) is reached.
- **Attribution**: Breaking down ratios by product, affiliate, or BIN to find the driver.

## Where PayFlux fits
PayFlux provides automated dispute ratio monitoring. It continuously calculates ratios across connected processors and provides forecasting logic to predict month-end positions. PayFlux allows teams to see the trajectory of their dispute health, enabling proactive management before network thresholds are breached.
