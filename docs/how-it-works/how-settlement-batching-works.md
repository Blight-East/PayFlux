# Settlement Batching

## Definition
Settlement Batching is the operational step of grouping authorized transactions into a single file "envelope" to be sent to the processor. This usually happens once every 24 hours (e.g., at 5 PM).

## Why it matters
The "Batch Close" is the moment of truth. Before the batch closes, a transaction can be **Voided** (cancelled cheaply). After the batch closes, it must be **Refunded** (costing fees). Batch timing dictates exactly when you get paid.

## Signals to monitor
- **Batch State**: Is the current batch `open` or `closed`?
- **Transaction Count**: Number of items in the envelope.
- **Net Total**: The mathematical sum of (Sales - Credits) inside the batch.
- **Error Responses**: Rejections of the entire batch file by the processor.

## Breakdown modes
- **Upload Failure**: Connectivity issues preventing the batch file from reaching the acquirer (funds delayed 24h).
- **Held Batch**: One suspicious transaction causing the processor to flag the *entire* batch for review.
- **Negative Batch**: Refunds exceeding sales, resulting in a debit owed to the processor.

## Where observability fits
- **Lifecycle Monitoring**: Alerting if a batch fails to close on schedule.
- **Deposit Matching**: Tracking which specific batch corresponds to which bank deposit.
- **Void Opportunity**: Identifying transactions that should be voided *before* the batch closes to save fees.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Can I force a batch close?
On legacy terminals, yes ("Batch Out"). On modern APIs (Stripe/Adyen), batching is usually automated by the platform.

### What is "Intraday" batching?
Closing batches multiple times a day (e.g., every 6 hours) to speed up funding or align with shift changes.

### Why did my batch fail?
Often due to a single malformed transaction or an interrupting connectivity failure during the upload handshake.

## See also
- [Payment Settlements](./how-payment-settlements-work.md)
- [Refunds and Reversals](../risk/how-refunds-and-reversals-propagate.md)
- [Payout Delays](../risk/how-payout-delays-work.md)
