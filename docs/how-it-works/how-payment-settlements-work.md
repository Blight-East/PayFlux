# How Payment Settlements Work

## Overview
Settlement is the process of moving funds from the cardholder’s bank to the merchant’s bank account. Unlike authorization, which happens in seconds, settlement is a batched, asynchronous process that occurs over days. Understanding the distinction between valid authorizations and settled funds is critical for cash flow modeling and risk management.

## Authorization vs capture vs settlement
The lifecycle involves three distinct stages:
1.  **Authorization**: The issuing bank confirms the cardholder has funds and places a hold. No money moves.
2.  **Capture**: The merchant confirms the order is fulfilled and requests the funds.
3.  **Settlement**: The processor batches captured transactions and submits them to the network for clearing.

## Batch settlement cycles
Processors typically group transactions into "batches" based on a cutoff time (e.g., 5:00 PM EST).
- Transactions captured *before* the cutoff are included in that day’s batch.
- Transactions captured *after* the cutoff roll to the next business day.
- Weekends and bank holidays delay batch processing until the next banking day.

## Clearing and funding timelines
Once a batch is submitted:
1.  **Clearing**: The network (Visa/Mastercard) calculates the net amount owed between issuers and acquirers.
2.  **Funding**: The acquiring bank instructs the Federal Reserve (or local clearing house) to transfer funds to the merchant’s bank.
3.  **Availability**: The merchant's bank posts the funds to the account, typically on a T+2 or T+3 schedule (Transaction date + 2/3 business days).

## Why settlement timing varies
Delays occur due to:
- **Risk Reviews**: Processors holding specific batches for manual audit.
- **Bank Operations**: Receiving banks processing incoming ACH transfers at different speeds.
- **Cross-Border**: International transfers requiring correspondent banking hops (T+5 or longer).

## Where observability infrastructure fits
Infrastructure tracks the state of funds as moving from "authorized" to "settled." It matches the processor’s deposit records against the original batch submission to identify:
- **Missing funds**: Discrepancies between the captured total and the deposited amount.
- **Unexpected fees**: Deductions taken at source before settlement.
- **Timing drift**: Detection of payouts arriving later than the modeled T+N schedule.
