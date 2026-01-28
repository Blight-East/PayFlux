# Documentation Inventory and Canonical Strategy

## Canonical Map

### 1. Payment Risk Events
**Canonical**: `docs/pillars/payment-risk-events.md`
- Subordinates:
  - `docs/how-it-works/how-payment-infrastructure-detects-risk-events.md`
  - `docs/how-it-works/why-risk-events-follow-growth.md`

### 2. Dispute Infrastructure
**Canonical**: `docs/pillars/dispute-infrastructure.md`
- Subordinates:
  - `docs/risk/how-chargebacks-propagate.md`
  - `docs/risk/how-card-networks-handle-disputes.md`
  - `docs/risk/why-dispute-win-rates-vary.md`
  - `docs/risk/how-dispute-evidence-works.md`
  - `docs/risk/how-dispute-aging-curves-work.md`

### 3. Payment Settlements
**Canonical**: `docs/how-it-works/how-payment-settlements-work.md`
- Subordinates:
  - `docs/how-it-works/how-settlement-batching-works.md`
  - `docs/risk/how-payout-delays-work.md`
  - `docs/risk/how-liability-horizons-affect-payouts.md`
  - `docs/risk/how-shadow-risk-accumulates.md`
  - `docs/risk/how-negative-balance-cascades-form.md`

### 4. Payment Reserves
**Canonical**: `docs/risk/what-is-a-payment-reserve.md`
- Subordinates:
  - `docs/risk/how-reserve-release-logic-works.md`
  - `docs/risk/why-payment-processors-freeze-funds.md`
  - `docs/risk/why-major-processors-freeze-funds.md` (Merge or link)
  - `docs/risk/how-dispute-reserve-feedback-loops-work.md`

### 5. Merchant Underwriting
**Canonical**: `docs/risk/how-merchant-underwriting-works.md`
- Subordinates:
  - `docs/risk/how-kyc-and-underwriting-reviews-work.md`
  - `docs/risk/how-mcc-drift-affects-underwriting.md`
  - `docs/risk/why-processors-request-documents.md`
  - `docs/risk/how-compliance-timing-gaps-form.md`
  - `docs/risk/how-aml-screening-works.md`

### 6. Payment Risk Scoring
**Canonical**: `docs/risk/how-payment-risk-scoring-works.md`
- Subordinates:
  - `docs/risk/how-fraud-model-drift-occurs.md`
  - `docs/risk/how-risk-model-retraining-lag-works.md`
  - `docs/risk/how-multi-signal-correlation-affects-risk.md`
  - `docs/risk/how-risk-threshold-events-work.md`
  - `docs/how-it-works/how-risk-threshold-hysteresis-works.md`
  - `docs/risk/how-rolling-risk-windows-work.md`

### 7. Transaction Monitoring
**Canonical**: `docs/risk/how-transaction-monitoring-works.md`
- Subordinates:
  - `docs/risk/how-geo-velocity-affects-risk.md`
  - `docs/risk/how-bin-country-mismatch-affects-risk.md`
  - `docs/risk/how-retry-logic-affects-risk.md`
  - `docs/risk/how-retry-amplification-increases-exposure.md`
  - `docs/how-it-works/how-retry-storms-form.md`

### 8. Network Rules & Monitoring
**Canonical**: `docs/risk/how-network-monitoring-programs-work.md`
- Subordinates:
  - `docs/how-it-works/how-card-network-rule-changes-affect-merchants.md`
  - `docs/risk/how-network-vs-processor-authority-works.md`
  - `docs/risk/understanding-decline-reason-codes.md`

### 9. Refunds & Reversals
**Canonical**: `docs/risk/how-refunds-and-reversals-propagate.md`
- Subordinates:
  - `docs/risk/how-refund-abuse-patterns-work.md`

### 10. Payment System Observability
**Canonical**: `docs/pillars/payment-system-observability.md`
- Subordinates:
    - (Most Use Cases filter up to this or Transaction Monitoring)

## Overlap Notes
- `why-payment-processors-freeze-funds.md` and `why-major-processors-freeze-funds.md` are heavily overlapping. Will designate only one to be canonical-adjacent or keep both if clear distinction exists (e.g. one generic, one specific to big players).
