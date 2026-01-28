# How Payment Infrastructure Detects Risk Events

## Overview
Risk events are not subjective judgments of fraud or intent. They are objective system states triggered when processing metrics cross predefined safety thresholds. Detection systems monitor these metrics continuously to protect the settlement network from financial exposure.

## What is a risk event?
A risk event is a state transition within a payment processor’s control system. It occurs when a merchant account moves from a standard processing state to a restricted or monitored state. Common states include:

- **Active**: Standard processing with normal payout schedules.
- **Review**: Flagged for manual or automated assessment.
- **Reserve**: A percentage of funds is held to cover potential liabilities.
- **Suspended**: Processing or payouts are temporarily paused.

## How detection systems operate
Detection infrastructure relies on three core components:

1.  **Signal Ingestion**: Continuous collection of transaction data, dispute feedback, and platform metadata.
2.  **Threshold Evaluation**: Comparison of real-time signals against allowed variance limits.
3.  **State Transition**: Automated application of controls when limits are exceeded.

## Signal ingestion
Systems ingest signals from multiple sources:
- **Transaction Velocity**: Volume and count per time unit.
- **Authorization Rates**: Ratio of approved to declined attempts.
- **Dispute Activity**: Inbound chargebacks and pre-dispute alerts.
- **Refund Patterns**: Ratio of refunds to sales.

## Threshold evaluation
Each merchant account operates within specific risk parameters. A threshold breach occurs when:
- Dispute rates exceed network monitoring programs (e.g., >0.9%).
- Refund rates deviate significantly from historical averages.
- Processing volume spikes beyond agreed underwriting limits.
- Unauthorized cross-border traffic is detected.

## State transition
When a threshold is breached, the system executes a state transition. This may be:
- **Immediate**: Automatic suspension or reserve application for high-severity signals.
- **Latent**: Queuing for analyst review for lower-severity anomalies.

## Why detection appears sudden
To the merchant, risk events often feel sudden because the contributing signals accumulate silently over time (e.g., delayed chargeback arrival). The system state changes only when the cumulative risk exceeds the safety buffer.

## Role of human review
While detection is often automated, resolution frequently involves human analysts who:
- Verify the legitimacy of the anomaly.
- Review submitted documentation.
- Determine if the risk state can be reverted.

## What infrastructure can and cannot do
Infrastructure monitoring can:
- **Surface** the specific signals that triggered a state change.
- **Track** the timeline of the event.
- **Correlate** the event with historical patterns.

It **cannot**:
- Override the processor’s risk model.
- Prevent the system from applying controls.
- Guarantee a specific review outcome.

## Where PayFlux fits
PayFlux operates as an observability layer for payment risk. It ingests the same signals as the processor to provide visibility into risk accumulation and state transitions. PayFlux provides the historical data needed to understand *why* a risk event occurred, ensuring operational clarity without claiming control over the detection process.
