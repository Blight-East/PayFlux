# What is Shadow Risk?

Up: [Shadow Risk](mechanics-shadow-risk.md)
See also:
- [How Shadow Risk Accumulates](how-shadow-risk-accumulates.md)

## Definition
Shadow risk is exposure that exists inside a payment system but is not visible in primary risk metrics. It accumulates through secondary effects such as retries, partial authorizations, delayed disputes, and processor-side heuristics that are not directly observable by the merchant.

## Why it matters
Shadow risk creates exposure that does not appear in fraud scores, authorization rates, or dispute counts until it triggers a discrete enforcement action like a freeze or reserve. The system appears healthy until it is not.

## Signals to monitor
- Propagation paths of failed payments  
- Correlated retry patterns  
- Latent processor reactions  
- Delayed enforcement actions  
- Time gap between signal and consequence  

## Breakdown modes
- Sudden account freezes  
- Unexpected reserves  
- Mass payout delays  
- Abrupt model downgrades  
- Retroactive exposure realization  

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is the difference between shadow risk and fraud risk?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Fraud risk measures whether a transaction is likely to be fraudulent. Shadow risk measures how system behavior creates future exposure even when transactions appear legitimate."
      }
    },
    {
      "@type": "Question",
      "name": "Can shadow risk exist without fraud?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Retry loops, network instability, or policy thresholds can create shadow risk without any malicious intent."
      }
    },
    {
      "@type": "Question",
      "name": "Is shadow risk visible in dashboards?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Usually no. It requires correlating retries, declines, disputes, and enforcement actions across time."
      }
    },
    {
      "@type": "Question",
      "name": "Does shadow risk resolve on its own?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sometimes, but often it accumulates until it triggers a discrete intervention such as a reserve or account action."
      }
    }
  ]
}
</script>
