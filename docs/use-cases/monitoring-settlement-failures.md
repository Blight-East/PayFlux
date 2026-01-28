# Monitoring Settlement Failures

## Overview
A settlement failure occurs when the funds expected from a processor do not arrive in the merchant's bank account, or when the transfer fails to post. These failures disrupt cash flow and create reconciliation gaps that can be difficult to trace without granular logging.

## How settlement failures occur
Common causes include:
- **Bank Rejects**: The receiving bank rejects the incoming ACH/wire due to incorrect account details or frozen status.
- **Currency Mismatches**: Attempting to settle USD into a GBP account without proper FX instructions.
- **Ledger Drift**: The processor’s internal ledger shows "paid," but the banking rail failed mid-transit.
- **Cutoff Timing**: A batch submitted seconds after the deadline, pushing settlement to the next cycle (perceived failure).

## Risk implications
- **Liquidity Gaps**: Operational expenses (payroll, vendors) cannot be met.
- **Reconciliation Debt**: Accumulating unmatched transactions that complicate month-end closing.
- **Partner Trust**: Repeated settlement errors often signal instability at the processor or banking partner level.

## Operational response requirements
When a failure is detected, finance teams must:
- **Trace the Wire**: Obtain the IMAD/OMAD reference numbers to track the funds.
- **Update Instructions**: Correct invalid rooting numbers or account details.
- **Re-initiate**: Request the processor to re-send the returned funds.

## What infrastructure supports settlement monitoring
Robust infrastructure ensures:
- **3-Way Reconciliation**: Matching (1) Recorded Sales vs. (2) Processor Payouts vs. (3) Bank Statement Entries.
- **Status Webhooking**: Listening for "payout.failed" events from the processor.
- **Aging Analysis**: Flagging any payout that remains in "in_transit" status beyond the standard T+3 window.

## Where PayFlux fits
PayFlux independently audits the settlement lifecycle. It compares the processor's intended payout schedule against the actual inputs to the bank ledger. PayFlux alerts on discrepancies—whether due to total failure, partial payment, or unexpected fees—providing the forensic data needed to challenge the processor or trace lost funds.
