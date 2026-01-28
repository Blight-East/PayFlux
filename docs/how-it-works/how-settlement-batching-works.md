# How Settlement Batching Works in Payment Systems

## Overview
Settlement batching is the process of grouping authorized transactions into a single file for submission to the card networks. This operational step dictates when funds actually move. Understanding batch logic is crucial for reconciling bank deposits with sales data.

## What settlement batching is
A "batch" acts like a digital envelope.
1.  **Open**: The batch is open during the business day, collecting captured transactions.
2.  **Close**: At a specific cutoff time (e.g., 5 PM PST), the batch is "closed."
3.  **Upload**: The file is sent to the processor/acquirer.
4.  **Fund**: The acquirer deposits the net total of the batch (Sales - Refunds).

## Typical batching intervals
- **Daily**: The standard. one batch per 24-hour cycle.
- **Intraday**: Multiple batches per day (e.g., every 6 hours) used by high-velocity merchants to speed up funding.
- **Delayed**: Batches held open for 48+ hours (rare, used to allow ample time for voids).

## How batching affects balance visibility
Funds are not "real" until the batch closes.
- **Pending**: A transaction created at 9 AM is "Pending Settlement" until the batch closes at 5 PM.
- **Void Window**: Before batch closure, a transaction can be "Voided" (cancelled completely). After closure, it must be "Refunded" (net new transaction).

## Relationship to reserves and delays
Processors often apply risk holds at the *batch* level.
- **Batch Hold**: If a daily batch contains one highly suspicious transaction, the *entire* batch's funding might be paused for review.
- **Netting**: Refunds processed in a batch reduce the deposit. If Refunds > Sales, the batch is negative, and the merchant owes the processor.

## Operational risks introduced
- **Cutoff Misses**: Technical issues preventing batch closure roll all funds to the next day, causing a cash flow gap.
- **Reconciliation Lag**: Bank deposits often combine multiple batches or split one batch across days, making 1-to-1 matching difficult.

## Where observability infrastructure fits
Infrastructure monitors the batch lifecycle. It tracks:
- **Batch State**: Alerting if a batch fails to close by the expected time.
- **Deposit Matching**: correlating specific batches to specific bank wire amounts.
- **Funding Efficiency**: Measuring the average time/lag between Batch Close and Funds Available.
