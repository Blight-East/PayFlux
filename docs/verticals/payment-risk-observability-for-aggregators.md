<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Payment Aggregators",
  "description": "Aggregators (like Stripe Connect, PayPal) allow sub-merchants to process payments under a master entity. The aggregator assumes the risk of its sub-merchants.",
  "about": "Payment Aggregators",
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
      "name": "What are Payment Aggregators?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Aggregators (like Stripe Connect, PayPal) allow sub-merchants to process payments under a master entity. The aggregator assumes the risk of its sub-merchants, meaning if a sub-merchant disappears, the aggregator pays the bill."
      }
    },
    {
      "@type": "Question",
      "name": "Why does risk observability matter for Payment Aggregators?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Your worst user defines your destiny. If 1% of your sub-merchants are fraudsters, they can drag the entire platform's dispute rate over the 1% threshold, killing processing for the 99% of good users."
      }
    }
  ]
}
</script>

Up: [Payment System Observability](../pillars/payment-system-observability.md)
See also: [Marketplaces](./payment-risk-observability-for-marketplaces.md), [PSPs](./payment-risk-observability-for-psps.md)

# Aggregators (PayFacs)

## Definition
Aggregator Risk Observability tracks the liability of a "Master Merchant" who processes for "Sub-Merchants." Examples include Shopify Payments, Stripe Connect, or Toast. The Aggregator *is* the merchant of record in the eyes of the network.

## Why it matters
Unlike an ISO (who just refers business), an Aggregator is **financially liable**. If a sub-merchant sells non-existent goods and vanishes, the Aggregator must refund the cardholders. Risk management is the core competency of any PayFac.

## Signals to monitor
- **Sub-Merchant Velocity**: Sudden spikes in volume from previously quiet accounts.
- **Identity Clustering**: The same bank account or IP address appearing across multiple distinct merchant accounts.
- **Match-List Hits**: Sub-merchants appearing on TMF/MATCH lists.
- **Negative Balances**: Sub-merchant ledgers dropping below zero (debt).

## Breakdown modes
- **Account Takeover**: A dormant sub-merchant account being hacked and used to test stolen cards.
- **Category Laundering**: A sub-merchant approved for "Consulting" suddenly processing "Gambling" transactions.
- **Flash Fraud**: Opening 50 accounts, processing $5k each in 1 hour, and withdrawing immediately.

## Where observability fits
- **Real-Time Ledgering**: Maintaining a "General Ledger" for every sub-merchant to stop payouts instantly if risk flags triggers.
- **Cross-Account Correlation**: "Knowing" that User A and User B are actually the same person.
- **Behavioral Baselining**: Establishing "Normal" patterns for every sub-merchant to detect deviations.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Difference between PayFac and Marketplace?
A PayFac's primary product is *processing*. A Marketplace's primary product is *customers/demand*.

### Why is underwriting so fast?
Automated checks (KYC/AML) replace manual review. This speed creates the risk of "Leakage" (bad actors getting through).

### What is "Shadow Risk?"
The accumulation of potential chargebacks from volume processed but not yet disputed.

## See also
- [Marketplaces](./payment-risk-observability-for-marketplaces.md)
- [Merchant Underwriting](../risk/how-merchant-underwriting-works.md)
- [Compliance Timing Gaps](../risk/how-compliance-timing-gaps-form.md)
