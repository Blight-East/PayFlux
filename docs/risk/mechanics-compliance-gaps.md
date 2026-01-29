<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Compliance Gaps",
  "description": "Compliance gaps are mismatches between a merchant’s observed processing behavior and the documentation, controls, or policies required under KYC/KYB, AML, and card network rules. Gaps often trigger document requests, payout delays, holds, or account reviews.",
  "about": "Compliance gaps in payment systems",
  "author": { "@type": "Organization", "name": "PayFlux" },
  "publisher": { "@type": "Organization", "name": "PayFlux" }
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What are compliance gaps in payments?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Compliance gaps are mismatches between a merchant’s observed processing behavior and the documentation, controls, or policies required under KYC/KYB, AML, and card network rules. Gaps often trigger document requests, payout delays, holds, or account reviews."
      }
    },
    {
      "@type": "Question",
      "name": "Why do compliance gaps matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Because processors and partner banks manage regulatory and network liability. When observed behavior doesn’t match the compliance profile, controls are applied to reduce exposure until the gap is resolved."
      }
    }
  ]
}
</script>

Up: [Payment Risk Events](../pillars/payment-risk-events.md)  
See also: [How KYC and Underwriting Reviews Work](./how-kyc-and-underwriting-reviews-work.md), [Why Processors Request Documents](./why-processors-request-documents.md), [AML Screening](./how-aml-screening-works.md)

# Compliance Gaps

## Definition
Compliance gaps are mismatches between observed processing behavior and the documentation, controls, or policies required under KYC/KYB, AML, and card network rules.

## Why It Matters
Compliance controls are designed to reduce liability. When a gap is detected, systems often default to **risk-reducing actions**: document requests, payout delays, reserves, or holds until the merchant profile is revalidated.

## Signals to Monitor
- **KYC/KYB status**: missing/expired documents, beneficial ownership verification gaps.
- **Transaction monitoring flags**: unusual velocity, geography anomalies, suspicious patterns.
- **Chargeback reason codes** indicating policy/fulfillment mismatch.
- **Refund policy signals**: high refund rate or long fulfillment times without clear disclosure.
- **MCC drift**: observed goods/services inconsistent with declared category.
- **Customer complaint patterns**: disputes clustered around “services not provided” or “credit not processed.”

## How It Breaks Down
- **Documentation mismatch**: business model or inventory claims don’t match processing reality.
- **Ownership/identity issues**: beneficial owner verification incomplete or inconsistent.
- **Behavioral anomalies**: sudden geo expansion, unusual ticket size distribution, or velocity spikes.
- **Rule enforcement cycles**: periodic checks trigger action even if behavior changed earlier.
- **Partner constraints**: bank/network requirements force a conservative response.

## How Risk Infrastructure Surfaces This
An observability system surfaces compliance gaps by:
- **Mapping flags to drivers** (SKU, channel, cohort, region).
- **Maintaining audit trails** of documents provided, decisions, and timestamps.
- **Monitoring mismatch indicators** like MCC drift or fulfillment/refund timing shifts.
- **Surfacing “why now” timelines** to identify which change preceded the control.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ
### Why would compliance get involved if I’m not doing anything illegal?
Compliance systems are about matching required profiles and disclosures. Gaps can be operational (fulfillment timing, refund handling) not criminal.

### Do compliance gaps always mean a freeze?
No. They can show up as document requests, payout delays, or reserve adjustments depending on severity.

### What’s the fastest way to reduce compliance friction?
Keep documents current, align disclosures with actual fulfillment/refund behavior, and monitor for category/behavior drift early.
