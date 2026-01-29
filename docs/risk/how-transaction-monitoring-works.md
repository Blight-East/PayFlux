# Transaction Monitoring

Up: [Payment System Observability](../pillars/payment-system-observability.md)
See also:
- [Payment Risk Scoring](./how-payment-risk-scoring-works.md)
- [How Geo-Velocity Affects Risk](./how-geo-velocity-affects-risk.md)
- [BIN-Country Mismatch](./how-bin-country-mismatch-affects-risk.md)
- [Retry Logic](./how-retry-logic-affects-risk.md)

## Definition
Transaction Monitoring is the real-time surveillance of individual payment flows to detect fraud, money laundering, or policy violations. Unlike underwriting (which assesses the merchant's business), transaction monitoring focuses on the *behavior* of the payments themselves as they pass through the system.

## Why it matters
The First Line of Defense. Effective monitoring blocks bad transactions before they can settle or become chargebacks. However, it is a balancing act: aggressive monitoring reduces fraud but increases "False Declines" (insult rates), which alienates good customers and costs the merchant revenue.

## Signals to monitor
- **Review Queue Depth**: The number of transactions held for manual inspection.
- **Decline Reason Distribution**: Spikes in codes like `fraud_suspected`, `high_risk`, or `velocity_limit_exceeded`.
- **Rule Trigger Frequency**: Tracking which specific logic (e.g., "Amount > $500") is firing most often.
- **Approval Rate Stability**: Monitoring for sudden drops in acceptance across specific Card BINs or Geographies.

## Breakdown modes
- **Velocity Storms**: Automated bot attacks triggering hundreds of velocity-based rules simultaneously and flooding review queues.
- **Rule Decay**: Legacy blocklists (e.g., "Block IP 1.2.3.4") remaining active long after the original threat has passed, impacting new, legitimate users.
- **Latency Spikes**: Real-time monitoring checks taking too long (>2 seconds), causing the payment gateway to time out and fail the transaction.

## Where observability fits
Observability provides "Rule Performance Tracking." By centralizing alerts and measuring the financial impact of specific blocks, merchants can identify "Toxic Rules" that block zero fraud but many good customers, allowing for precision tuning of the monitoring engine.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is the difference between a Rule and a Model?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A Rule is simple logic (IF amount > $500 THEN block). A Model is a probability assessment (IF likelihood_of_fraud > 0.9 THEN block) based on many features."
      }
    },
    {
      "@type": "Question",
      "name": "Should I manually review every transaction?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Manual review adds friction and shipping delays. It should only be used for 'High-Value' or 'Borderline' cases where the machine is truly uncertain."
      }
    },
    {
      "@type": "Question",
      "name": "Why was a valid transaction blocked?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Likely 'Link Analysis'—the transaction shared a hidden feature (IP, Device ID, or Email pattern) with a previously identified fraudster."
      }
    }
  ]
}
</script>
