# Payout Delays

Up: [Payment Settlements](../how-it-works/how-payment-settlements-work.md)
See also:
- [Monitoring Payout Delays](../use-cases/monitoring-payout-delays.md)
- [Compliance Timing Gaps](./how-compliance-timing-gaps-form.md)
- [Settlement Timing Risk](./what-is-settlement-timing-risk.md)

## Definition
Payout Delays occur when a processor pauses the settlement of funds for a specific batch or time period. Unlike a "Freeze" (which is indefinite), a Delay is usually temporary (24-72 hours) while a specific risk signal or batch anomaly is investigated.

## Why it matters
Cash Flow. Most merchants operate on tight cycles where received funds pay for current inventory or operations. Even a 3-day delay can cause a merchant to miss payroll or default on vendor payments, potentially creating a cascade of failure across the business.

## Signals to monitor
- **Transit Time Variance**: "Avg Time from Batch Close to Bank Deposit" deviates from the standard T+2.
- **Batch Status Transitions**: Batches moving from `paid` to `in_transit` or staying in `pending_review` longer than usual.
- **Weekend and Holiday Effects**: Accounting for non-banking days in the settlement forecast to differentiate between bank closed delays and risk holds.
- **Anomaly Detection**: Situations where newer batches are paid while older batches remain pending.

## Breakdown modes
- **The Weekend Trap**: A Friday batch delayed by 1 day settles on Tuesday instead of Monday due to bank closing times.
- **The Holiday Cluster**: Significant banking holidays causing multiple days of sales to settle simultaneously, potentially triggering AML velocity alerts.
- **The Silent Hold**: Processors pausing fund releases without sending automated email notifications to the merchant.
- **SLA Violation**: Actual settlement time exceeding the processor's contractually promised duration (e.g., T+2 actual vs T+5 reality).

## Implementation notes
Observability allows for cash forecasting adjustments. By tracking "Processor Promise" vs "Actual Performance," merchants can identify when a delay is occurring before it impacts payroll.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is a payout delay a ban?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Usually no. It is typically a temporary investigation or a technical delay. If the risk signal is resolved, the funds are released."
      }
    },
    {
      "@type": "Question",
      "name": "Can I speed up a delayed payout?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Generally no. Wires move at banking system speeds. Instant Payout options (e.g., Push to Card) offer faster settlement but often have higher risk controls."
      }
    },
    {
      "@type": "Question",
      "name": "Why are payouts delayed on weekends?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Because the Federal Reserve and the ACH system do not process transactions on weekends or most banking holidays."
      }
    }
  ]
}
</script>
