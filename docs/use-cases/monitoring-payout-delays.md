# Monitoring Payout Delays

## Overview
Payout delays are often the first leading indicator of a deeper risk limit breach or liquidity issue at the processor level. Monitoring payout schedules against actual bank settlements is critical for cash flow predictability and early risk detection.

## Common payout delay causes
Delays typically stem from:
- **Risk Reviews**: A manual hold placed on a batch while a specific transaction is investigated.
- **Reserve Adjustments**: Funds diverted to top up a rolling reserve bucket.
- **Bank Holidays**: Non-processing days affecting settlement windows.
- **Liquidity Crises**: Rare instances where a processor pauses payouts due to their own solvency or compliance issues.

## How payout delay detection works
Detection infrastructure compares expected vs. actual events:

1.  **Schedule Modeling**: Calculating the expected arrival date of funds based on "T+N" settlement logic.
2.  **Bank Feed Reconciliation**: Verifying that the wire or ACH transfer actually arrived.
3.  **Gap Analysis**: Alerting when the expected amount differs from the settled amount, or when the settled date passes without funds.

## Operational response requirements
When a delay is detected, operations teams must:
- **Identify scope**: Is it one batch, one merchant account, or all accounts?
- **Check notifications**: Did the processor email a risk alert?
- **Assess cash flow impact**: How long can operations continue without this liquidity?
- **Contact support**: initiating a trace on the missing funds.

## What infrastructure supports delay visibility
Robust infrastructure ensures:
- **Automated Reconciliation**: Removing manual spreadsheet checks.
- **State Transition Logging**: Recording when a payout moves from `scheduled` to `paid` or `failed`.
- **Historical Baselines**: Knowing if a 2-hour delay is normal for this specific processor connection.

## Where PayFlux fits
PayFlux provides automated payout monitoring infrastructure. It tracks the lifecycle of every payout across connected processors, alerting teams to deviations from the expected schedule. PayFlux preserves the history of funding events, allowing teams to distinguish between routine banking latency and risk-driven enforcement actions.
