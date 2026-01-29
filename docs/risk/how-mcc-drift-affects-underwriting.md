# MCC Drift

Up: [Merchant Underwriting](./how-merchant-underwriting-works.md)
See also: [Transaction Monitoring](./how-transaction-monitoring-works.md), [High-Risk Merchants](../verticals/payment-risk-observability-for-high-risk-merchants.md)

## Definition
MCC (Merchant Category Code) Drift occurs when a business evolves or pivots away from its original classification assigned at onboarding. For example, a bookstore (MCC 5942, Low Risk) that begins selling Crypto (MCC 6051, High Risk) has "Drifted."

## Why it matters
Compliance and Contractual Risk. Processors underwrite for a specific risk profile. Changing your business model without notification is viewed as "hiding" risk, often leading to immediate termination for "Breach of Contract" or "Merchant Category Code Misuse." It can also land a merchant on the MATCH list.

## Signals to monitor
- **Order Value Jump**: A sudden shift in Average Order Value (e.g., $20 -> $500).
- **Dispute Reason Shifts**: A service business suddenly receiving "Merchandise Not Received" claims.
- **Descriptor Match**: Verifying that the card statement descriptor still matches the actual website content.

## Breakdown modes
- **The Pivot**: A failing startup pivots to a high-risk model to survive but forgets to update their payment application.
- **Scope Creep**: A marketplace adding a new category (like Tobacco or Pharmacy) that is highly regulated or prohibited by the network.
- **Transaction Laundering**: Intentionally using a shell company's low-risk MCC to process payments for a banned or high-risk substance.

## Where observability fits
Observability uses anomaly detection to alert when traffic patterns deviate significantly from the "Expected Profile." By triggering internal reviews every 6 months, a merchant can ensure their MCC always matches their current business reality.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Can I have multiple MCCs?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, but you usually need separate Merchant Accounts (MIDs) for each distinct business line."
      }
    },
    {
      "@type": "Question",
      "name": "Who assigns the MCC?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The Processor/Acquirer assigns it based on your application and website content during onboarding."
      }
    },
    {
      "@type": "Question",
      "name": "Is Drift always bad?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Growth is good. But unreported drift is a violation. Always notify your processor before a pivot."
      }
    }
  ]
}
</script>
