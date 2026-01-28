# Dispute Infrastructure

## Overview
Dispute infrastructure governs how contested transactions move through card networks, issuing banks, and processors. It is a procedural system rather than a real-time one, operating on evidence submission windows, response deadlines, and network rules.

Disputes are not resolved by merchants and processors directly. They are adjudicated by issuing banks under network policy.

## What is dispute infrastructure?
Dispute infrastructure consists of:
- Evidence formats  
- Timelines  
- Arbitration rules  
- Network routing logic  
- Outcome classification  

Each dispute progresses through defined stages regardless of merchant intent.

## Why disputes are slow by design
Disputes move at the speed of:
- Issuer review  
- Card network routing  
- Evidence evaluation  
- Regulatory constraints  

This creates delays measured in weeks, not minutes.

## What affects dispute outcomes
Outcomes depend on:
- Evidence structure  
- Reason codes  
- Issuer interpretation  
- Network policy  
- Historical merchant patterns  

Win rates vary because disputes are not judged solely on transaction facts.

## Role of evidence systems
Evidence systems organize:
- Transaction context  
- Customer communications  
- Policy disclosures  
- Refund timing  
- Delivery confirmation  

They do not determine verdicts. They provide structured input into issuer decisions.

## Relationship to Payflux
Payflux acts as dispute infrastructure observability. It preserves evidence state, tracks dispute propagation, and exposes outcome patterns across processors without influencing network decisions.

## Related documentation
- [How dispute evidence works](../risk/how-dispute-evidence-works.md)  
- [How card networks handle disputes](../risk/how-card-networks-handle-disputes.md)  
- [Why dispute win rates vary](../risk/why-dispute-win-rates-vary.md)
