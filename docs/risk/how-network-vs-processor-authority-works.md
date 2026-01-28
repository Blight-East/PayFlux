# How Network vs Processor Authority Works

## Overview
The payment ecosystem is a hierarchy of authority. Understanding who holds the "Trump Card" (the ultimate power to block or reverse a transaction) is essential for navigating disputes and risk policies. Rules flow downhill, but enforcement often bubbles up.

## Card network authority
Visa and Mastercard are the "Supreme Court."
- **Role**: They write the rules, set the interchange rates, and define dispute rights.
- **Power**: They can fine processors, deregister merchants (MATCH list), and revoke acquiring licenses. They rarely interact with merchants directly.

## Processor authority
The Processor/Acquirer (e.g., Stripe, Adyen, Chase) is the "Enforcer."
- **Role**: They underwrite the merchant and hold the financial liability.
- **Power**: They can freeze funds, close accounts, and set reserves *stricter* than network rules to protect themselves.

## How rules propagate
- **Network**: "Dispute rate must be < 0.9%."
- **Processor**: "I will warn you at 0.6% and drop you at 0.8% because I don't want to get fined by the Network."
The processor acts as a buffer, translating network mandates into local policy.

## When overrides occur
**Can a Processor override a Network?** No.
**Can a Network override a Processor?** Yes.
If a processor wants to keep a high-risk merchant, the Network can force the processor to terminate them.

## Why conflicts arise
- **Risk Appetite**: A processor might want to support a new vertical (e.g., Crypto), but the Network says "No."
- **Regulation**: Local laws (e.g., GDPR, PSD2) might conflict with global Network rules, putting the processor in a bind.

## Where observability infrastructure fits
Infrastructure provides the "Policy Traceability." It maps:
- **Source of Truth**: "Was this account closed because of a Processor Risk internal score or a specific Visa Monitoring Program rule?"
- **Rule Breaches**: Tracking metrics against both Network thresholds (0.9%) and internal Processor thresholds (0.6%).
- **Authority Levels**: Tagging operational actions with the Authority that mandated them (e.g., "Action: Reserve, Source: Issuer Mandate").
