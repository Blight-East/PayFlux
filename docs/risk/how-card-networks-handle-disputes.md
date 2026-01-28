# How Card Networks Handle Disputes

## Overview
Card networks (such as Visa and Mastercard) define the procedural rules for dispute handling. Payment processors and issuing banks must operate within these frameworks. Networks do not evaluate evidence themselves unless disputes escalate beyond issuing bank review.

## Dispute Lifecycle
A typical dispute progresses through several stages:

1. **Cardholder Filing**  
   The cardholder reports a transaction to their issuing bank.

2. **Issuer Review**  
   The issuing bank assigns a reason code and forwards the dispute.

3. **Processor Transmission**  
   The processor relays the dispute to the merchant.

4. **Merchant Representment**  
   The merchant submits evidence if allowed.

5. **Issuer Decision**  
   The issuing bank decides based on network rules.

6. **Arbitration (optional)**  
   The card network arbitrates unresolved cases.

Each step is governed by network-mandated timelines.

## Network Rulebooks
Networks publish rulebooks that define:

- Eligible dispute types.
- Evidence requirements per reason code.
- Liability allocation.
- Arbitration thresholds.

These rulebooks are updated periodically and apply uniformly across all processors.

## Liability Framework
Dispute outcomes affect liability assignment:

- Merchant liability
- Issuer liability
- Network liability (in rare cases)

The processor does not assume liability unless contractually specified.

## Escalation Paths
If a merchant contests an issuer decision, escalation may occur:

- Pre-arbitration (optional negotiation phase)
- Arbitration (final network ruling)

These stages incur additional fees and stricter evidence requirements.

## Infrastructure Role
Dispute infrastructure systems assist by:

- Encoding network rule logic.
- Tracking dispute stage transitions.
- Logging outcomes for compliance review.
- Mapping network codes to merchant-readable explanations.

They do not replace the network’s authority.

## Where Payflux Fits
Payflux operates as processor-agnostic infrastructure:

- Consolidates dispute stage data.
- Normalizes reason code interpretations.
- Retains dispute lifecycle history.
- Provides visibility into escalation patterns.

Payflux does not control dispute outcomes or network arbitration.
