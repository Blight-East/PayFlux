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

## Upstream Causes
Model drift is usually triggered by:
- Adversarial adaptation (fraudsters evolving patterns)
- Shifts in customer behavior due to seasonality or growth
- Changes in merchant mix or traffic composition
- Use of obsolete training data or stale fraud labels
- Network protocol updates (e.g., widespread 3DS adoption)

## Downstream Effects
Model drift results in detection accuracy decay which leads to:
- False Positive inflation (blocking legitimate revenue)
- False Negative spikes (missed fraud losses)
- Erosion of approval rates for good customers
- Trust threshold misalignment across the payment stack
- Increased operational load for manual review teams

## Common Failure Chains
Example chains include:

**Model Drift → False Positive Spike → Conversion Drop → Revenue Suppression**

**Model Drift → Missed Fraud Spikes → Dispute Threshold Breach → Reserve Formation**

**Model Drift → Score Distribution Shift → Policy Instability → Enforcement Volatility**


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
