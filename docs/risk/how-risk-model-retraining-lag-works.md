# Risk Model Retraining Lag

Up: [Risk Detection Infrastructure](./mechanics-risk-detection-infrastructure.md)
See also:
- [What is Model Drift in Fraud?](./what-is-model-drift-in-fraud.md)
- [How Fraud Model Drift Occurs](./how-fraud-model-drift-occurs.md)

## Definition
Risk Model Retraining Lag is the "Window of Vulnerability" between when a new fraud pattern appears and when the machine learning model is updated to block it. Fraudsters evolve in minutes; models often retrain in days or weeks. During this lag, the system remains "Blind" to the new attack vector.

## Why it matters
Large-Scale Losses. In a bot attack, a fraudster can process thousands of transactions before a "Weekly Retrain" cycle completes. Understanding this lag allows merchants to implement "Emergency Manual Rules" to bridge the gap while the model is still learning.

## Signals to monitor
- **Model Age**: Number of days since the last successful training completion.
- **Decline Rate Divergence**: A sudden drop in automated declines during a known attack.
- **Verification Pass Rate**: High numbers of "Suspicious" transactions passing with "Low" risk scores.
- **Feedback Loop Latency**: The time between a "Chargeback Received" event and that data point being available for training.

## Breakdown modes
- **The Weekend Attack**: Fraudsters attacking on Friday night, knowing the data scientists (and training pipelines) might be offline until Monday.
- **Data Poisoning**: Fraudsters intentionally "Training" the model with valid transactions from stolen cards to lower the risk scores of those cards.
- **Training Pipeline Failure**: A silent error in the data pipeline that causes the model to "Retry" with old data instead of new attack patterns.

## Where observability fits
Observability provides "Shadow Scoring." By comparing current transaction patterns against a "Challenger" model (one trained more frequently), the system can alert you when your primary model is consistently missing known bad traffic, indicating a retraining lag.

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
        "text": "Enterprise systems typically retrain daily. Smaller providers may retrain weekly or monthly."
      }
    },
    {
      "@type": "Question",
      "name": "Can I speed up retraining?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Only if you have an 'Online Learning' architecture. Otherwise, you must rely on manual 'Override Rules' to block new patterns instantly."
      }
    },
    {
      "@type": "Question",
      "name": "Does more data fix the lag?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Quality and 'Freshness' of data matter more than total volume when fighting evolving fraud patterns."
      }
    }
  ]
}
</script>
