<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Dispute Evidence",
  "description": "Dispute Evidence is the \"Legal Brief\" a merchant submits to fight a chargeback. It must prove the transaction was valid relative to the specific Reason Code filed by the cardholder.",
  "about": "Dispute Evidence",
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
      "name": "What is Dispute Evidence?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Dispute Evidence is the \"Legal Brief\" a merchant submits to fight a chargeback. It must prove the transaction was valid relative to the *specific* Reason Code filed by the cardholder."
      }
    },
    {
      "@type": "Question",
      "name": "Why does Dispute Evidence matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Specificity. Sending a tracking number for a \"Fraud\" dispute is useful. Sending a tracking number for a \"Credit Not Processed\" dispute is useless. You must answer the *specific* accusation made by the cardholder."
      }
    }
  ]
}
</script>

Up: [Dispute Infrastructure](../pillars/dispute-infrastructure.md)
See also: [Chargeback Propagation](./how-chargebacks-propagate.md), [Dispute Win Rates](./why-dispute-win-rates-vary.md)

# Dispute Evidence

## Definition
Dispute Evidence is the "Legal Brief" a merchant submits to fight a chargeback. It must prove the transaction was valid relative to the *specific* Reason Code filed by the cardholder.

## Why it matters
Specificity. Sending a tracking number for a "Fraud" dispute is useful. Sending a tracking number for a "Credit Not Processed" dispute is useless. You must answer the *specific* accusation made by the cardholder.

## Signals to monitor
- **Representment Rate**: The % of disputes you choose to fight.
- **Win Rate by Code**: "We win 40% of Fraud disputes but 0% of Service disputes."
- **Auto-Win Potential**: Identifying cases where you have perfect evidence (e.g., AVS Match + 3DS Auth).

## Breakdown modes
- **Data Dump**: Uploading 50 pages of unorganized logs. The bank analyst has 60 seconds to review; they will reject it.
- **Illegible Docs**: blurry screenshots or tiny text.
- **Wrong Evidence**: Proving delivery to "123 Main St" when the billing address was "456 Oak St" (AVS Mismatch).

## Where observability fits
- **Asset Retrieval**: Automatically fetching the invoice, logs, and shipping proof associated with the Transaction ID.
- **Template Matching**: Suggesting the right response template based on the Reason Code.
- **Outcome Analysis**: "We lost because the tracking number didn't show the 'Delivered' status."

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### What is "Compelling Evidence?"
A specific term in Visa rules. It refers to data points (IP, Device ID, Account History) that link the dispute to previous undisputed transactions.

### Can I submit video?
Usually no. PDFs or JPEGs are the standard.

### Does the customer see my evidence?
Yes. The bank often shares it with the cardholder to say "Look, you did buy this."

## See also
- [Dispute Infrastructure](../pillars/dispute-infrastructure.md)
- [Card Network Dispute Handling](./how-card-networks-handle-disputes.md)
- [Dispute Win Rates](./why-dispute-win-rates-vary.md)
