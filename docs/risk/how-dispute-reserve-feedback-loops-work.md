# Dispute-Reserve Feedback Loops

## Definition
A Feedback Loop is a dangerous "Death Spiral" where a Risk action (Reserve) worsens the very metric it monitors (Disputes).
Reserve -> Cash Flow Crunch -> Service Failure -> Customer Anger -> More Disputes -> Higher Reserve.

## Why it matters
Survival. A feedback loop can destroy a healthy business in 60 days. Identifying the loop *early* allows you to plead with the processor for a "Release Valve" before the operational collapse becomes irreversible.

## Signals to monitor
- **Lead Time Correlation**: A spike in "Item Not Received" disputes lagging 2-3 weeks behind a Reserve increase.
- **Vendor Payment Health**: Tracking unpaid invoices to suppliers (a leading indicator of fulfillment failure).
- **Refund Failures**: Spikes in "Insufficient Funds" errors when attempting to refund customers (because the reserve locked the balance).

## Breakdown modes
- **The Liquidity Trap**: You have money in the reserve, but not in the bank. You can't ship the goods. Customers chargeback. The processor says "See! High risk!" and holds more.
- **Refund Block**: You try to refund angry customers to STOP the disputes, but the processor blocks the refund because your available balance is zero.

## Where observability fits
- **Causality Graph**: Visualizing "Event A (Reserve)" leading to "Event B (Dispute Spike)."
- **Cash Flow Runway**: "At current burn + reserve rate, operations cease in 12 days."
- **Divergence**: showing that *Quality* metrics (App uptime, shipping speed) dropped specifically *after* the financial constraint.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### How do I break the loop?
You must inject outside capital (Equity/Debt) to fulfill orders while the processor holds your revenue.

### Will the processor help?
Rarely. Their job is to protect themselves. They view the spiral as confirmation that you are insolvent.

### Can I pause sales?
Yes. Reducing volume lowers the absolute reserve amount and gives you time to clear the backlog.

## See also
- [Payment Reserves](./what-is-a-payment-reserve.md)
- [Negative Balance Cascades](./how-negative-balance-cascades-form.md)
- [Payout Delays](./how-payout-delays-work.md)
