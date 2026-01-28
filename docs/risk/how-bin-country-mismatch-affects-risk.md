# How BIN–Country Mismatch Affects Payment Risk

## Overview
A "BIN-Country Mismatch" occurs when the country of the card issuing bank (derived from the BIN) does not match the country of the customer's IP address or shipping location. This signal is highly correlated with stolen card usage but also affects legitimate travelers and cross-border commerce.

## What BIN-country mismatch is
- **BIN**: Bank Identification Number (the first 6-8 digits of the card).
- **Mismatch**: A card issued in France (FR) used by a device located in Russia (RU) to ship goods to Nigeria (NG).

## Common causes
1.  **Fraud**: Attackers buy cards from one region and use them anywhere.
2.  **VPNs**: Legitimate users masking their IP address.
3.  **Travelers**: A US tourist in Japan buying a train ticket.
4.  **Corporate Cards**: A global company issuing UK cards to employees in Singapore.

## How networks interpret mismatch
Risk engines score "distance" between these data points.
- **Low Risk**: Card Country == IP Country == Shipping Country.
- **Med Risk**: Card Country != IP Country (Traveler?).
- **High Risk**: Card Country != Shipping Country (Reshipping scam?).

## Relationship to fraud scoring
Mismatch is a multiplier. A transaction that looks slightly risky (high amount) becomes *critically* risky if the countries don't align. This often triggers "3D Secure" challenges or outright declines.

## When mismatch becomes systemic
For merchants selling digital goods (SaaS, Gaming), mismatched traffic is common. A systemic mismatch (e.g., 80% of traffic is mismatched) can cause the processor for "region-lock" the merchant, forcing them to use local entities for processing.

## Where observability infrastructure fits
Infrastructure provides a heatmap of country alignment. It answers:
- **Legitimacy**: "What % of my successful sales have a mismatch?" (Baseline).
- **Attack Vector**: "Is the current spike in declines coming specifically from BR-IPs using US-Cards?"
PayFlux visualizes this geographic triangulation to help teams separate global customers from global fraud rings.
