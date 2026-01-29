# What is Model Drift in Fraud?

Up: [Model Drift](mechanics-model-drift.md)
See also:
- [How Fraud Model Drift Occurs](how-fraud-model-drift-occurs.md)

## Definition
Model drift is the gradual loss of accuracy in fraud detection models as transaction patterns change over time. The model still produces scores, but the meaning of those scores degrades.

## Why it matters
Drift causes false positives to increase (blocking good users), true fraud to be missed, and trust thresholds to misalign. Decisions become based on stale assumptions, making the system unreliable.

## Signals to monitor
- Rising disputes despite stable risk scores  
- Declines increasing without fraud explanation  
- Sudden enforcement actions  
- Divergence between expected and observed outcomes  
- Score distribution shifts  

## Breakdown modes
- Customer behavior shifts  
- Evolving attack strategies  
- Merchant mix changes  
- Network condition fluctuations  

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is model drift a bug?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. It is a natural effect of changing environments and evolving fraud patterns."
      }
    },
    {
      "@type": "Question",
      "name": "Can drift be prevented?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Not fully. It must be detected and corrected through retraining and calibration."
      }
    },
    {
      "@type": "Question",
      "name": "Is drift the same as overfitting?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Overfitting is a training problem. Drift is a deployment problem where live data diverges from training data."
      }
    },
    {
      "@type": "Question",
      "name": "How often does drift occur?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Continuously. Its impact depends on how fast the environment changes."
      }
    }
  ]
}
</script>
