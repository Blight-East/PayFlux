# What is Model Drift in Fraud Operations?

Up: [Model Drift in Fraud Operations](model-drift-in-fraud-operations.md)
See also: Docs Index


Model drift in fraud systems occurs when detection models lose accuracy because transaction patterns change faster than model retraining.

Fraud models are trained on historical data. When customer behavior, product mix, or attacker strategies shift, predictions degrade.

Drift occurs when:
• New merchant categories emerge  
• Attack patterns evolve  
• Traffic sources change  
• Policy thresholds lag reality  

## Mechanical effect

Drift causes:
• Rising false positives  
• Missed fraud clusters  
• Delayed alerts  
• Policy misalignment  

Fraud systems do not fail suddenly. They decay quietly.

## Structural cause

Drift is unavoidable in adaptive adversarial systems. It is not a bug — it is entropy in probabilistic models.

---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "What is model drift in fraud systems?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Model drift occurs when fraud detection models become less accurate as real-world transaction patterns change."
    }
  },{
    "@type": "Question",
    "name": "Why does model drift happen?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Because models are trained on past data and attackers adapt faster than retraining cycles."
    }
  }]
}
</script>
