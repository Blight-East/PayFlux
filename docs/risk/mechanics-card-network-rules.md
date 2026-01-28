<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Card Network Rules",
  "description": "Card Network Rules are the operating regulations published by Visa, Mastercard, AMEX, and Discover. They dictate liabilities, acceptable use policies (AUP), technical standards, and dispute parameters.",
  "about": "Card Network Rules",
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
      "name": "What are Card Network Rules?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Card Network Rules are the operating regulations published by Visa, Mastercard, AMEX, and Discover. They dictate liabilities, acceptable use policies (AUP), technical standards, and dispute parameters. Updates occur semi-annually (typically April and October)."
      }
    },
    {
      "@type": "Question",
      "name": "Why do Card Network Rules matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Compliance \"Force Majeure\".\n- **Binary Compliance**: A rule change can turn a compliant business into a prohibited one overnight.\n- **Fines**: Violations trigger assessments (e.g., $25,000 per month) or direct termination.\n- **Technical Debt**: New mandates (like 8-digit BINs or 3DS 2.0) break legacy integration code if ignored."
      }
    }
  ]
}
</script>

This page is part of the Payment Risk Mechanics series and serves as the primary reference for this topic.

Up: [Payment Risk Events](../pillars/payment-risk-events.md)
See also: [Network Monitoring Programs](./how-network-monitoring-programs-work.md), [Decline Reason Codes](./understanding-decline-reason-codes.md)

# Card Network Rules

## Definition
Card Network Rules are the operating regulations published by Visa, Mastercard, AMEX, and Discover. They dictate liabilities, acceptable use policies (AUP), technical standards, and dispute parameters. Updates occur semi-annually (typically April and October).

## Why It Matters
Compliance "Force Majeure".
- **Binary Compliance**: A rule change can turn a compliant business into a prohibited one overnight.
- **Fines**: Violations trigger assessments (e.g., $25,000 per month) or direct termination.
- **Technical Debt**: New mandates (like 8-digit BINs or 3DS 2.0) break legacy integration code if ignored.

## Signals to Monitor
- **Bulletin Alerts**: Monthly/Quarterly publications from the processor announcing upcoming mandates.
- **Decline Code Shifts**: New error variance (e.g., sudden spikes in `59 Suspected Fraud` due to new AVS rules).
- **Fee Line Items**: New "Integrity Fees" or assessments appearing on the settlement statement.
- **Compliance Emails**: Inbound notices citing specific regulation numbers (e.g., "Visa Core Rules 5.4.1").

## How It Breaks Down
- **Sudden Incompatibility**: Legacy code failing because a new optional field became mandatory.
- **Threshold Compression**: The allowable dispute rate dropping (e.g., from 1.0% to 0.9%), trapping previously safe merchants in a monitoring program.
- **Micro-Bans**: A specific MCC (e.g., Adult, Crypto, Nutra) being reclassified as "High Risk," triggering immediate account closure.

## How Risk Infrastructure Surfaces This
An observability system would surface these mechanics by:
- **Impact Analysis**: Correlating a drop in conversion with a declared "Network Update Date."
- **Payload Scanning**: Detecting missing data fields required by new mandates (e.g., "Missing `cardholder_ip`").
- **Fee Verification**: Audit-checking that new pass-through fees match the official published rates.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### How do I know about changes?
Your processor is contractually obligated to notify you. However, subscribing to network technical bulletins is the only way to get "Engineering Lead Time."

### Do rules apply to everyone?
Yes. From the smallest coffee shop to Amazon, network rules are the supreme law of the payment rails.

### Can I get an exception?
Extremely rare. Waivers are temporary and reserved for massive enterprise merchants with direct network relationships.
