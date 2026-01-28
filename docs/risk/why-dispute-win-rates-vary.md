<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Dispute Win Rates",
  "description": "The Dispute Win Rate is the percentage of chargebacks fully overturned in the merchant's favor. It measures the effectiveness of the evidence submission process.",
  "about": "Dispute Win Rates",
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
      "name": "What is a Dispute Win Rate?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The Dispute Win Rate is the percentage of chargebacks fully overturned in the merchant's favor. `(Won / Total Disputes)`. It measures the effectiveness of the evidence submission process."
      }
    },
    {
      "@type": "Question",
      "name": "Why does a Dispute Win Rate matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Profitability. A bad win rate (0-10%) means you are bleeding revenue. A good win rate (30-40%) recovers significant margin. However, a *perfect* win rate usually means your fraud filters are too strict (rejecting good customers)."
      }
    }
  ]
}
</script>

Up: [Dispute Infrastructure](../pillars/dispute-infrastructure.md)
See also: [Dispute Evidence](./how-dispute-evidence-works.md)

# Dispute Win Rates

## Definition
The Dispute Win Rate is the percentage of chargebacks fully overturned in the merchant's favor. `(Won / Total Disputes)`. It measures the effectiveness of the evidence submission process.

## Why it matters
Profitability. A bad win rate (0-10%) means you are bleeding revenue. A good win rate (30-40%) recovers significant margin. However, a *perfect* win rate usually means your fraud filters are too strict (rejecting good customers).

## Signals to monitor
- **Win Rate by Reason Code**: "Fraud" (Hard to win) vs "Product Not Received" (Easier to win).
- **Win Rate by Card Brand**: Amex is known to be more cardholder-friendly than Visa.
- **Auto-Loss Rate**: Disputes lost because no evidence was submitted (Administrative failure).

## Breakdown modes
- **The 3DS Gap**: Losing "Fraud" disputes because 3D Secure was not used (Automatic Liability).
- **The Admin Fail**: Losing disputes because the team forgot to upload the PDF.
- **The Policy Gap**: Losing "Subscription" disputes because the "Cancellation Policy" wasn't clearly visible on the checkout page.

## Where observability fits
- **A/B Testing**: Testing different evidence templates to see which yields higher win rates.
- **Cost Analysis**: "It costs $20 to fight. We only win 10% of $10 disputes. Stop fighting them."
- **Feedback Loop**: Using win/loss data to update the Terms of Service.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### What is a good win rate?
20-30% is standard. >40% is excellent. >50% suggests you are over-blocking.

### Does winning help my ratio?
Usually NO. The ratio includes *all* disputes filed. Winning gets your money back, but usually doesn't remove the "Strike" from your record.

### Why did I lose even with proof?
The Issuer decides. They prioritize their customer (the cardholder) over you.

## See also
- [Dispute Evidence](./how-dispute-evidence-works.md)
- [Card Network Dispute Handling](./how-card-networks-handle-disputes.md)
- [Monitoring Dispute Ratios](../use-cases/monitoring-dispute-ratios.md)
