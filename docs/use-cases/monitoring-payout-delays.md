<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Payout Delays",
  "description": "Payout Delay Monitoring is the tracking of \"Expected\" vs \"Actual\" settlement times. It compares the promised schedule (e.g., T+2) against the actual arrival of funds.",
  "about": "Payout Delays",
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
      "name": "What are Payout Delays?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Payout Delay Monitoring is the tracking of \"Expected\" vs \"Actual\" settlement times. It compares the promised schedule (e.g., T+2) against the actual arrival of funds in the bank account."
      }
    },
    {
      "@type": "Question",
      "name": "Why do Payout Delays matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Delays are the canary in the coal mine. Processors often silently hold a payout \"for review\" before formally notifying the merchant of a risk issue. Detecting a missing payout is often the first sign of an impending freeze."
      }
    }
  ]
}
</script>

Up: [Payment Risk Events](../pillars/payment-risk-events.md)
See also: [Settlement Failures](./monitoring-settlement-failures.md)

# Monitoring Payout Delays

## Definition
Payout Delay Monitoring is the tracking of "Expected" vs "Actual" settlement times. It compares the promised schedule (e.g., T+2) against the actual arrival of funds in the bank account.

## Why it matters
Delays are the canary in the coal mine. Processors often silently hold a payout "for review" before formally notifying the merchant of a risk issue. Detecting a missing payout is often the first sign of an impending freeze.

## Signals to monitor
- **Payout State**: `in_transit` vs `paid`.
- **Transit Time**: Hours elapsed since "Batch Close."
- **Weekend/Holiday**: Adjusting expectations for non-banking days.
- **Trace ID**: Presence of a Fedwire/ACH trace number (proof of send).

## Breakdown modes
- **Risk Review Hold**: Processor manually pausing a specific batch.
- **Bank Rejection**: Receiving bank returning the wire due to name mismatch.
- **Compliance Audit**: AML check on a large transfer >$10k.

## Where observability fits
- **Gap Detection**: "Expected $10k today. Received $0."
- **SLA Tracking**: "Processor A is consistently late (T+4 vs T+2)."
- **Cash Flow Continuity**: Alerting Treasury to cover the gap from operating funds.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Why is it late?
90% of the time: Banking holidays or weekends. 10% of the time: Risk review.

### What is a "Trace Number?"
The FedEx tracking number for money. If the processor can't give you one, they haven't sent the money yet.

### Does a delay mean I'm banned?
Not necessarily. It usually means a confusing transaction in the batch (e.g., a huge refund) triggered a manual review.

## See also
- [Payment Settlements](../how-it-works/how-payment-settlements-work.md)
- [Monitoring Settlement Failures](./monitoring-settlement-failures.md)
- [Risk Threshold Events](../risk/how-risk-threshold-events-work.md)
