# How Negative Balance Cascades Form

## Overview
A negative balance occurs when a merchant's liabilities (Refunds/Chargebacks/Fees) exceed their assets (Settled Sales) in a given period. A "Cascade" happens when this deficit persists across multiple settlement cycles, consuming future revenue and potentially triggering bank debits that fail, compounding the problem.

## What a negative balance cascade is
It is a debt spiral within the payment ledger.
1.  **Day 1**: Merchant processes \$100 in sales, refunds \$150. Balance: -\$50.
2.  **Day 2**: Merchant processes \$20 in sales. Balance absorbs it. New Balance: -\$30.
3.  **Result**: Merchant receives \$0 payout for Day 2, despite making sales.

## Common triggering conditions
- **Mass Refunds**: Cancelling an event or recalling a faulty product line.
- **Chargeback Spikes**: A fraud attack maturing all at once.
- **Delayed Settlement**: If sales settle in 3 days but refunds settle in 1 day (common), a merchant can go negative operationally even if they are profitable on paper.

## Relationship to dispute timing
Disputes are instant debits. If a merchant has low daily volume (e.g., weekend), a single large dispute can flip the daily batch negative.

## Interaction with payout schedules
If the negative balance exceeds the incoming sales, the processor must debit the merchant's bank account (ACH Debit).
- **Risk**: If the merchant has already spent the money, the ACH Debit fails (NSF).
- **Consequence**: The processor now has a specialized "Collection" risk exposure and will likely freeze all processing to prevent the hole from getting deeper.

## Why cascades propagate
Once in a negative state, every new sale is "eaten" by the debt. This starves the merchant of operating cash (inventory/payroll), forcing them to potentially cancel more orders (causing more refunds), accelerating the downward spiral.

## Where observability infrastructure fits
Infrastructure provides the "Fuel Gauge." It monitors:
- **Burn Rate**: How fast the negative balance is being paid down by new sales.
- **Debit Failure Risk**: Predicting the probability of an ACH failure based on bank balance checks (if available).
- **Zero-Day Alerts**: Warning immediately when a batch is trending negative *before* it closes.
