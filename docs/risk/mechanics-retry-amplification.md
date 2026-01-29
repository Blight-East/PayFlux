<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is retry amplification?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Retry amplification occurs when automated retries increase risk instead of reducing failure."
      }
    },
    {
      "@type": "Question",
      "name": "Why do retries increase risk?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Because networks interpret repeated failures as abuse or fraud."
      }
    }
  ]
}
</script>

Up: [Payment Risk Events](../pillars/payment-risk-events.md)  
See also: [Shadow Risk](./mechanics-shadow-risk.md)

# What is Retry Amplification?

## Definition
Retry amplification is when recovery logic (retries) increases failure rates instead of decreasing them.

## Why it matters
Retries affect:
- network velocity scores
- fraud classifiers
- issuer trust
- dispute ratios

Beyond a point, retries worsen outcomes.

## Mechanism
1. Transaction fails
2. System retries
3. Issuer flags velocity
4. More declines occur
5. System retries again

This forms a positive feedback loop.

## Breakdown modes
- Retry storms
- Issuer blacklisting
- Processor throttling
- Elevated dispute rates

## Where observability fits
- Shows retry clusters
- Detects compounding loops
- Maps decline reason shifts

## FAQ
### Are retries always bad?
No. They are harmful only when unconstrained.

### What triggers amplification?
High-frequency retries on soft declines.
