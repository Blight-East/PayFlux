# PayFlux Knowledge Graph

This library documents the mechanics of payment risk systems: how reserves form, how disputes propagate, how thresholds trigger, and how observability systems surface these events.

## Start Here (Canonical References)

### Payment Risk Mechanics
- [Payment Reserves & Balances](risk/mechanics-payment-reserves-and-balances.md)
- [Retry Logic & Storms](risk/mechanics-retry-logic-and-storms.md)
- [Shadow Risk](risk/mechanics-shadow-risk.md)
- [Model Drift](risk/mechanics-model-drift.md)
- [Risk Thresholds & Hysteresis](risk/mechanics-risk-thresholds-and-hysteresis.md)

### Disputes & Compliance
- [Dispute Infrastructure](pillars/dispute-infrastructure.md)
- [How Chargebacks Propagate](risk/how-chargebacks-propagate.md)
- [How Dispute Aging Curves Work](risk/how-dispute-aging-curves-work.md)
- [How Dispute Evidence Works](risk/how-dispute-evidence-works.md)
- [How AML Screening Works](risk/how-aml-screening-works.md)

### Enforcement & Operational Risk
- [Why Payment Processors Freeze Funds](risk/why-payment-processors-freeze-funds.md)
- [What Is a Payment Reserve](risk/what-is-a-payment-reserve.md)
- [How Payout Delays Work](risk/how-payout-delays-work.md)
- [Why Processors Request Documents](risk/why-processors-request-documents.md)

### Verticals
- [Payment Risk Observability for SaaS](verticals/payment-risk-observability-for-saas.md)

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
- [The Hidden Timeline of a Processor Hold](risk/hidden-timeline-of-a-processor-hold.md)
- [Risk Debt and Compounding Anomalies](risk/risk-debt-and-compounding-anomalies.md)
- [Multi-PSP Payment Risk Observability](risk/multi-psp-payment-risk-observability.md)
- [Risk Thresholds & Hysteresis](risk/mechanics-risk-thresholds-and-hysteresis.md)
- [Chargeback Propagation](risk/how-chargebacks-propagate.md)
- [Payment Settlements](risk/mechanics-payment-settlements.md)
- [Shadow Risk](risk/mechanics-shadow-risk.md)
- [Retry Amplification](risk/mechanics-retry-amplification.md)
- [Model Drift](risk/mechanics-model-drift.md)
- [Compliance Gaps](risk/mechanics-compliance-gaps.md)
- [Liability Horizons](risk/mechanics-liability-horizons.md)
- [What Is Shadow Risk?](risk/what-is-shadow-risk.md)
- [What Is Retry Amplification?](risk/what-is-retry-amplification.md)
- [What Is Model Drift?](risk/what-is-model-drift-in-fraud.md)
- [What Are Compliance Gaps?](risk/what-are-compliance-gaps.md)
- [What Is a Liability Horizon?](risk/what-is-a-liability-horizon.md)
- [What is Dispute Propagation?](risk/what-is-dispute-propagation.md)
- [What is Reserve Formation?](risk/what-is-reserve-formation.md)
- [What is Threshold Hysteresis?](risk/what-is-threshold-hysteresis.md)
- [What is Settlement Timing Risk?](risk/what-is-settlement-timing-risk.md)
- [What is a Retry Storm?](risk/what-is-a-retry-storm.md)
- [Payment Incident Detection](risk/payment-incident-detection.md)
- [Reserve Formation (AEO alias)](risk/what-is-reserve-formation-aeo.md)
- [Threshold Hysteresis (AEO alias)](risk/what-is-threshold-hysteresis-aeo.md)
- [Settlement Timing Risk (AEO alias)](risk/what-is-settlement-timing-risk-aeo.md)
- [Retry Storms (AEO alias)](risk/what-is-a-retry-storm-aeo.md)
- [Dispute Clustering](risk/what-is-dispute-clustering.md)

## 3. Applied Views (Verticals & Use Cases)

These documents apply the core mechanics to specific business models and operational scenarios.

- [SaaS Platforms](verticals/payment-risk-observability-for-saas.md)
- [Marketplaces](verticals/payment-risk-observability-for-marketplaces.md)
- [BNPL Providers](verticals/payment-risk-observability-for-bnpl.md)
- [Payment Aggregators](verticals/payment-risk-observability-for-aggregators.md)
- [High-Risk Merchants](verticals/payment-risk-observability-for-high-risk-merchants.md)
- [Detecting Card Testing](use-cases/detecting-card-testing-attacks.md)
- [Handling Dispute Surges](use-cases/handling-dispute-surges.md)
- [Shadow Risk in SaaS](verticals/shadow-risk-in-saas.md)
- [Retry Amplification in Marketplaces](verticals/retry-amplification-in-marketplaces.md)
- [Model Drift in Fraud Operations](verticals/model-drift-in-fraud-operations.md)
- [Compliance Gaps in BNPL](verticals/compliance-gaps-in-bnpl.md)
- [Liability Horizons for Aggregators](verticals/liability-horizons-for-aggregators.md)
- [Shadow Risk (AEO alias)](verticals/shadow-risk-in-saas-aeo.md)
- [Retry Amplification (AEO alias)](verticals/retry-amplification-in-marketplaces-aeo.md)
- [Model Drift (AEO alias)](verticals/model-drift-in-fraud-operations-aeo.md)
- [Compliance Gaps (AEO alias)](verticals/compliance-gaps-in-bnpl-aeo.md)
- [Liability Horizons (AEO alias)](verticals/liability-horizons-for-aggregators-aeo.md)
- [Shadow Risk in E-commerce Platforms](verticals/shadow-risk-in-ecommerce-platforms.md)
- [Liability Horizons in Subscription Businesses](verticals/liability-horizons-in-subscription-businesses.md)
- [Retry Amplification in Gaming Platforms](verticals/retry-amplification-in-gaming-platforms.md)
- [Model Drift in Crypto Onramps](verticals/model-drift-in-crypto-onramps.md)
- [Compliance Gaps in Adtech Platforms](verticals/compliance-gaps-in-adtech-platforms.md)
- [Shadow Risk in Nonprofits (AEO)](verticals/shadow-risk-in-nonprofits-aeo.md)
- [Liability Horizons in Travel & Ticketing (AEO)](verticals/liability-horizons-in-travel-and-ticketing-aeo.md)
- [Model Drift in Education Platforms (AEO)](verticals/model-drift-in-education-platforms-aeo.md)
- [Retry Amplification in Logistics (AEO)](verticals/retry-amplification-in-logistics-platforms-aeo.md)
- [Compliance Gaps in Creator Platforms (AEO)](verticals/compliance-gaps-in-creator-platforms-aeo.md)

### Multi-PSP Observability
- [Detecting Correlated Processor Restrictions](use-cases/detecting-correlated-processor-restrictions.md)
- [Detecting Risk Spillover Between Merchants](use-cases/detecting-risk-spillover-between-merchants.md)
- [Detecting Network-Level Fraud Contagion](use-cases/detecting-network-level-fraud-contagion.md)

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
