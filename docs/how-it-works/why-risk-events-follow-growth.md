# Why Risk Events Often Follow Business Growth

## Overview
It is a common operational paradox that risk events (funds freezes, reserve impositions) cluster around periods of rapid business success. To the merchant, this feels punitive ("I'm making more money, why are you freezing it?"). To the processor, rapid growth is indistinguishable from a "bust-out" fraud attack until proven otherwise.

## How growth changes risk profiles
Growth alters the fundamental risk equation:
- **Velocity**: Transaction volume exceeds the historical baseline used for underwriting.
- **Exposure**: The total dollar amount "at risk" (funds paid out but still disputable) grows larger than the merchant's collateral or processing history supports.
- **Mix Shift**: Rapid scaling often involves acquiring customers from new, potentially riskier channels.

## Lag between revenue and risk signals
Revenue is realized immediately (T+0), but risk signals lag significantly.
- **Dispute Lag**: A customer who buys today might not file a dispute for 30-90 days.
- **Blind Spot**: During a growth spike, a merchant accumulates weeks of revenue before the first "cohort" of disputes arrives. By the time the problem is visible, the processor's exposure is massive.

## Typical thresholds crossed during scaling
Processors have automated tripwires based on:
- **Monthly Volume**: Exceeding the "High Ticket" or "Monthly Cap" set during onboarding.
- **Average Ticket**: A sudden shift in the average order value (e.g., from $50 to $150).
- **Ratio Volatility**: A small number of disputes in a low-volume month can trigger a high ratio percentage.

## Why freezes and reviews cluster after success
When a merchant breaks a velocity threshold, the system halts settlement to "catch up" the risk exposure. This is not necessarily an accusation of fraud, but a mechanical recalibration of the credit limit. The freeze buys the processor time to verify that the new volume is legitimate sales, not card testing or money laundering.

## Where observability infrastructure fits
Infrastructure provides the transparency needed to navigate growth phases. It monitors:
- **Velocity limits**: Tracking current volume against known processor caps.
- **Cohort maturation**: Watching the dispute rate of new customer cohorts in real-time.
- **Exposure modeling**: Calculating the "funds at risk" independently to predict when a processor might trigger a review.
