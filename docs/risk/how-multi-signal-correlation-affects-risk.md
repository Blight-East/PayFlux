# How Multi-Signal Correlation Affects Risk

## Overview
Single risk signals (e.g., a high value transaction) are often false positives. "Correlated Risk" looks for the coincidence of multiple weak signals that, when combined, indicate a near-certainty of fraud or insolvency.

## What correlated signals are
- **Signal A**: Velocity Spike (Sales up 200%).
- **Signal B**: Geo Mismatch (IP != Billing Address).
- **Signal C**: Bin Cluster (All cards from one bank).
Individually, these might be explainable (Sale, Travel, Corporate event). Together, they are a card testing attack.

## Examples of correlated risk events
- **The "Bust-Out"**: High Velocity + High Average Ticket + Nighttime Processing.
- **The "Account Takeover"**: New Device ID + Password Change + Instant Withdrawal request.
- **The "Business Failure"**: Rising Refund Rate + Falling Sales Volume + Increasing Support Ticket Age.

## Why correlation increases severity
Risk engines use multiplicative scoring.
- Score(A) = 10
- Score(B) = 10
- Score(A + B) = 100
The presence of multiple independent warning signs collapses the probability space; it is statistically unlikely to be a coincidence.

## Relationship to automated controls
High-correlation events trigger "Auto-Kill" switches rather than "Manual Review."
- **Review**: "Check this weird ID."
- **Kill**: "Freeze the account immediately; we are being attacked."

## Why correlation is hard to unwind
If an account is frozen due to multi-signal correlation, the merchant has to disprove *all* the signals.
- "Yes, I had a sale (Velocity)."
- "Yes, I targeted users in Brazil (Geo)."
- "Yes, they used huge coupons (Ticket size)."
Explaining away a perfect storm of risk signals requires massive documentation.

## Where observability infrastructure fits
Infrastructure provides the "Reasoning Trace." It visualizes:
- **Signal Stack**: Showing exactly which combinations of factors triggered the high score.
- **Temporal Alignment**: displaying how the signals lined up on the timeline.
- **False Positive Tuning**: Helping teams identify valid business patterns (like a product drop) that mimic fraud correlations.
