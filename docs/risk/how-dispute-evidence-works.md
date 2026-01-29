# Dispute Evidence

Up: [Dispute Infrastructure](../pillars/dispute-infrastructure.md)
See also: [Chargeback Propagation](./how-chargebacks-propagate.md), [Dispute Win Rates](./why-dispute-win-rates-vary.md)

## Definition
Dispute Evidence is the "Legal Brief" a merchant submits to fight a chargeback. It is a collection of data points—invoices, shipping proofs, logs—that must prove the transaction was valid relative to the *specific* Reason Code filed by the cardholder.

## Why it matters
Specificity Wins. Sending a tracking number for a "Fraud" dispute is useful. Sending a tracking number for a "Credit Not Processed" dispute is useless. You must answer the *specific* accusation made by the cardholder. A "Data Dump" leads to an automatic loss.

## Signals to monitor
- **Representment Rate**: The % of disputes you choose to fight vs. accept.
- **Win Rate by Code**: "We win 40% of Fraud disputes but 0% of Service disputes."
- **Auto-Win Potential**: Identifying cases with perfect evidence (AVS Match + 3DS Auth) that should be fought automatically.
- **Cost/Benefit**: Tracking whether the cost of fighting a dispute ($15 processing fee) exceeds the transaction value.

## Breakdown modes
- **The Data Dump**: Uploading 50 pages of unorganized logs. The bank analyst has roughly 60 seconds to review; they will reject unorganized files.
- **Illegible Docs**: Using blurry screenshots or tiny text that automated network scanners cannot parse.
- **Wrong Evidence Type**: Proving delivery to "Main St" when the cardholder's billing address was "Oak St" (AVS Mismatch).

## Where observability fits
Observability automates "Asset Retrieval." By linking a Dispute ID to its original Transaction ID, the system can instantly pull the relevant invoice, shipping proof, and IP logs into a standardized PDF format designed for bank approval.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is 'Compelling Evidence'?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A specific network term for data points (IP, Device ID, History) that link a dispute to previous undisputed transactions by the same user."
      }
    },
    {
      "@type": "Question",
      "name": "Can I submit video evidence?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Generally no. PDFs or JPEGs are the industry standard for network submissions."
      }
    },
    {
      "@type": "Question",
      "name": "Does the customer see the evidence?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Often yes. The issuing bank shares it with the cardholder to confirm if they wish to proceed with the dispute."
      }
    }
  ]
}
</script>
