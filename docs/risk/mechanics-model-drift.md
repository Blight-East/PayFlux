<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is model drift in fraud systems?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Model drift is the degradation of fraud model accuracy over time due to changing data patterns."
      }
    }
  ]
}
</script>

Up: [Payment Risk Events](../pillars/payment-risk-events.md)  
See also: [Compliance Gaps](./mechanics-compliance-gaps.md)

# What is Model Drift in Fraud Systems?

## Definition
Model drift occurs when prediction models no longer match real-world transaction behavior.

## Why it matters
Drift causes:
- rising false positives
- missed fraud
- unstable approval rates
- regulatory exposure

## Sources of drift
- customer behavior changes
- fraud strategy changes
- product changes
- data pipeline changes

## Breakdown modes
- Silent approval collapse
- Sudden block waves
- Increased disputes
- Unexplained revenue loss

## Where observability fits
- Tracks outcome accuracy
- Shows divergence trends
- Correlates policy shifts

## FAQ
### Can drift be prevented?
No. It can only be monitored and corrected.

### Is drift a bug?
No. It is a property of time.
