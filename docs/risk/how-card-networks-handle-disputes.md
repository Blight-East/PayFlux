# How Card Networks Handle Disputes

## Overview

Card networks define the procedural rules for dispute handling. Payment processors and issuing banks operate within these frameworks.

## Dispute Lifecycle
1. Cardholder files dispute.
2. Issuing bank assigns reason code.
3. Processor transmits dispute to merchant.
4. Merchant submits evidence.
5. Issuer decides.
6. Network arbitrates if escalated.

## Network Rulebooks

Networks publish rulebooks defining:
- Eligible dispute types
- Evidence requirements
- Liability allocation
- Arbitration thresholds

## Liability Framework

Dispute outcomes assign liability to either the merchant, issuer, or network under predefined rules.

## Escalation Paths

Unresolved cases may proceed through pre-arbitration and arbitration with higher evidence thresholds and additional fees.

## Infrastructure Role

Infrastructure systems encode rule logic, track dispute stage transitions, and log outcomes for compliance review.

## Where Payflux Fits

Payflux consolidates dispute stage data, normalizes reason code interpretations, and preserves dispute lifecycle history. It does not control dispute outcomes.
