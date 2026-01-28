# Monitoring Negative Balances

## Overview
A negative balance occurs when a merchant owes funds to the processor. This typically happens when refunds, chargebacks, or fees exceed the available settlement balance. Negative balances represent unsecured credit risk for the processor and a liquidity call for the merchant.

## How negative balances occur
Common triggers include:
- **Post-Payout Refunds**: Processing a large volume of refunds immediately after a daily payout has cleared the account.
- **Dispute Reversals**: A wave of chargebacks debiting the account when the balance is low.
- **Fee Collections**: Monthly or annual platform fees deducted from an empty balance.
- **Reserve Depletion**: If a reserve is exhausted by liabilities, the main balance is debited.

## Risk implications
- **Capital Exposure**: The processor effectively loans money to the merchant until the balance is covered.
- **Recovery Uncertainty**: If the merchant becomes insolvent or abandons the account, the negative balance becomes a bad debt write-off.
- **Operational Friction**: Inability to process refunds or chargebacks can lead to further consumer disputes.

## Operational response requirements
When a negative balance is detected, teams must:
- **Alert Finance**: Notify treasury teams of the exposure.
- **Debit Bank Account**: Attempt to pull funds via ACH/Direct Debit to cover the shortfall.
- **Pause Payouts**: Ensure no future funds leave the account until the deficit is cleared.
- **Freeze Processing**: In severe cases, stop new charges to prevent further liability accumulation.

## What infrastructure supports balance visibility
Robust infrastructure ensures:
- **Real-time Monitoring**: Tracking balance states continuously, not just at daily settlement.
- **Aging Reports**: Classifying negative balances by duration (e.g., <24h, >7 days).
- **Recovery Tracking**: Logging attempts to recoup funds and their success/failure status.

## Where PayFlux fits
PayFlux monitors balance states across connected processors. It triggers alerts when an account transitions to a negative state and tracks the duration and depth of the shortfall. PayFlux preserves the history of balance transitions, helping finance and risk teams assess the frequency and recovery rate of negative balance events.
