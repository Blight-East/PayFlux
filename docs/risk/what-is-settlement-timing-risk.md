# Settlement Timing Risk

Up: [Payment Settlements](../how-it-works/how-payment-settlements-work.md)
See also:
- [Payout Delays](./how-payout-delays-work.md)
- [Compliance Timing Gaps](./how-compliance-timing-gaps-form.md)

## Definition
Settlement timing risk is the exposure created by the time delay between a transaction's authorization and the actual settlement of funds into a merchant's bank account. During this interval, goods or services may be delivered while the funds are still subject to disputes, reversals, or enforcement actions.

## Why it matters
Exposure Windows. Long settlement intervals increase the duration of time where a merchant can incur losses before funds are secured. It creates liquidity gaps and increases the potential impact of sudden processor interventions.

## Signals to monitor
- **Authorization vs Capture Lag**: The time gap between approval and the final capture of funds.
- **Payout Batch Status**: Moving from batch closure to being marked as `paid` or `funded`.
- **Clearing House Delays**: Latency within the banking network (e.g., ACH processing times).
- **Dispute Window Overlap**: The probability of a dispute being filed before initial settlement occurs.

## Breakdown modes
- **Long Payout Cycles**: Extended settlement schedules (e.g., T+7 or T+14) creating large pools of unsettled revenue.
- **High Reversal Frequency**: High volumes of refunds or reversals occurring while funds are still in transit.
- **Enforcement Delays**: Sudden risk-based holds that pause the funding of already captured transactions.
- **Service Fulfillment Gaps**: Delivering high-value goods before the underlying payment has successfully settled.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is settlement timing risk?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Settlement timing risk is the exposure created by delays between transaction authorization and the actual receipt of funds."
      }
    },
    {
      "@type": "Question",
      "name": "Why does timing increase risk?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Because it creates a window where goods may be delivered while funds are still vulnerable to reversals or disputes."
      }
    },
    {
      "@type": "Question",
      "name": "What affects settlement timing?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Payout schedules, network clearing speeds, and risk-based enforcement actions from the processor."
      }
    }
  ]
}
</script>
