<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "MCC Drift",
  "description": "MCC Drift occurs when a merchant's actual business activity diverges from the Merchant Category Code (MCC) assigned at onboarding.",
  "about": "MCC Drift",
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
      "name": "What is MCC Drift?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "MCC Drift occurs when a merchant's actual business activity diverges from the Merchant Category Code (MCC) assigned at onboarding. For example, a bookstore (low risk) starting to sell electronics (high risk)."
      }
    },
    {
      "@type": "Question",
      "name": "Why does MCC Drift matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Compliance. Using the wrong MCC is a violation of network rules (Code Misuse) and can lead to immediate termination and MATCH list placement."
      }
    }
  ]
}
</script>

Up: [Merchant Underwriting](./how-merchant-underwriting-works.md)
See also: [Card Network Rules](./mechanics-card-network-rules.md)

# MCC Drift

Up: [How Transaction Monitoring Works](how-transaction-monitoring-works.md)
See also:
- [Merchant Underwriting](how-merchant-underwriting-works.md)


## Definition
MCC (Merchant Category Code) Drift occurs when a business evolves (or pivots) away from its original classification. A bookstore (MCC 5942, Low Risk) that starts selling Crypto (MCC 6051, High Risk) has "Drifted."

## Why it matters
Compliance. Processors underwrite you for a specific risk profile. If you change your business model without telling them, you are effectively "hiding" risk. This often leads to immediate termination for "Breach of Contract" or "Laundering."

## Signals to monitor
- **Ticket Size**: A sudden jump in Average Order Value (e.g., $20 -> $500).
- **Dispute Reasons**: A service business receiving "Merchandise Not Received" disputes.
- **Descriptor Match**: Does the credit card statement descriptor match the current website content?

## Breakdown modes
- **The Pivot**: A failing startup pivots to a high-risk model to survive, forgetting to update Stripe.
- **Scope Creep**: A marketplace adding a new "category" that is actually regulated/prohibited.
- **Transaction Laundering**: Intentionally using a shell company's MCC to process payments for a banned substance.

## Where observability fits
- **Anomaly Detection**: Alerting when traffic patterns deviate significantly from the "Profile."
- **Periodic Review**: Triggering internal audits every 6 months to verify the website matches the MCC.
- **Portfolio Health**: Ensuring the mix of MCCs in a platform account remains balanced.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Can I have multiple MCCs?
Yes, but you usually need separate Merchant Accounts (MIDs) for each business line.

### Who assigns the MCC?
The Processor/Acquirer assigns it during onboarding based on your website and application.

### Is Drift always bad?
No. Growing is good. But *unreported* drift is bad. Tell your processor before you pivot.

## See also
- [Merchant Underwriting](./how-merchant-underwriting-works.md)
- [High-Risk Merchants](../verticals/payment-risk-observability-for-high-risk-merchants.md)
- [Compliance Timing Gaps](./how-compliance-timing-gaps-form.md)
