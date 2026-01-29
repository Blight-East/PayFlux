<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Fraud Model Drift",
  "description": "Model Drift is the subtle decay of a fraud model's accuracy over time. As fraud patterns evolve (e.g., from stolen cards to account takeovers), a static model catches less fraud (False Negatives) and blocks more good users (False Positives).",
  "about": "Fraud Model Drift",
  "author": {
    "@type": "Organization",
    "name": "PayFlux"
  },
  "publisher": {
    "@type": "Organization",
    "name": "PayFlux"
  }
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Fraud Model Drift?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Model Drift is the subtle decay of a fraud model's accuracy over time. As fraud patterns evolve (e.g., from stolen cards to account takeovers), a static model catches less fraud (False Negatives) and blocks more good users (False Positives)."
      }
    },
    {
      "@type": "Question",
      "name": "Why does Fraud Model Drift matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Silent Failure. A server crash triggers an alert. Model drift does not. It manifests as a slow, creeping increase in chargebacks over months, or a gradual decline in conversion rates. By the time you notice, the damage is significant."
      }
    }
  ]
}
</script>

Up: [Payment Risk Scoring](./how-payment-risk-scoring-works.md)
See also: [Risk Model Retraining Lag](./mechanics-risk-thresholds-and-hysteresis.md)

# Fraud Model Drift

Up: [Model Drift](mechanics-model-drift.md)
See also:
- [What is Model Drift?](what-is-model-drift-in-fraud.md)


## Definition
Model Drift is the subtle decay of a fraud model's accuracy over time. As fraud patterns evolve (e.g., from stolen cards to account takeovers), a static model catches less fraud (False Negatives) and blocks more good users (False Positives).

## Why it matters
Silent Failure. A server crash triggers an alert. Model drift does not. It manifests as a slow, creeping increase in chargebacks over months, or a gradual decline in conversion rates. By the time you notice, the damage is significant.

## Signals to monitor
- **Score Distribution**: "Last month, average risk score was 20. This month, it's 15." (The model thinks traffic is cleaner; is it?)
- **Approval Rate Erosion**: A steady 0.5% drop per month.
- **Top Feature Shift**: The primary reason for blocking changing from "AVS Mismatch" to "Velocity" without a logic change.

## Breakdown modes
- **Concept Drift**: The definition of "Fraud" changes (e.g., Valid customers acting "weird" during a flash sale).
- **Data Drift**: The input data changes (e.g., Mobile traffic overtaking Desktop traffic, changing the device fingerprint baseline).
- **Adversarial Adaptation**: Fraudsters figuring out the rules ("Buy under $50") and adapting their attack to bypass the model.

## Where observability fits
- **Baseline Comparison**: Overlaying "This Month's" score curve against "Last Month's."
- **Precision/Recall Tracking**: Measuring the specific performance of high-risk rules.
- **Shadow Modeling**: Running a new model in "Listen Mode" to compare its decisions against the live model.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### How often should models retrain?
Ideally continuously. Practically, most systems retrain weekly or bi-weekly.

### Can I detect drift manually?
Yes. If your "Manual Review" queue suddenly fills up with obvious approvals, your model has drifted (too strict).

### What is "Seasonality?"
A form of temporary drift. Holiday shoppers behave differently (faster, higher amounts) than normal shoppers.

## See also
- [Risk Model Retraining Lag](./how-risk-model-retraining-lag-works.md)
- [Payment Risk Scoring](./how-payment-risk-scoring-works.md)
- [Multi-Signal Correlation](./how-multi-signal-correlation-affects-risk.md)
