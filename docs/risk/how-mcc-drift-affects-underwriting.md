# How MCC Drift Affects Underwriting

## Overview
Merchant Category Codes (MCCs) classify a business's industry (e.g., 5411 for Grocery Stores, 5734 for Computer Software). "MCC Drift" occurs when a merchant's actual transaction patterns diverge from the behavior expected for their assigned MCC, signaling a potential compliance violation or business pivot.

## What MCC drift is
- **Pivot**: A company starts as a "Software Consultant" (low risk) but pivots to selling "Crypto Mining Rigs" (high risk).
- **Inventory Shift**: A clothing store starts selling CBD oil or supplements.
- **Gaming the System**: Intentionally miscoding a gambling site as a video game store to increase approval rates.

## Why it happens
- **Evolution**: Startups change rapidly; they rarely update their processor application.
- **Ignorance**: Merchants don't realize that adding a risky SKU requires a new underwriting review.
- **Malice**: "Transaction Laundering" (factoring) relies on hiding high-risk sales behind a low-risk shell company.

## How processors detect drift
- **Ticket Size**: A "Coffee Shop" processing \$2,000 transactions.
- **Chargeback Reasons**: A "Consultant" getting chargebacks for "Item Not Received" (services don't have shipping).
- **Web Crawling**: Automated bots scanning the merchant's website for prohibited keywords.

## Relationship to reserves and holds
Drift doesn't just block transactions; it triggers holistic account reviews.
- **The "Match" List**: If a merchant is caught laundering, they are blacklisted globally (TMF/MATCH).
- **Immediate Freeze**: Processors pause all funds until the new business model is verified.

## Why corrections take time
Changing an MCC is not a database toggle. It requires re-underwriting the account with the sponsor bank. This often involves new contracts, different fee structures, and potentially migrating the merchant to a different processing platform entirely.

## Where observability infrastructure fits
Infrastructure provides a "Drift Monitor." It tracks:
- **Average Ticket vs MCC Baseline**: Alerting if a merchant's ATP exceeds the industry norm by 300%.
- **Ratio Volatility**: Detecting sudden shifts in dispute reasons that don't align with the vertical.
- **Keyword Ingestion**: integrating website crawling data to flag prohibited terms alongside transaction metrics.
