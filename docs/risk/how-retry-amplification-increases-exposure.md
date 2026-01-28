# How Retry Amplification Increases Exposure

## Overview
"Retry Amplification" occurs when a merchant or payment router aggressively retries failed transactions. While intended to recover revenue, this practice often unintentionally inflates risk metrics, triggering processor compliance violations and fraud alerts.

## What retry amplification is
- **Scenario**: A \$50 transaction is declined for "Insufficient Funds."
- **Logic**: The system retries it 4 times a day for 5 days.
- **Result**: 1 failed transaction becomes 20 failed transactions in the network logs.

## Common retry patterns
- **The "Hammer"**: Retrying immediately (milliseconds later).
- **The "Waterfall"**: Retrying across different backup gateways (Stripe -> Adyen -> Checkout.com).
- **The "Drip"**: Making small retries ($1.00) to check for balance before charging the full amount.

## How retries multiply liability
Networks (Visa/MC) monitor "Excessive Retry" counts.
- **Rules**: Retrying a "Do Not Honor" or "Stop Payment" decline is strictly prohibited.
- **Fines**: Each prohibited retry can incur a fine (e.g., \$0.10 - \$0.50 per attempt).
- **Exposure**: A bot attack of 10k cards * 10 retries = 100k illegal transactions = Massive potential fines.

## Relationship to fraud and disputes
High retry rates mimic "Card Testing" attacks. Even if the intent is benign (recovering a subscription), the pattern looks malicious to the Issuer. This causes the Issuer to blacklist the Merchant ID, causing valid transactions to fail (collateral damage).

## Why amplification is nonlinear
A 10% increase in failed payments can lead to a 1000% increase in network signals if the retry logic is aggressive (10x multiplier). The risk exposure grows exponentially relative to the underlying sales volume.

## Where observability infrastructure fits
Infrastructure acts as the "Governor." It monitors:
- **Retry Ratio**: `Total Attempts / Unique Orders`.
- **Response Code Violations**: Alerting whenever a "Hard Decline" (e.g., Lost/Stolen) is retried.
- **Amplification Factor**: Measuring how many extra signals the system puts on the wire for every dollar of attempted revenue.
