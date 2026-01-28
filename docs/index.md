# PayFlux Documentation

Welcome to the PayFlux documentation library. This corpus explains the mechanics of payment risk, dispute infrastructure, and compliance observability. It focuses on the "physics" of money movement—how funds settle, how risk models behave, and how disputes propagate—rather than just API specs.

Use this library to understand the operational realities that PayFlux observes.

## Start Here (Canonical Guides)

These pages are the primary references for understanding the core systems.

### Pillars
- [Payment System Observability](pillars/payment-system-observability.md)
- [Dispute Infrastructure](pillars/dispute-infrastructure.md)
- [Payment Risk Events](pillars/payment-risk-events.md)

### Core Mechanics
- [Payment Settlements](how-it-works/how-payment-settlements-work.md)
- [Payment Reserves](risk/what-is-a-payment-reserve.md)
- [Merchant Underwriting](risk/how-merchant-underwriting-works.md)
- [Payment Risk Scoring](risk/how-payment-risk-scoring-works.md)
- [Transaction Monitoring](risk/how-transaction-monitoring-works.md)
- [Network Monitoring Programs](risk/how-network-monitoring-programs-work.md)
- [Refunds & Reversals](risk/how-refunds-and-reversals-propagate.md)

## How It Works
Deep dives into system dynamics and state transitions.

- [Settlement Batching](how-it-works/how-settlement-batching-works.md)
- [Risk Threshold Hysteresis](how-it-works/how-risk-threshold-hysteresis-works.md)
- [Risk Events & Growth](how-it-works/why-risk-events-follow-growth.md)
- [Retry Storms](how-it-works/how-retry-storms-form.md)
- [Card Network Rule Changes](how-it-works/how-card-network-rule-changes-affect-merchants.md)
- [Infrastructure Detection](how-it-works/how-payment-infrastructure-detects-risk-events.md)

## Risk Mechanics
Detailed explanations of specific risk factors and behaviors.

- [Chargeback Propagation](risk/how-chargebacks-propagate.md)
- [Shadow Risk Accumulation](risk/how-shadow-risk-accumulates.md)
- [Negative Balance Cascades](risk/how-negative-balance-cascades-form.md)
- [Model Drift](risk/how-fraud-model-drift-occurs.md)
- [Model Retraining Lag](risk/how-risk-model-retraining-lag-works.md)
- [Multi-Signal Correlation](risk/how-multi-signal-correlation-affects-risk.md)
- [Geo Velocity](risk/how-geo-velocity-affects-risk.md)
- [BIN-Country Mismatch](risk/how-bin-country-mismatch-affects-risk.md)
- [MCC Drift](risk/how-mcc-drift-affects-underwriting.md)
- [Retry Amplification](risk/how-retry-amplification-increases-exposure.md)
- [Dispute-Reserve Feedback Loops](risk/how-dispute-reserve-feedback-loops-work.md)
- [Liability Horizons](risk/how-liability-horizons-affect-payouts.md)
- [Reserve Release Logic](risk/how-reserve-release-logic-works.md)
- [Compliance Timing Gaps](risk/how-compliance-timing-gaps-form.md)
- [Network vs Processor Authority](risk/how-network-vs-processor-authority-works.md)
- [Rolling Risk Windows](risk/how-rolling-risk-windows-work.md)
- [Refund Abuse Patterns](risk/how-refund-abuse-patterns-work.md)
- [Decline Reason Codes](risk/understanding-decline-reason-codes.md)

## Verticals
tailored observability guides for specific business models.

- [Marketplaces](verticals/payment-risk-observability-for-marketplaces.md)
- [Marketplaces with Escrow](verticals/payment-risk-observability-for-marketplaces-with-escrow.md)
- [SaaS Platforms](verticals/payment-risk-observability-for-saas.md)
- [Subscription Businesses](verticals/payment-risk-observability-for-subscription-businesses.md)
- [PSPs](verticals/payment-risk-observability-for-psps.md)
- [Aggregators](verticals/payment-risk-observability-for-aggregators.md)
- [BNPL Providers](verticals/payment-risk-observability-for-bnpl.md)
- [High-Risk Merchants](verticals/payment-risk-observability-for-high-risk-merchants.md)

## Use Cases
Detection scenarios and operational guides.

- [Detecting Card Testing](use-cases/detecting-card-testing-attacks.md)
- [Detecting Cross-PSP Failures](use-cases/detecting-cross-psp-failures.md)
- [Differentiating Fraud Types](use-cases/differentiating-card-testing-from-velocity-fraud.md)
- [Handling Dispute Surges](use-cases/handling-dispute-surges.md)
- [Monitoring Negative Balances](use-cases/monitoring-negative-balances.md)
- [Monitoring Dispute Ratios](use-cases/monitoring-dispute-ratios.md)
- [Monitoring Reserves](use-cases/monitoring-payment-reserves.md)
- [Monitoring Payout Delays](use-cases/monitoring-payout-delays.md)
- [Monitoring Manual Review Backlogs](use-cases/monitoring-manual-review-backlogs.md)
- [Monitoring Settlement Failures](use-cases/monitoring-settlement-failures.md)
- [Monitoring Issuer Declines](use-cases/monitoring-issuer-decline-spikes.md)
