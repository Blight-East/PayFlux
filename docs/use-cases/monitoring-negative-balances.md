# Monitoring Negative Balances

## Definition
A Negative Balance occurs when a merchant owes money to the processor. This happens when the volume of Refunds + Chargebacks + Fees > Sales Volume. The processor must cover this gap, creating a credit risk.

## Why it matters
It's a "Stop Work" event. Processors will pause all payouts and potentially freeze processing until the balance is topped up. For platforms, a negative balance on a connected account can block operations for that user.

## Signals to monitor
- **Balance State**: Is `available_balance` < 0?
- **Duration**: How many days has the balance been negative? (Aging).
- **Recovery Attempts**: Has the processor attempted to debit the bank account? (ACH Pull).
- **Liability Trend**: Is the negative balance growing (active refunds)?

## Breakdown modes
- **ACH Failures**: The processor tries to pull funds from the bank, but the debit fails (NSF), leading to account termination.
- **Payout blocking**: New sales are used to fill the hole, starving the merchant of cash flow.
- **Debt Collection**: The processor sending the account to collections.

## Where observability fits
- **Liquidity Tracking**: Visualizing the "Hole" that needs to be filled.
- **Alerting**: Notifying Finance immediately when a balance turns red.
- **Recovery Auditing**: Tracking the success of automated top-ups.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Can I process while negative?
Usually yes, but 100% of your sales will go towards paying back the debt. You won't see a payout.

### How do I fix it?
Wire funds to the processor or allow them to debit your bank account.

### Why did I go negative?
Commonly: processing a large batch of refunds right after a payout was sent (emptying the account).

## See also
- [Payment Settlements](../how-it-works/how-payment-settlements-work.md)
- [Payment Reserves](../risk/what-is-a-payment-reserve.md)
- [Refunds and Reversals](../risk/how-refunds-and-reversals-propagate.md)
