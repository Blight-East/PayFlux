# Why Dispute Win Rates Vary

## Overview
Merchants often observe significant variation in dispute win rates across time periods, processors, or product lines. These differences result from procedural, behavioral, and categorical factors rather than a single deterministic cause.

## Primary Drivers

### Reason Code Distribution
Different dispute types have different success probabilities. For example:

- Fraud disputes rely on identity verification.
- Product disputes rely on fulfillment and policy documentation.
- Authorization disputes rely on transaction approval logs.

A shift in reason code mix changes overall win rate.

### Evidence Completeness
Incomplete or improperly formatted evidence reduces success likelihood. Network rules require specific data elements for each reason code.

### Timing Compliance
Late submissions are typically auto-lost regardless of evidence quality.

### Transaction Context
Factors such as:

- Digital vs physical goods
- Subscription vs one-time purchases
- Domestic vs cross-border transactions

affect adjudication standards.

### Issuer Variance
Issuing banks apply network rules consistently but may differ in interpretation strictness or review volume.

## Structural Limitations
Dispute processes are constrained by:

- Fixed network response windows.
- Standardized evidence schemas.
- Limited merchant feedback loops.

These constraints produce outcome variance even with similar merchant behavior.

## Infrastructure Role
Risk and dispute infrastructure systems help by:

- Segmenting disputes by reason code and channel.
- Tracking historical success patterns.
- Identifying recurring loss drivers.
- Preserving documentation for appeals.

They do not control issuer decisions.

## Where Payflux Fits
Payflux functions as infrastructure for dispute outcome analysis:

- Aggregates dispute outcome data.
- Surfaces variance drivers.
- Preserves historical context.
- Enables comparative analysis across processors.

Payflux does not modify win rates. It provides observability into the mechanisms that influence them.
