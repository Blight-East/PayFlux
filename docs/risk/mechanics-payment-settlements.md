<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Payment Settlements",
  "description": "Settlement is the process of moving actual funds from the Cardholder's Issuing Bank -> Card Network -> Acquiring Bank -> Merchant. It is the final state of money movement.",
  "about": "Payment Settlements",
  "author": {
    "@type": "Organization",
    "name": "PayFlux"
  },
  "publisher": {
    "@type": "Organization",
    "name": "PayFlux"
  }
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Payment Settlement?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Settlement is the process of moving actual funds from the Cardholder's Issuing Bank -> Card Network -> Acquiring Bank -> Merchant. It is the final state of money movement, distinct from **Authorization** (Holding funds) and **Capture** (Requesting funds)."
      }
    },
    {
      "@type": "Question",
      "name": "Why does Payment Settlement matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Cash is Reality. A transaction can be \"Approved\" but never settle. Liquidity management depends on the settlement timeline (T+2, T+3), and settlement is the choke-point where processors apply Reserves, Fees, and Holds."
      }
    }
  ]
}
</script>

This page is part of the Payment Risk Mechanics series and serves as the primary reference for this topic.

Up: [Payment System Observability](../pillars/payment-system-observability.md)
See also: [Settlement Batching](./mechanics-settlement-batching.md), [Payment Reserves and Balances](./mechanics-payment-reserves-and-balances.md)

# Payment Settlements

## Definition
Settlement is the process of moving actual funds from the Cardholder's Issuing Bank -> Card Network -> Acquiring Bank -> Merchant. It is the final state of money movement, distinct from **Authorization** (Holding funds) and **Capture** (Requesting funds).

## Why It Matters
Cash is Reality.
- **Vanity vs Sanity**: A transaction can be "Approved" but never settle (if voided or batched incorrectly).
- **Liquidity**: Understanding the timeline (T+2, T+3) is critical for payroll and inventory management.
- **Risk Control**: Settlement is the choke-point where processors apply Reserves, Fees, and Holds.

## Signals to Monitor
- **Net Deposit**: The actual amount hitting the bank account `(Sales - Refunds - Fees - Reserves)`.
- **Deposit Latency**: The time gap between "Batch Close" and "Cash in Bank" (Tracking the T+N SLA).
- **Match Rate**: The % of Captured transactions that successfully appear in a Settlement file.
- **Fedwire/ACH Alerts**: Inbound bank notifications.

## How It Breaks Down
- **Missed Cutoff**: Capturing a transaction at 5:01 PM means it waits 24 hours for the next batch.
- **The Holiday Gap**: Weekends and bank holidays stop the ACH rails, creating liquidity droughts.
- **Risk Holds**: Valid transactions being Captured, but the *Settlement* being paused by risk logic.

## How Risk Infrastructure Surfaces This
An observability system would surface these mechanics by:
- **Reconciliation**: Matching every "Captured" order ID to a "Settled" line item to detect "Missing Money."
- **Fee Verification**: Calculating the effective take rate by comparing Gross Sales vs Net Deposit.
- **Gap Detection**: Alerting when the processor claims to have paid, but the bank account shows $0.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## Upstream Causes
Settlement behavior is influenced by:
- batch processing schedules
- issuer clearing timelines
- reserve and hold logic
- reconciliation systems
- dispute offsets
- compliance interventions

It governs how authorized funds become available balances.


## Downstream Effects
Settlement failures result in:
- payout delays
- negative balances
- merchant cash flow volatility
- reconciliation errors
- increased reserve requirements

They convert timing mismatches into financial stress.


## Common Failure Chains
**Reserve Increase → Settlement Offset → Delayed Availability**

**Dispute Adjustment → Net Settlement Drop → Balance Deficit**

**Batch Failure → Clearing Delay → Payout Lag**

These chains explain how settlement mechanics produce liquidity risk.


## FAQ

### Why does it take 2 days (T+2)?
Legacy banking rails (ACH/Fedwire) and the need for the Card Network to calculate the "Net Settlement Position" between thousands of banks globally.

### What is "Instant Payout"?
Push-to-Card (Debit) technology that bypasses ACH to fund in minutes, usually for a 1-1.5% fee.

### Where is my money?
If it's not in the bank, it's either: 1. In Transit (ACH System), 2. In Reserve (Processor), or 3. Failed (Batch Error).
