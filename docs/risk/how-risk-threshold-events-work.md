# Risk Threshold Events

Up: [Payment Risk Events](../pillars/payment-risk-events.md)
See also:
- [What is Threshold Hysteresis?](./what-is-threshold-hysteresis.md)
- [How Network Monitoring Programs Work](./how-network-monitoring-programs-work.md)

## Definition
A Risk Threshold Event is the moment a specific metric (e.g., Dispute Ratio, Refund Velocity) crosses a pre-defined limit, triggering an automated enforcement action. These events convert "Gradual Risk" into "Binary Punishment," such as a reserve increase, a payout freeze, or account termination.

## Why it matters
Financial Cliff-Edges. Risk is often linear until a threshold is reached; then it becomes catastrophic. A merchant with a 0.89% dispute ratio is "Safe"; at 0.91%, they may be fined $10,000. Understanding these "Hard Lines" allows merchants to manage their traffic density to avoid the cliff.

## Signals to monitor
- **Distance-to-Threshold**: The buffer remaining before an enforcement action triggers.
- **Velocity toward Threshold**: How fast the metric is approaching the limit (e.g., "Gaining 0.1% per day").
- **Activation Status**: Dashboard flags like `At Risk`, `Warning`, or `Restricted`.
- **Lookback Windows**: The time period (e.g., 30 days rolling) used to calculate the threshold.

## Breakdown modes
- **The "Cliff" Effect**: A small fraud attack ($5,000) pushing a large account over the dollar-volume threshold ($75,000), triggering network monitoring.
- **Feedback Loop Triggering**: A threshold event causing a Payout Freeze, which leads to shipping delays and *more* disputes, making it impossible to get back below the threshold.
- **Measurement Lag**: Discovering you breached a threshold weeks ago because the processor's calculation only happens on the 1st of the month.

## Where observability fits
Observability provides "Threshold Guardrails." By setting internal "Pre-Alerts" at 80% of the network threshold, the system can warn management to "Dilute the Ratio" or "Stop New Sales" before the automated enforcement rules can fire.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Are thresholds global?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Card Networks have global thresholds (e.g., 0.9%), but individual Processors may have stricter 'Internal' thresholds based on their own risk appetite."
      }
    },
    {
      "@type": "Question",
      "name": "Can I negotiate a threshold?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Rarely. Network thresholds are mandatory. Processor thresholds may be adjustable for 'Institutional' scale merchants with high collateral."
      }
    },
    {
      "@type": "Question",
      "name": "What is the difference between Warning and Enforcement?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Warning (e.g., Visa 0.6%) is a notice to improve. Enforcement (e.g., Visa 0.9%) carries immediate financial fines and legal consequences."
      }
    }
  ]
}
</script>
