<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Transaction Monitoring",
  "description": "Transaction Monitoring is the real-time surveillance of individual payment flows to detect fraud, money laundering, or policy violations. Unlike underwriting (which looks at the merchant), transaction monitoring looks at the *payments* passing through the merchant.",
  "about": "Transaction Monitoring",
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
      "name": "What is Transaction Monitoring?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Transaction Monitoring is the real-time surveillance of individual payment flows to detect fraud, money laundering, or policy violations. Unlike underwriting (which looks at the merchant), transaction monitoring looks at the *payments* passing through the merchant."
      }
    },
    {
      "@type": "Question",
      "name": "Why does Transaction Monitoring matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "It is the first line of defense against loss. Effective monitoring blocks bad cards before they become chargebacks. However, aggressive monitoring causes \"False Declines\" (insult rates), rejecting good customers and costing revenue."
      }
    }
  ]
}
</script>

Up: [Payment System Observability](../pillars/payment-system-observability.md)
See also: [Payment Risk Scoring](./how-payment-risk-scoring-works.md)

# Transaction Monitoring

## Definition
Transaction Monitoring is the real-time surveillance of individual payment flows to detect fraud, money laundering, or policy violations. Unlike underwriting (which looks at the merchant), transaction monitoring looks at the *payments* passing through the merchant.

## Why it matters
It is the first line of defense against loss. Effective monitoring blocks bad cards before they become chargebacks. However, aggressive monitoring causes "False Declines" (insult rates), rejecting good customers and costing revenue.

## Signals to monitor
- **Review Queues**: Counts of transactions held for manual inspection.
- **Decline Reason Distribution**: Spikes in `fraud_suspected` or `high_risk` declines.
- **Rule Trigger Rates**: Which specific rules (e.g., "Velocity > 10 in 1 hour") are firing most often.
- **Approval Rate Volatility**: Sudden drops in acceptance for specific bins or geographies.

## Breakdown modes
- **Velocity Storms**: A bot attack triggering hundreds of velocity rules at once.
- **Rule Decay**: Static rules (e.g., "Block IP 1.2.3.4") remaining active long after the threat is gone.
- **Latency Spikes**: Monitoring checks taking too long, causing the transaction to time out.

## Where observability fits
- **Alert Aggregation**: Centralizing alerts from multiple gateways into one dashboard.
- **Performance Tracking**: Measuring the financial impact (blocked $ volume) of specific rules.
- **False Positive Tuning**: Identifying rules that catch zero fraud but block many good users.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Difference between Rule and Model?
A **Rule** is simple logic: `IF amount > $500 THEN decline`. A **Model** is complex probability: `IF likelihood_of_fraud > 0.9 THEN decline`.

### Should I review transactions manually?
Only if you have the data to make a better decision than the machine. Manual review adds friction and delays shipping.

### Why was this valid charge blocked?
Likely because it shared a feature (IP, Device ID, Email pattern) with a previous fraudster. This is called "Link Analysis."

## See also
- [Geo Velocity](./how-geo-velocity-affects-risk.md)
- [BIN-Country Mismatch](./how-bin-country-mismatch-affects-risk.md)
- [Retry Logic](./how-retry-logic-affects-risk.md)
