<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Marketplaces",
  "description": "Marketplace Risk Observability is the practice of monitoring payment liabilities in multi-party environments. Unlike direct merchants, marketplaces often act as the Merchant of Record (MoR).",
  "about": "Marketplaces",
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
      "name": "What are Marketplaces?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Marketplace Risk Observability is the practice of monitoring payment liabilities in multi-party environments. Unlike direct merchants, marketplaces often act as the Merchant of Record (MoR), making them financially liable for the behavior of thousands of anonymous sellers."
      }
    },
    {
      "@type": "Question",
      "name": "Why does risk observability matter for Marketplaces?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "One bad seller can sink the ship. If a single fraudster drives the platform's aggregate dispute rate above 1%, the card network will fine or suspend the *platform*, potentially blocking payments for all good sellers."
      }
    }
  ]
}
</script>

Up: [Payment System Observability](../pillars/payment-system-observability.md)
See also: [Aggregators](./payment-risk-observability-for-aggregators.md), [PSPs](./payment-risk-observability-for-psps.md)

# Marketplaces

## Definition
Marketplace Risk Observability is the practice of monitoring payment liabilities in multi-party environments. Unlike direct merchants, marketplaces often act as the Merchant of Record (MoR), making them financially liable for the behavior of thousands of anonymous sellers.

## Why it matters
One bad seller can sink the ship. If a single fraudster drives the platform's aggregate dispute rate above 1%, the card network will fine or suspend the *platform*, potentially blocking payments for all good sellers.

## Signals to monitor
- **Seller Dispute Ratios**: Tracking chargebacks per sub-merchant ID.
- **Category Drift**: Sellers changing inventory from safe items (books) to risky items (electronics) without re-underwriting.
- **Collusion Patterns**: Buyer/Seller pairs sharing IP addresses or device fingerprints.
- **Platform Aggregate**: The rolled-up dispute rate of the entire master account.

## Breakdown modes
- **Pool Contamination**: One toxic seller influencing the risk score of the shared merchant pool.
- **Settlement Lag**: Paying out a seller *before* the chargeback arrives, leaving the platform with a negative balance.
- **Identity Recycling**: Banned sellers reappearing with new emails but same bank accounts.

## Where observability fits
- **Attribution**: Decomposing a platform-level risk notification ("You are at 0.9%") into a list of specific offending sellers.
- **Isolation**: Freezing payouts for specific sub-merchants while keeping the rest of the platform open.
- **Ledger Auditing**: Tracking the "Net Position" of every seller node in real-time.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Why am I liable for my sellers?
If you are the Merchant of Record, the card network sees YOU as the seller. The sub-sellers are just your "suppliers." You own the risk.

### Can I pass the fines to sellers?
Legally, yes (if in your TOS). Practically, if the seller is a fraudster, they have already withdrawn the money and vanished.

### difference between Marketplace and PayFac?
Marketplaces sell goods/services (Airbnb, Etsy). PayFacs sell payment processing (Toast, Shopify). The risk models are similar but the regulations differ.

## See also
- [Aggregators](./payment-risk-observability-for-aggregators.md)
- [Marketplaces with Escrow](./payment-risk-observability-for-marketplaces-with-escrow.md)
- [Compliance Timing Gaps](../risk/how-compliance-timing-gaps-form.md)
