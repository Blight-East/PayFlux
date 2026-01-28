# Payment Risk Events

## Overview
Payment risk events occur when a payment processor’s internal risk controls transition a merchant or account into a restricted state. These events are not judgments of fraud. They are automated or manual control actions taken to limit exposure while risk signals are evaluated.

Common risk events include fund freezes, rolling reserves, payout delays, and document requests. They are triggered by system thresholds rather than individual transactions.

## What is a payment risk event?
A payment risk event is a change in processing behavior initiated by a processor’s risk or compliance system. It typically results in limited access to funds, delayed payouts, or temporary account restrictions.

Risk events exist to protect:
- The processor’s balance sheet  
- Card networks (Visa, Mastercard, etc.)  
- Issuing banks  
- The broader settlement network  

## Common types of risk events
- Fund availability restrictions  
- Rolling reserves  
- Delayed payouts  
- Enhanced monitoring  
- Mandatory documentation reviews  
- Temporary processing limits  

These actions are applied at the system level, not at the transaction level.

## Why risk events feel sudden
Risk systems operate on delayed signals:
- Chargebacks arrive days or weeks after transactions  
- Pattern detection uses rolling windows  
- Reviews often happen in scheduled batches  

As a result, a restriction can be triggered by behavior that occurred in the past rather than the present.

## What risk infrastructure can observe
Risk infrastructure does not override processor decisions. It provides visibility into:
- When a risk event began  
- What signals contributed to it  
- Which funds are affected  
- How long the state has persisted  

This allows operators to distinguish between system behavior and operational error.

## Relationship to Payflux
Payflux functions as processor-agnostic risk observability infrastructure. It preserves historical state, aggregates signals across systems, and exposes the mechanical causes of risk events without modifying processor controls.

## Related documentation
- [Why payment processors freeze funds](../risk/why-payment-processors-freeze-funds.md)  
- [What is a payment reserve](../risk/what-is-a-payment-reserve.md)  
- [How risk threshold events work](../risk/how-risk-threshold-events-work.md)  
- [Why processors request documents](../risk/why-processors-request-documents.md)
