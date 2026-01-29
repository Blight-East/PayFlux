# Model Drift

## Definition
Model drift is the degradation of predictive accuracy due to changing input distributions or feedback loops.

## Why it matters
Drift causes false positives, missed fraud, and unstable enforcement.

## Signals to monitor
- Feature distribution shifts  
- Label delay growth  
- Precision/recall decay  
- Population stability index  
- Correlation breakdowns  

## Breakdown modes
- Overblocking  
- Fraud leakage  
- Sudden rule overrides  
- Policy misalignment  
- Enforcement cascades  

## Implementation notes
Drift must be monitored continuously, not during retraining only.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is model drift?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Model drift is loss of predictive accuracy as real-world behavior changes."
      }
    },
    {
      "@type": "Question",
      "name": "Why does drift happen?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Because training data no longer matches live transaction patterns."
      }
    },
    {
      "@type": "Question",
      "name": "Can drift cause freezes?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Drift can inflate risk scores and trigger enforcement."
      }
    },
    {
      "@type": "Question",
      "name": "How is drift detected?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "By measuring distribution shifts and performance decay over time."
      }
    }
  ]
}
</script>
