# Payment Risk Observability for BNPL Providers

## Overview
Buy Now, Pay Later (BNPL) providers operate with complex risk models that bridge payments and consumer lending. They face a dual-risk environment: credit risk from the consumer and processing risk from the payment network. Observability for BNPL requires tracking settlement timing and dispute exposure across this split lifecycle.

## Common BNPL risk patterns
BNPL providers encounter specific risk vectors:
- **Settlement Lag**: The gap between paying the merchant and collecting from the consumer creates a capital float risk.
- **Friendly Fraud**: Consumers disputing installments after receiving goods.
- **Stacked Risk**: A consumer default overlapping with a merchant dispute.
- **Regulatory pressure**: Heightened sensitivity to consumer protection norms compared to standard e-commerce.

## How risk propagates in BNPL systems
Risk signals in BNPL systems travel through multiple layers:

1.  **Consumer Default**: A user fails to pay an installment.
2.  **Network Dispute**: A user files a chargeback against the installment charge.
3.  **Merchant Liability**: The BNPL provider attempting to claw back funds from the merchant.
4.  **Processor Freeze**: If the BNPL provider's aggregate dispute rate spikes, their own processor may freeze settlement funds, creating a liquidity crisis.

## Operational challenges
- **Reconciliation**: Matching network settlements with consumer repayment schedules.
- **Dispute Management**: Handling partial disputes (e.g., disputing 1 of 4 installments).
- **Capital Efficiency**: Ensuring reserves don't trap the capital needed for new lending.

## What observability infrastructure enables
Effective infrastructure provides:
- **Lifecycle Tracking**: Monitoring the status of every installment against the core transaction.
- **Float Visibility**: Real-time tracking of funds in flight vs. funds settled.
- **Dispute Cohort Analysis**: Identifying if disputes are rising within specific vintage cohorts of loans.

## Where PayFlux fits
PayFlux provides payment risk observability tailored for the high-velocity nature of BNPL. It ingests settlement and dispute signals to map the real-time health of the processing layer. PayFlux helps BNPL providers monitor their own processor health/standing, ensuring that upstream payment risks do not impact their ability to fund merchants or service consumers.
