# How Refund Abuse Patterns Work

## Overview
Refund abuse involves customers exploiting return policies to obtain goods or services for free. Unlike chargeback fraud, which uses the bank's dispute system, refund abuse uses the merchant's own voluntary refund mechanism. It is insidious because it does not trigger network alerts until it is too late.

## What refund abuse is
Forms of abuse include:
- **Wardrobing**: Buying an item for a specific event and returning it used.
- **Empty Box**: Claiming the package arrived empty to get a refund while keeping the item.
- **Double Dipping**: Getting a refund from the merchant *and* filing a chargeback with the bank.

## Common behavioral patterns
- **Refund Cycling**: A user who buys and refunds 5+ times in a short window.
- **Arbitrage Abuse**: Buying during a sale, refunding at full price (if system allows), or exploiting currency fluctuations.
- **Early Refund Masking**: Fraudsters testing card validity by buying and immediately refunding, hoping to avoid detection before the real attack.

## Relationship to dispute ratios
Refunds can artificially suppress dispute ratios.
- **The denominator effect**: If a merchant processes \$100k in sales and refunds \$50k, the card network still sees \$100k in sales volume.
- **Masking**: Aggressive refunding prevents chargebacks, hiding deep product or service issues that eventually explode when refund policies tighten.

## Why it is hard to detect early
Refunds are "valid" transactions. Most risk models focus on declines and chargebacks. A user who successfully buys and refunds is often seen as a "good" customer by basic fraud filters because they passed AVS/CVV checks.

## Network and processor sensitivity
Processors monitor "Refund Rates" (Refund $ / Sales $).
- **Thresholds**: A refund rate >10-15% is often a trigger for a risk review or reserve increase.
- **Cash Flow Risk**: High refunds suggest the merchant might not have funds to cover future returns, prompting the processor to hold exposure.

## Where observability infrastructure fits
Infrastructure detects the *velocity* and *ratio* of refunds. It tracks:
- **Net Sales Health**: Visualizing "Gross Sales" vs "Net Sales" to expose the true revenue picture.
- **Serial Returners**: Identifying UserIDs or device fingerprints with anomalous refund frequencies.
- **Policy Breaches**: Alerting when a refund is issued for a transaction older than the allowed window.
