# How Card Network Rule Changes Affect Merchants

## Overview
Card networks (Visa, Mastercard, Amex, Discover) periodically update the operating regulations that govern the global payments ecosystem. These rules dictate everything from dispute thresholds to acceptable merchant categories. Changes typically happen twice a year (April and October) but can be impactful immediately.

## What card network rules are
Network rules are the contractual obligations that flow down from the network to the acquiring bank, then to the processor, and finally to the merchant. They cover:
- **Chargeback limits**: The maximum allowable dispute ratio.
- **Data field requirements**: What metadata must be sent with an authorization.
- **Category restrictions**: Which industries are permitted or require special registration.

## How rule changes propagate
Rules do not apply directly to merchants; they propagate through the banking chain:
1.  **Network Mandate**: Visa/Mastercard publishes a technical bulletin updating a rule.
2.  **Acquirer Implementation**: Acquiring banks update their compliance policies to match.
3.  **Processor Enforcement**: Processors update their software logic to reject non-compliant transactions or flag violations.
4.  **Merchant Impact**: The merchant sees sudden declines or receives a compliance notification.

## Typical operational impacts
- **New Decline Codes**: Transactions failing due to missing data fields (e.g., new 3DS requirements).
- **Lower Thresholds**: A sudden drop in the acceptable dispute rate, pushing a previously "safe" merchant into a monitoring program.
- **Registration Fees**: High-risk categories (e.g., vape, adult) suddenly requiring expensive annual registration.

## Why rule changes appear sudden
While networks announce changes months in advance, the information often gets stuck at the acquirer or processor level. Merchants may not be notified until the rule is actively enforced, making the impact feel abrupt and arbitrary.

## Where observability infrastructure fits
Infrastructure monitors the "compliance health" of traffic against known network standards. It tracks:
- **Decline code shifts**: Detecting if a new error code spikes after a mandate date.
- **Data completeness**: Verifying that authorization payloads contain all required fields.
- **Program thresholds**: Benchmarking merchant metrics against updated network limits.
