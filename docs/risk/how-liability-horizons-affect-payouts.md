# Liability Horizons and Payouts

Up: [Liability Horizons](mechanics-liability-horizons.md)
See also:
- [What Is a Liability Horizon?](what-is-a-liability-horizon.md)
- [How Payout Delays Work](how-payout-delays-work.md)
- [Settlement Timing Risk](what-is-settlement-timing-risk.md)

## Definition
The Liability Horizon is the maximum time window during which a transaction can result in a chargeback or refund. While the standard is often 120 days, it can extend significantly for pre-orders or specific dispute types. It defines the "Risk Tail" of valid payments.

## Why it matters
Cash Flow and Account Security. Processors often hold funds for the duration of the liability horizon (e.g., 120 days) after an account closure to ensure they have collateral for potential future disputes. Understanding this window is critical for accurate payout forecasting.

## Signals to monitor
- **Vintage Exposure**: Volume of sales still within the 120-day (or relevant) window.
- **Tail Risk Projection**: Projected dispute rates for aging cohorts.
- **Reserve Release Maturity**: Dates when specific bundles of held funds pass their liability threshold.
- **Delivery date shifts**: Changes in fulfillment timing that push horizon clocks forward.

## Breakdown modes
- **The Delivery Gap**: For pre-orders, the 120-day clock only starts *on delivery*, not on sale, extending exposure.
- **The Subscription Tail**: Disputes occurring at the end of a long-term service period (e.g., Month 11 of 12).
- **The Liquidity Trap**: Having capital in reserves but being unable to use it for operations due to horizon duration.
- **Inherited Liability**: Processors incurring 100% of horizon risk if a merchant becomes insolvent.

## Implementation notes
Observability should track the "Liability Ledger" to visualize open exposure against held reserves and forecast fund releases based on expiration dates.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is a Liability Horizon?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A Liability Horizon is the time period during which a transaction can still be contested. It defines the 'Risk Tail' of valid payments."
      }
    },
    {
      "@type": "Question",
      "name": "Why do Liability Horizons matter for payouts?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "They determine how long the bank or processor may hold reserves. Shortening the perceived horizon (e.g., through fast delivery proof) can release cash faster."
      }
    },
    {
      "@type": "Question",
      "name": "Can I shorten the horizon?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No, it is set by Network Rules. However, fast shipping closes the delivery-related risk window earlier."
      }
    },
    {
      "@type": "Question",
      "name": "Does it apply to refunds?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Transactions can usually be refunded for 90-180 days, which must be accounted for in the liability window."
      }
    }
  ]
}
</script>
