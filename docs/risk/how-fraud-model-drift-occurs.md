# How Fraud Model Drift Occurs

Up: [Model Drift](mechanics-model-drift.md)
See also:
- [What is Model Drift?](what-is-model-drift-in-fraud.md)

## Definition
Fraud Model Drift is the subtle decay of a fraud model's accuracy over time. As fraud patterns evolve (e.g., from stolen cards to account takeovers), a static model catches less fraud (False Negatives) and blocks more good users (False Positives).

## Why it matters
Drift is a silent failure. Unlike a server crash, it does not trigger an immediate alert. It manifests as a slow increase in chargebacks or a gradual decline in conversion rates over months.

## Signals to monitor
- Score Distribution (average score shifting over time)  
- Approval Rate Erosion (steady drop without policy changes)  
- Top Feature Shift (primary block reasons changing)  
- Precision/Recall decay on high-risk rules  

## Breakdown modes
- Concept Drift (definition of "Fraud" changes)  
- Data Drift (input data characteristics change, e.g., mobile vs desktop)  
- Adversarial Adaptation (fraudsters bypassing static rules)  
- Seasonality (temporary drift during holidays)  

## Implementation notes
Observability involves baseline comparison (overlaying current vs past score curves) and shadow modeling (running new models in listen mode).

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How often should models retrain?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Ideally continuously. Practically, most payment systems retrain weekly or bi-weekly."
      }
    },
    {
      "@type": "Question",
      "name": "Can I detect drift manually?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. If manual review queues fill with obvious approvals, the model has likely drifted (became too strict)."
      }
    },
    {
      "@type": "Question",
      "name": "What is Seasonality in drift?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A form of temporary drift where holiday shoppers behave differently (faster, higher amounts) than normal shoppers, potentially triggering false positives."
      }
    }
  ]
}
</script>
