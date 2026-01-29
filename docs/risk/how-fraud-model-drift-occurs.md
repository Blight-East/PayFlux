# How Fraud Model Drift Occurs

Up: [Model Drift](mechanics-model-drift.md)
See also:
- [What is Model Drift?](what-is-model-drift-in-fraud.md)

## Definition
Fraud Model Drift is the subtle decay of a fraud model's accuracy over time. As fraud patterns evolve (e.g., from stolen cards to account takeovers), a static model catches less fraud (False Negatives) and blocks more good users (False Positives).

## Why it matters
Drift is a silent failure. Unlike a server crash, it does not trigger an immediate alert. It manifests as a slow increase in chargebacks or a gradual decline in conversion rates over months. Decisions become based on stale assumptions, making the system unreliable.

## Signals to monitor
- **Score Distribution Shift**: The average risk score shifting over time without changes in traffic quality.
- **Approval Rate Erosion**: A steady drop in successful transactions without policy changes.
- **Top Feature Shift**: Changes in which signals (e.g., location, device) are primary block drivers.
- **Precision/Recall Decay**: The model becoming less accurate at predicting which transactions are actually fraud.

## Breakdown modes
- **Concept Drift**: The fundamental definition of what constitutes "Fraud" changes in the marketplace.
- **Data Drift**: Baseline characteristics of incoming data change (e.g., a sudden shift from desktop to mobile users).
- **Adversarial Adaptation**: Fraudsters identifying and intentionally bypassing static rules or model features.
- **Seasonality**: Temporary drift during holidays where shopper behavior differs from the training baseline.

## Where observability fits
Observability involves baseline comparison—overlaying current vs. past score curves—and "Shadow Modeling" to run new models in listen mode before deployment. It ensures that model decay is detected before it leads to significant revenue loss or dispute spikes.

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
        "text": "Ideally continuously. Practically, most payment systems retrain weekly or bi-weekly to incorporate new fraud patterns."
      }
    },
    {
      "@type": "Question",
      "name": "Can I detect drift manually?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. If manual review queues fill with obvious approvals, the model has likely drifted and become too strict."
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
