<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Chargeback Propagation",
  "description": "Chargeback Propagation is the multi-step journey of a dispute from the Cardholder's Bank (Issuer) -> Card Network -> Acquiring Bank -> Processor -> Merchant. It is a slow, asynchronous message chain that often takes weeks to complete.",
  "about": "Chargeback Propagation",
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
      "name": "What is Chargeback Propagation?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Chargeback Propagation is the multi-step journey of a dispute from the Cardholder's Bank (Issuer) -> Card Network -> Acquiring Bank -> Processor -> Merchant. It is a slow, asynchronous message chain that often takes weeks to complete."
      }
    },
    {
      "@type": "Question",
      "name": "Why does Chargeback Propagation matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Latency. You might receive a chargeback notification 45 days after the sale. This \"Blind Spot\" means your current risk models are always fighting the war from last month. Understanding the lag is critical for accurate forecasting."
      }
    }
  ]
}
</script>

Up: [Dispute Infrastructure](../pillars/dispute-infrastructure.md)
See also: [Dispute Evidence](./how-dispute-evidence-works.md), [Dispute Win Rates](./why-dispute-win-rates-vary.md)

# Chargeback Propagation

## Definition
Chargeback Propagation is the multi-step journey of a dispute from the Cardholder's Bank (Issuer) -> Card Network -> Acquiring Bank -> Processor -> Merchant. It is a slow, asynchronous message chain that often takes weeks to complete.

## Why it matters
Latency. You might receive a chargeback notification 45 days after the sale. This "Blind Spot" means your current risk models are always fighting the war from last month. Understanding the lag is critical for accurate forecasting.

## Signals to monitor
- **TC40 / SAFE Reports**: Early fraud warnings sent by the network days before the actual chargeback.
- **Retrieval Requests**: A "soft inquiry" from the bank asking for details (often a precursor to a chargeback).
- **Dispute Webhooks**: The real-time ping from the processor when the dispute officially lands.

## Breakdown modes
- **Evidence Timeout**: Failing to respond within the strict timeframe (usually 14-20 days) leads to automatic loss.
- **Double Refund**: Refunding the customer *after* the chargeback has arrived (losing the money twice).
- **Representment Failure**: Submitting illegible or irrelevant evidence that gets auto-rejected.

## Where observability fits
- **Lag Tracking**: Measuring the "Days to Dispute" (Sale Date vs Dispute Date) to model the exposure tail.
- **Win Rate**: Tracking the success of representment efforts by reason code.
- **Financial Reconciliation**: verifying that funds debited for disputes are credited back if you win.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Why does it take so long?
Because it involves 4 different banks and a manual review process by the issuer.

### Can I stop a chargeback?
No. Once filed, it must play out. You can only prevent it via refunds *before* it is filed.

### Who decides who wins?
The Issuing Bank (the customer's bank) is the judge. This is why merchants often feel the system is biased.

## See also
- [Dispute Infrastructure](../pillars/dispute-infrastructure.md)
- [How Refunds Propagate](./how-refunds-and-reversals-propagate.md)
- [Handling Dispute Surges](../use-cases/handling-dispute-surges.md)
