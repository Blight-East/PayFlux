# What are Compliance Gaps?

Up: [What are Compliance Gaps?](mechanics-compliance-gaps.md)
See also:
- [How Compliance Timing Gaps Form](how-compliance-timing-gaps-form.md)


Compliance gaps are differences between regulatory requirements and how a payment system actually behaves under load, failure, or attack.

They are not policy violations by intent. They are operational mismatches.

## How Compliance Gaps Form

Compliance gaps emerge when:
- Systems scale faster than controls
- Monitoring lags behind behavior
- Enforcement depends on batch review
- Policies assume static conditions

They often appear only during incidents.

## Why Compliance Gaps Matter

Gaps expose organizations to:
- Regulatory penalties
- Forced shutdowns
- Processor enforcement
- Retroactive liability

They turn technical failures into legal failures.

## What Creates Hidden Gaps

Hidden gaps arise from:
- Retry loops bypassing controls
- Partial enforcement coverage
- Incomplete audit trails
- Latent dispute accumulation

Systems pass audits but fail in motion.

## FAQ

### Are compliance gaps intentional?
Usually not. They are side effects of system evolution.

### Are compliance gaps visible in dashboards?
Rarely. They require mapping rules to actual behavior.

### Do compliance gaps cause enforcement?
Yes. Gaps are often discovered only after enforcement actions occur.

### Can compliance gaps be closed?
Yes, by aligning system behavior with regulatory intent rather than static checks.

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What are compliance gaps?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Compliance gaps are mismatches between regulatory requirements and how payment systems behave in practice."
      }
    },
    {
      "@type": "Question",
      "name": "Why are compliance gaps risky?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "They turn technical failures into regulatory and legal exposure."
      }
    }
  ]
}
</script>
