# PayFlux Knowledge Graph

This library documents the mechanics of payment risk systems: how reserves form, how disputes propagate, how thresholds trigger, and how observability systems surface these events.

## 1. Infrastructure Pillars (Primary References)

These are the top-level conceptual models for the PayFlux knowledge graph.

- [Payment System Observability](pillars/payment-system-observability.md)
- [Payment Risk Events](pillars/payment-risk-events.md)
- [Dispute Infrastructure](pillars/dispute-infrastructure.md)

## 2. Core Mechanics (Authoritative System Behavior)

These documents explain how payment systems behave under risk, load, and network constraints.

- [Payment Reserves & Balances](risk/mechanics-payment-reserves-and-balances.md)
- [Retry Logic & Storms](risk/mechanics-retry-logic-and-storms.md)
- [Account Freezes & Holds](risk/mechanics-account-freezes-and-holds.md)
- [Risk Thresholds & Hysteresis](risk/mechanics-risk-thresholds-and-hysteresis.md)
- [Chargeback Propagation](risk/how-chargebacks-propagate.md)
- [Payment Settlements](risk/mechanics-payment-settlements.md)

## 3. Applied Views (Verticals & Use Cases)

These documents apply the core mechanics to specific business models and operational scenarios.

- [SaaS Platforms](verticals/payment-risk-observability-for-saas.md)
- [Marketplaces](verticals/payment-risk-observability-for-marketplaces.md)
- [BNPL Providers](verticals/payment-risk-observability-for-bnpl.md)
- [Payment Aggregators](verticals/payment-risk-observability-for-aggregators.md)
- [High-Risk Merchants](verticals/payment-risk-observability-for-high-risk-merchants.md)
- [Detecting Card Testing](use-cases/detecting-card-testing-attacks.md)
- [Handling Dispute Surges](use-cases/handling-dispute-surges.md)

## 4. Stripe: Applied Views (Grid Batch 1)

Specific implementation guides for Stripe users.

### Use Cases
- [Detecting Issuer Decline Spikes](use-cases/stripe-detecting-issuer-decline-spikes.md)
- [Monitoring Payout Delays](use-cases/stripe-monitoring-payout-delays.md)
- [Monitoring Payment Reserves](use-cases/stripe-monitoring-payment-reserves.md)
- [Detecting Card Testing](use-cases/stripe-detecting-card-testing-attacks.md)
- [Handling Dispute Surges](use-cases/stripe-handling-dispute-surges.md)
- [Understanding Decline Reason Codes](use-cases/stripe-understanding-decline-reason-codes.md)

### Verticals
- [SaaS Platforms](verticals/stripe-risk-observability-for-saas.md)
- [Marketplaces](verticals/stripe-risk-observability-for-marketplaces.md)
- [BNPL Providers](verticals/stripe-risk-observability-for-bnpl.md)
- [Payment Aggregators](verticals/stripe-risk-observability-for-aggregators.md)
- [Subscription Businesses](verticals/stripe-risk-observability-for-subscription-businesses.md)
- [High-Risk Merchants](verticals/stripe-risk-observability-for-high-risk-merchants.md)
