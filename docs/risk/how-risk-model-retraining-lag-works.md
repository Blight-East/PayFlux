# How Risk Model Retraining Lag Works

## Overview
Machine earning models used by payment processors are not updated in real-time. They are retrained in batches. This introduces a "lag" between the emergence of a new fraud pattern and the system's ability to detect it. "Retraining Lag" explains why effective fraud attacks often last for days before being abruptly blocked.

## What model retraining is
Retraining is the process of feeding recent transaction data (approvals, declines, and chargebacks) back into the risk engine to update its weights.
- **Feedback Loop**: Yesterday's fraud becomes today's training data.
- **Latency**: The time it takes for a chargeback to materialize (30 days) means models are always learning from the past.

## Why retraining is delayed
- **Compute Cost**: Retraining deep learning models on petabytes of data is expensive and slow.
- **Stability Checks**: Engineers manually review new models to ensure they don't accidentally block legitimate traffic (false positive spikes).
- **Deployment Windows**: New models are often rolled out on a schedule (e.g., weekly) rather than continuously.

## Impact on real-world merchants
- **The "Safety" Period**: A new attack vector works flawlessly for 24-72 hours.
- **The "Cliff"**: Once the model updates, the attack stops working instantly. Valid transactions that resemble the attack pattern might also get swept up in the new block.

## Relationship to sudden risk events
A sudden spike in declines often indicates a model update, not a change in customer behavior. The rules of the game changed overnight because the "Referee" (the risk model) learned a new pattern.

## Why changes feel abrupt
Merchants experience risk as "binary": yesterday everything was fine, today everything is declined. This step-function behavior is a direct result of batch retraining. The model didn't gradually dislike the traffic; it suddenly "realized" the traffic was risky.

## Where observability infrastructure fits
Infrastructure tracks the *stability* of approval rates over time. It can differentiate between:
- **Drift**: A gradual decline in performance (customer behavior change).
- **Shift**: A sudden drop (model update).
PayFlux effectively "detects the detection," alerting operations teams when the underlying risk environment has shifted.
