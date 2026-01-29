# What is Model Drift in Fraud?

Up: [Model Drift](mechanics-model-drift.md)
See also:
- [How Fraud Model Drift Occurs](how-fraud-model-drift-occurs.md)

## Definition
Model Drift in fraud is the gradual loss of accuracy in detection models as the underlying environment and transaction patterns change. While the model continues to produce risk scores, the predictive meaning of those scores degrades relative to the actual threat landscape.

## Why it matters
Decision Degradation. Drift causes "False Positives" to increase—blocking legitimate users—and allows "True Fraud" to bypass security. When model scores become decoupled from reality, merchants lose money both from unpaid fraud and from rejected valid sales.

## Signals to monitor
- **Dispute-to-Score Correlation**: Rising chargebacks occurring in transactions that the model originally marked as "Low Risk."
- **Approval Rate Stability**: Unexplained drops in overall acceptance rates that aren't linked to changed policies.
- **Decision Divergence**: Increasing disagreement between automated model scores and manual human review outcomes.
- **Score Distribution Variance**: Changes in the percentage of transactions falling into specific risk "buckets."

## Breakdown modes
- **Customer Behavior Shifts**: Legitimate users changing how they shop (e.g., buying higher volumes or using different devices), which confuses the model.
- **Evolving Attack Strategies**: Fraudsters identifying the "Weights" of the current model and intentionally adjusting their behavior to fall into "Safe" zones.
- **Network Condition Fluctuations**: Changes in bank authorization rules or network protocols (like a widespread move to 3DS) that the model wasn't trained on.

## Where observability fits
Observability provides continuous validation. By comparing current model performance against a "Fresh" baseline environment, merchants can identify exactly when the "Precision Curve" begins to flatten, triggering an automated request for model retraining.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is model drift a software bug?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. It is a natural side effect of the dynamic nature of commerce and the continuous evolution of fraud tactics."
      }
    },
    {
      "@type": "Question",
      "name": "Can model drift be prevented?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Not entirely. It must be managed through continuous monitoring and frequent model 'Retraining' or 'Calibration.'"
      }
    },
    {
      "@type": "Question",
      "name": "How often does model drift occur?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "It is a continuous process, but its impact is most noticeable during high-growth periods or major shifts in consumer behavior (e.g., holidays)."
      }
    }
  ]
}
</script>
