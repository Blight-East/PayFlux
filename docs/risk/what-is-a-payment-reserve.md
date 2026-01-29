# Payment Reserves

Up: [Payment Reserves & Balances](mechanics-payment-reserves-and-balances.md)
See also:
- [What is Reserve Formation?](what-is-reserve-formation.md)
- [How Reserve Release Logic Works](how-reserve-release-logic-works.md)


## Definition
A Payment Reserve is a capital protection mechanism where a processor temporarily withholds a portion of a merchant's settled funds. This capital acts as collateral covering potential future liabilities, such as refunds, disputes, or fines, which may occur after the original transaction date.

## Why it matters
Payment systems operate with a "liability lag." A customer can file a dispute 120 days after a sale. Since the processor often pays the merchant within 2 days, the processor is essentially extending 118 days of unsecured credit. Reserves close this gap, ensuring funds exist to cover losses if the merchant becomes insolvent or disappears.

## Signals to monitor
- **Net Payout Discrepancy**: Payout amounts being lower than "Settled Sales minus Fees."
- **Ledger Entries**: Specific line items for `reserve_transaction` or `balance_held`.
- **Release Schedule**: Dates attached to held funds indicating when they will become available.
- **Notification Events**: Webhooks or emails triggering upon reserve imposition.

## Breakdown modes
- **Rolling Extension**: A 90-day rolling window abruptly extending to 180 days due to risk spikes.
- **Fixed Hold**: A sudden lump-sum debit to fill a required collateral bucket.
- **Release Failure**: Funds scheduled for release remaining locked due to system error or policy renewal.

## Where observability fits
- **Release Forecasting**: Projecting cash flow by adding "Scheduled Releases" to "Expected Settlements."
- **Cause Attribution**: Linking specific risk events (e.g., a dispute spike) to the reserve increase.
- **Audit History**: maintaining a permanent record of all hold/release events for reconciliation.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Is a reserve a fine?
No. The money still belongs to the merchant. It is just time-shifted. You will receive it eventually, provided no losses consume it.

### Can I withdraw my reserve?
No. By definition, it must be held by the processor.

### Why did they reserve 100% of my funds?
This usually indicates a "Termination Reserve." If a processor closes an account, they may hold all funds for the duration of the liability window (often 120-180 days) to cover trailing chargebacks.

## See also
- [Payment Risk Events](../pillars/payment-risk-events.md)
- [Reserve Release Logic](./how-reserve-release-logic-works.md)
- [Rolling Risk Windows](./how-rolling-risk-windows-work.md)
