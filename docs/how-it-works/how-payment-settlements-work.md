# Payment Settlements

## Definition
Settlement is the batch process of moving actual funds from the Cardholder's Issuing Bank -> Card Network -> Acquiring Bank -> Merchant. It is distinct from **Authorization** (which just holds the money) and **Capture** (which requests the money).

## Why it matters
Sales are vanity; Settlement is sanity. A transaction can be "Approved" but never settle (if it's voided or the batch fails). Understanding settlement timelines (T+2, T+3) is critical for managing cash flow and recognizing when funds are stuck.

## Signals to monitor
- **Batch Closure**: The daily event where captured transactions are grouped and sent.
- **Fedwire/ACH Alerts**: Notifications of inbound bank transfers.
- **Net Deposit**: The actual amount hitting the bank (Sales - Refunds - Fees - Reserves).
- **Deposit Latency**: The time gap between "Batch Close" and "Cash in Bank."

## Breakdown modes
- **Missed Cutoff**: Capturing a transaction at 5:01 PM means it waits 24 hours for the next batch.
- **Bank Holidays**: Weekends and holidays stopping the movement of ACH files.
- **Risk Holds**: Valid transactions being captured but the *settlement* being paused by risk logic.

## Where observability fits
- **Reconciliation**: Matching every "Captured" order ID to a "Settled" line item.
- **Gap Detection**: Identifying "Missing Money" where the processor says they paid, but the bank never received it.
- **Fee Verification**: calculating the effective take rate by comparing Gross Sales vs Net Deposit.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Why does it take 2 days?
Legacy banking rails (ACH/Fedwire) and the need for the Card Network to calculate the "net settlement" position between thousands of banks.

### What is T+2?
Transaction Date + 2 Business Days. If you sell on Monday, you get paid Wednesday.

### Can I get paid instantly?
Some processors offer "Instant Payouts" (Push to Debit), but they usually charge an extra fee (1-1.5%) for bypassing the slow ACH rails.

## See also
- [Settlement Batching](./how-settlement-batching-works.md)
- [Payment Reserves](../risk/what-is-a-payment-reserve.md)
- [Payout Delays](../risk/how-payout-delays-work.md)
