# How Refunds and Reversals Propagate

## Overview
Refunds and reversals are mechanisms to return funds to a cardholder. While they appear similar to the consumer, they operate on different infrastructure rails and behave differently in terms of speed, cost, and state finality.

## Refund vs reversal vs chargeback
- **Reversal (Void)**: Cancelling an authorization *before* settlement. The funds never leave the cardholder’s bank. No fees are incurred.
- **Refund**: Returning funds *after* settlement. The merchant sends a new credit transaction. Processing fees are usually not returned.
- **Chargeback**: A forced refund initiated by the bank. This incurs a penalty fee and counts against the merchant's risk ratios.

## Timing and state transitions
Propagation timelines vary by type:
1.  **Reversal**: Instant. The pending charge disappears from the statement.
2.  **Refund**: Async (3-10 days). The original charge remains, and a separate credit line item appears later.
3.  **Chargeback**: Slow (30-90 days). The dispute process involves evidence submission and decision cycles.

## Ledger and balance impact
Refunds leverage the merchant’s held balance:
- **Available Balance**: Refunds are deducted from funds waiting to be paid out.
- **Negative Balance**: If the balance is insufficient, the refund creates a debt (negative balance) that must be covered by a bank debit.
- **Reserve Usage**: In some cases, refunds deplete the risk reserve before hitting the operating balance.

## Operational challenges
- **Double Refund Risk**: Refunding a transaction that has *already* been disputed (leading to a lost chargeback AND a voluntary refund).
- **ARN Tracking**: Acquirer Reference Numbers (ARNs) are needed to prove to a customer that a refund was sent.
- **Orphaned Credits**: Refunds that succeed at the processor but fail to reach the closed card account.

## Where observability infrastructure fits
Infrastructure tracks the linkage between the original sale and the subsequent return event. It ensures:
- **State Consistency**: Preventing refunds on already-disputed charges.
- **Fee Visibility**: Calculating the net cost of the return (original fee + lost revenue).
- **Lifecycle Finality**: Confirming the refund actually settled to the network, not just the processor.
