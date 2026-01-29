# Negative Balance Cascades

Up: [What Is a Payment Reserve](what-is-a-payment-reserve.md)
See also:
- [Payment Reserves & Balances](mechanics-payment-reserves-and-balances.md)
- [How Reserve Release Logic Works](how-reserve-release-logic-works.md)
- [Why Payment Processors Freeze Funds](why-payment-processors-freeze-funds.md)


## Definition
A Negative Balance Cascade is a financial chain reaction.
Step 1: Returns exceed Sales -> Negative Balance.
Step 2: Processor debits Bank Account -> Debit Fails (NSF).
Step 3: Processor freezes processing -> No new Sales to fill hole.
The merchant is trapped: they need sales to fix the balance, but can't process sales *because* of the balance.

## Why it matters
Existential Risk. This state kills startups. It converts an operational problem (high returns) into a terminal infrastructure problem (Loss of Ability to Transact).

## Signals to monitor
- **Daily Net**: (Sales - Refunds - Disputes - Fees). If < 0, danger.
- **Bank Balance**: Ensuring operational accounts always cover at least 3 days of peak refund volume.
- **Recovery Status**: `debit_failed` events from the processor.

## Breakdown modes
- **The Weekend Gap**: Refunds process 24/7. Settlements (Deposits) only happen Mon-Fri. You can go massively negative on Saturday and recover on Monday, but the "Low Point" might trigger a risk freeze on Sunday.
- **Fee Shock**: Processor debiting monthly fees ($5k) from a low-volume account, pushing it negative.

## Where observability fits
- **Liquidity Monitoring**: Real-time ticker of "Available Processor Balance."
- **Debit Prediction**: "Warning: Large negative batch closing in 2 hours. Ensure bank funds are available."
- **Collection Tracking**: Monitoring the processor's attempts to recover funds.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Can I wire money to fix it?
Yes. Most processors allow a "Wire Top-up" to clear a negative balance.

### Will they sue me?
If the amount is large and you go silent, yes. It is a debt.

### How do I prevent it?
Keep a "Float" in your processor account (don't pay out 100% of sales daily).

## See also
- [Monitoring Negative Balances](../use-cases/monitoring-negative-balances.md)
- [Payment Reserves](./what-is-a-payment-reserve.md)
- [Settlement Failures](../use-cases/monitoring-settlement-failures.md)
