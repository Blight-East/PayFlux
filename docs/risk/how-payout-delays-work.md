# Payout Delays

## Definition
Payout Delays occur when a processor pauses the settlement of funds for a specific batch or time period. Unlike a "Freeze" (which is indefinite), a Delay is usually temporary (24-72 hours) while a specific risk signal is investigated.

## Why it matters
Cash Flow. Most merchants operate on tight cycles (Received funds Pay for Inventory). A 3-day delay can cause a merchant to miss payroll or default on vendor payments, creating a cascade of failure.

## Signals to monitor
- **Transit Time**: "Avg Time from Batch Close to Bank Deposit" (Standard T+2).
- **Batch Status**: Moving from `paid` to `in_transit` or `pending_review`.
- **Weekend Effects**: Accounting for non-banking days properly in the forecast.

## Breakdown modes
- **The Weekend Trap**: A Friday batch delayed by 1 day settles on Tuesday instead of Monday.
- **The Holiday Cluster**: A 3-day banking holiday causing 4 days of sales to dump into the bank at once (triggering AML alerts).
- **The Silent Hold**: Processor holding funds without sending an email notification.

## Where observability fits
- **SLA Tracking**: "Processor promised T+2. Actual is T+4. We define this as a Delay."
- **Cash Forecasting**: "Given the delay, do we have enough cash in the operating account for Friday payroll?"
- **Anomaly Detection**: "Why is the batch for the 15th still pending while the 16th is paid?"

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Is a delay a ban?
Usually no. It is an investigation. If you pass, funds release.

### Can I speed it up?
No. Wires move at bank speed. Instant Payouts (Push to Card) are faster but riskier.

### Why do they hold weekends?
Because the Federal Reserve (ACH system) is closed on weekends.

## See also
- [Monitoring Payout Delays](../use-cases/monitoring-payout-delays.md)
- [Payment Settlements](../how-it-works/how-payment-settlements-work.md)
- [Compliance Timing Gaps](./how-compliance-timing-gaps-form.md)
