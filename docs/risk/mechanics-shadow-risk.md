<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is shadow risk in payments?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Shadow risk is financial or operational exposure created by indirect system behavior rather than explicit policy decisions."
      }
    },
    {
      "@type": "Question",
      "name": "Why is shadow risk hard to detect?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Because it emerges from interactions between systems, not from single transactions or rules."
      }
    }
  ]
}
</script>

Up: [Payment Risk Events](../pillars/payment-risk-events.md)  
See also: [Retry Amplification](./mechanics-retry-amplification.md)

# What is Shadow Risk in Payments?

## Definition
Shadow risk is exposure created by secondary system effects rather than direct transaction decisions.

It arises when multiple systems interact in ways not explicitly modeled:
- retry logic
- risk thresholds
- monitoring automation
- payout timing
- compliance rules

## Why it matters
Shadow risk accumulates silently and is usually detected only after:
- reserves increase
- accounts are frozen
- dispute ratios spike
- processors intervene

It is risk created by *system shape*, not merchant intent.

## Common sources
- Retry loops interacting with issuer velocity limits
- Refund logic colliding with settlement batching
- Fraud rules reinforcing decline patterns
- Monitoring tools triggering each other

## Breakdown modes
- Latent exposure builds with no visible alerts
- Correlation is mistaken for causation
- Risk appears suddenly after a threshold is crossed

## Where observability fits
- Tracks cross-system feedback loops
- Surfaces accumulation patterns
- Shows second-order effects

## FAQ
### Is shadow risk the same as fraud?
No. Fraud is an external adversary. Shadow risk is internal system behavior.

### Can shadow risk be eliminated?
No. It can only be surfaced and constrained.
