# Settlement Failures

## Definition
Settlement Failure Monitoring tracks the successful movement of funds from the processor to the merchant's bank account. A "Sent" payout in the dashboard does not guarantee "Received" funds in the bank.

## Why it matters
Cash is oxygen. A settlement failure breaks the link between "Revenue" and "Cash." Identifying failures early (before checks bounce) is critical for treasury management.

## Signals to monitor
- **Bank Feed Match**: Reconciling the Processor Settlement Report against the Bank Statement Feed.
- **Webhooks**: `payout.failed` or `transfer.returned`.
- **Reason Codes**: `account_closed`, `no_account`, `currency_mismatch`.
- **Fee Integrity**: Ensuring the deposit amount matches [Sales - Fees].

## Breakdown modes
- **Account Closure**: Merchant's bank account closed, causing the wire to bounce.
- **Name Mismatch**: The business name on the bank account doesn't match the processor's file (common in incorporation changes).
- **Currency Block**: Sending USD to a EUR account without multi-currency capability.

## Where observability fits
- **Gap Analysis**: "Processor says they sent $50k. Bank says we received $49k. Where is the $1k?"
- **Latency Tracking**: "Payouts usually take 2 days. This one is at 4 days. Alert."
- **Fee Auditing**: Catching "Hidden Fees" taken out before settlement.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### What happens to the money?
It sits in "Limbo" (Processor Balance) until you provide valid bank details to retry.

### Why does it take so long to fail?
ACH/Wires are slow. A return can take 2-3 business days to propagate back to the sender.

### Can I get a tracking number?
Yes. Ask for the "IMAD/OMAD" or "Trace Number" to give to your bank.

## See also
- [Payment Settlements](../how-it-works/how-payment-settlements-work.md)
- [Payout Delays](../risk/how-payout-delays-work.md)
- [Monitoring Payout Delays](./monitoring-payout-delays.md)
