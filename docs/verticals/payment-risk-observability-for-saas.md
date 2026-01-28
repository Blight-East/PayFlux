# Payment Risk Observability for SaaS Platforms

## Overview
SaaS platforms rely on recurring revenue, making stability and retention paramount. Payment risk in SaaS is rarely about one-time fraud; it is about the "silent churn" of failed renewals and the operational drag of managing thousands of subscriptions.

## SaaS billing risk profile
Distinct characteristics include:
- **Card-on-File**: The customer is not present during the transaction (MIT - Merchant Initiated Transaction).
- **Small Ticket, High Volume**: Low per-transaction losses, but massive aggregate volume.
- **Inertia**: Customers often don't update card details until service is cut off.

## Subscription failure patterns
- **Soft Declines**: "Insufficient Funds" or "Generic Decline" are common near the end of the month.
- **Hard Declines**: "Card Replacement" or "Account Closed" require user intervention.
- **Auth Rot**: Authorization tokens expiring if the card hasn't been charged in 12+ months.

## Dispute and refund dynamics
- **"I Cancelled That"**: The most common SaaS dispute. Users forget to cancel and chargeback the renewal.
- **Pro-rated Refunds**: Refunding unused time complicates the ledger and balance tracking.
- **Double Jeopardy**: Refunding a customer who has already initiated a dispute, leading to a loss of both funds.

## Monitoring and alerting needs
Operations teams need visibility into:
- **Renewal Success Rate**: The % of scheduled renewals that settle successfully on Day 1 vs Day 3.
- **Churn Attribution**: Separating "Voluntary Churn" (user cancelled) from "Involuntary Churn" (payment failed).
- **Dunning Efficiency**: Measuring how many failed payments are recovered by retry logic vs email reminders.

## Where PayFlux fits
PayFlux provides a dedicated lens for recurring billing health. It tracks the lifecycle of subscription cohorts, identifying structural decline patterns that affect retention. PayFlux helps SaaS platforms differentiate between a customer who wants to leave and a payment rail that is failing to capture revenue.
