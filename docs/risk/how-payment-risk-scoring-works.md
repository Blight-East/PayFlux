# How Payment Risk Scoring Works

Up: [Risk Detection Infrastructure](./mechanics-risk-detection-infrastructure.md)
See also:
- [Multi-Signal Correlation](./how-multi-signal-correlation-affects-risk.md)
- [Transaction Monitoring](./how-transaction-monitoring-works.md)

## Definition
Payment Risk Scoring is the mathematical process of assigning a "Probability of Fraud" to every transaction. By analyzing hundreds of data points (IP, Device ID, Card History), risk engines produce a numerical score (e.g., 0-100) that dictates whether to Approve, Challenge (3DS), or Decline a payment in real-time.

## Why it matters
Precision and Conversion. A crude "Block all foreign IPs" rule blocks good sales. A refined "Risk Score" allows a merchant to set specific thresholds for risk appetite—accepting a 10% risk on a $5 coffee, but requiring 100% certainty for a $5,000 laptop. It turns a binary "Yes/No" into a nuanced "Maybe."

## Signals to monitor
- **Score Distribution**: Visualizing how many transactions fall into "Low," "Medium," and "High" risk buckets.
- **Precision vs. Recall**: Measuring how many blocked transactions were actually fraud vs. how much fraud was missed.
- **Feature Importance**: Identifying which signals (e.g., Email Age, AVS Match) are currently driving the highest scores.
- **Latency**: The time taken (in milliseconds) for the score to be calculated.

## Breakdown modes
- **Model Drift**: A fraud model becoming less accurate over time as fraudster tactics evolve.
- **Cold Start Problem**: Having zero historical data for a new user, leading to "Average" scores that might be too high or too low.
- **Over-fitting**: A model becoming so specific to past attacks that it blocks legitimate new users with similar (but valid) profiles.

## Where observability fits
Observability provides "Score Explainability." Instead of a generic "Declined by Risk," the system can tell you: "This transaction hit a score of 85 because of a 3-way mismatch between IP, BIN, and Shipping Address." This allows support teams to override false positives with confidence.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is a good risk score?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "It depends on the provider (e.g., Stripe Radar uses 0-100). Generally, lower is safer. Every merchant defines their own 'Cut-off' based on their margins."
      }
    },
    {
      "@type": "Question",
      "name": "Can I see the reason for a score?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, high-end risk engines provide 'Reason Codes' (e.g., 'Velocity Violation') that explain the contributing factors."
      }
    },
    {
      "@type": "Question",
      "name": "Does the score ever change?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The score is fixed at the moment of Transaction, but the *Model* that produces it is updated frequently based on new data."
      }
    }
  ]
}
</script>
