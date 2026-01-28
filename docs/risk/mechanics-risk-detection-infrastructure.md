<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Risk Detection Infrastructure",
  "description": "Risk Detection Infrastructure is the automated \"Immune System\" of the payment processor. It monitors objective metrics to identify accounts that pose financial capability or fraud risk.",
  "about": "Risk Detection Infrastructure",
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
      "name": "What is Risk Detection Infrastructure?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Risk Detection Infrastructure is the automated \"Immune System\" of the payment processor. It monitors objective metrics (Velocity, Authorization Rate, Chargeback Rate) to identify accounts that pose financial capability or fraud risk, triggering state transitions from \"Active\" to \"Restricted.\""
      }
    },
    {
      "@type": "Question",
      "name": "Why does Risk Detection Infrastructure matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Operational Continuity. These systems can maintain or destroy a business's ability to transact. Risk signals accumulate silently until the bucket overflows (suspension). Its primary goal is to protect the Processor and Banking Partner."
      }
    }
  ]
}
</script>

This page is part of the Payment Risk Mechanics series and serves as the primary reference for this topic.

Up: [Payment Risk Events](../pillars/payment-risk-events.md)
See also: [Transaction Monitoring](./how-transaction-monitoring-works.md), [Risk Growth Correlation](./mechanics-risk-growth-correlation.md)

# Risk Detection Infrastructure

## Definition
Risk Detection Infrastructure is the automated "Immune System" of the payment processor. It monitors objective metrics (Velocity, Authorization Rate, Chargeback Rate) to identify accounts that pose financial capability or fraud risk, triggering state transitions from "Active" to "Restricted."

## Why It Matters
Operational Continuity.
- **The "Kill Switch"**: These systems can maintain or destroy a business's ability to transact.
- **Silent Accumulation**: Risk signals accumulate silently like filling a bucket. You only notice the system when the bucket overflows (suspension), creating a feeling of "Sudden" checking.
- **Asset Protection**: Its primary goal is to protect the Processor and Banking Partner from insolvency, not to help the merchant sell more.

## Signals to Monitor
- **Velocity vs Cap**: Volume per hour/day relative to historical baselines.
- **Auth Rate Drops**: A sudden decline in approval rates (often indicating a specific BIN attack).
- **TC-40 / SAFE Reports**: The "Early Warning" fraud notices sent by issuers before chargebacks are filed.
- **Refund Ratio**: High refund-to-sales ratios indicating fulfillment failure or "Refund Fraud."

## How It Breaks Down
- **Immediate Suspension**: A "Kill Switch" triggered by extreme signals (e.g., 90% decline rate on 1,000 txns).
- **Latent Queue**: An account flagged for "Manual Review" without immediate suspension (The "Shadow Ban").
- **Reserve Trigger**: Automatically applying a 25% hold once a dispute threshold (0.6%) is crossed.

## How Risk Infrastructure Surfaces This
An observability system would surface these mechanics by:
- **Signal Attribution**: Exposing the specific metric that triggered the event (e.g., "Velocity Limit Exceeded: 105%").
- **Timeline Tracking**: Logging exactly when the state transition occurred to correlate with code deploys or marketing launches.
- **False Positive Defense**: Providing the data to prove a volume spike was a legitimate "Flash Sale," not a "Bust-Out."

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Is detecting manual or automated?
90% automated. Human analysts usually only get involved *after* the system has already flagged or restricted the account.

### Can I prevent detection?
No. But you can avoid *triggering* penalties by keeping metrics healthy and notifying processors of legitimate spikes in advance.

### Why does it happen on Fridays?
Risk teams often batch-review flagged accounts at the end of the week to "Clear the Queue" before the weekend.
