# How Fraud Model Drift Occurs

## Overview
Fraud models are trained on historical data. "Model Drift" is the degradation of a model's predictive power as the real-world behavior of fraudsters and legitimate customers changes over time. It is the reason why a "perfect" fraud filter eventually becomes useless.

## What model drift is
- **Training Data**: 2023 Fraud Patterns (Stolen Credit Cards).
- **Live Data**: 2025 Fraud Patterns (Synthetic Identity + Real-time Payment Scams).
- **Result**: The model is looking for the wrong signals.

## Why transaction populations change
- **New Products**: Selling high-risk crypto instead of low-risk t-shirts changes the buyer profile.
- **New Markets**: Launching in Brazil introduces different velocity/payment habits than the US.
- **Macroeconomics**: Recessions increase "Friendly Fraud" (customers disputing valid charges to save money).

## How drift degrades accuracy
- **False Negatives**: The model fails to catch new attack types (Fraud gets through).
- **False Positives**: The model flags valid new customer behaviors as suspicious (Good sales are blocked).

## Relationship to approval rates
Drift often manifests as a slow erosion of approval rates.
- **Day 1**: 95% Approval.
- **Day 90**: 94% Approval.
- **Day 180**: 91% Approval.
The decline is subtle enough to be ignored day-to-day but significant over quarters.

## Why retraining lags
Retraining requires "Labeled Data" (knowing for sure what was fraud). Chargebacks take 90 days to arrive. Therefore, the ground truth is always 3 months old. You are always correcting for the drift that happened last quarter, not today.

## Where observability infrastructure fits
Infrastructure provides "Drift Detection" proxies. It tracks:
- **Feature Distribution**: "Why did the average transaction amount suddenly jump by 50%?"
- **Score Distribution**: "Why is the model scoring 80% of users as 'Low Risk' when it used to be 95%?"
- **Hold-Out Performance**: Running a shadow model to compare against the production model in real-time.
