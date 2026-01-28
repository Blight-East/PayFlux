<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Detecting Card Testing",
  "description": "Card Testing (or \"Carding\") is an automated attack where fraudsters use a merchant's checkout to validate stolen credit card numbers. The goal is to identify which cards work.",
  "about": "Detecting Card Testing",
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
      "name": "What is Card Testing?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Card Testing (or \"Carding\") is an automated attack where fraudsters use a merchant's checkout to validate stolen credit card numbers. The goal is to identify which cards work (\"live cards\") to resell them on the dark web or use for larger purchases elsewhere."
      }
    },
    {
      "@type": "Question",
      "name": "Why does Card Testing matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Card testing destroys merchant reputation. It generates thousands of authorization fees (costing money) and spikes the decline rate (damaging network standing). If unchecked, it can lead to immediate account closure by the processor."
      }
    }
  ]
}
</script>

Up: [Payment System Observability](../pillars/payment-system-observability.md)
See also: [Card Testing vs. Velocity Fraud](./differentiating-card-testing-from-velocity-fraud.md)

# Detecting Card Testing

## Definition
Card Testing (or "Carding") is an automated attack where fraudsters use a merchant's checkout to validate stolen credit card numbers. The goal is to identify which cards work ("live cards") to resell them on the dark web or use for larger purchases elsewhere.

## Why it matters
Card testing destroys merchant reputation. It generates thousands of authorization fees (costing money) and spikes the decline rate (damaging network standing). If unchecked, it can lead to immediate account closure by the processor.

## Signals to monitor
- **Velocity**: A sudden spike in `attempts_per_minute` (e.g., from 10 to 1,000).
- **Amount Clustering**: thousands of transactions for exactly $1.00 or random small amounts.
- **BIN Concentration**: High volume of cards from a single foreign bank (e.g., a Brazilian BIN on a US storefront).
- **Decline Rate**: A shift from ~5% declines to >90% declines.

## Breakdown modes
- **Gateway Throttling**: The gateway blocking the merchant account due to "Excessive Traffic."
- **Auth Fee Exposure**: Incurring $0.30/txn on 10,000 failed transactions = $3,000 loss in minutes.
- **False Positives**: Blocking legitimate customers because the fraud rules were tightened too aggressively in panic.

## Where observability fits
- **Shape Detection**: recognizing the "Square Wave" pattern of a bot attack starting and stopping.
- **Cost Accumulation**: Real-time ticker of "Wasted Fees."
- **Attribute Clustering**: Identifying common User Agents or IP subnets to block.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Why do they use small amounts?
To stay under the radar of cardholder alerts ("Did you spend $1.00?").

### Should I refund the successful ones?
Yes, immediately. If the card was tested successfully, the real owner will eventually file a chargeback. Refund it before that happens.

### How do I stop it?
CAPTCHA is the most effective tool against bots. 3D Secure is the most effective tool against stolen credentials.

## See also
- [Diff Card Testing vs Velocity Fraud](./differentiating-card-testing-from-velocity-fraud.md)
- [Issuer Decline Spikes](./monitoring-issuer-decline-spikes.md)
- [Transaction Monitoring](../risk/how-transaction-monitoring-works.md)
