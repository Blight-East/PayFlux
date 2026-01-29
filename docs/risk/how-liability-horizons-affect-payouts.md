<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Liability Horizons",
  "description": "A Liability Horizon is the time period during which a transaction can still be contested. It defines the \"Risk Tail\" of valid payments.",
  "about": "Liability Horizons",
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
      "name": "What is a Liability Horizon?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A Liability Horizon is the time period during which a transaction can still be contested. It defines the \"Risk Tail\" of valid payments."
      }
    },
    {
      "@type": "Question",
      "name": "Why do Liability Horizons matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Cash Flow. If the bank believes the horizon is 120 days (industry standard), they may hold reserves for that duration. Shortening the perceived horizon (e.g., through fast delivery proof) releases cash faster."
      }
    }
  ]
}
</script>

Up: [Payment Reserves](./mechanics-payment-reserves-and-balances.md)
See also: [Rolling Risk Windows](./how-rolling-risk-windows-work.md)

# Liability Horizons

Up: [How Payout Delays Work](how-payout-delays-work.md)
See also:
- [What Is a Liability Horizon?](what-is-a-liability-horizon.md)
- [Settlement Timing Risk](what-is-settlement-timing-risk.md)
- [Liability Horizons](mechanics-liability-horizons.md)


## Definition
The Liability Horizon is the maximum time window during which a transaction can come back to haunt the processor (via Chargeback or Refund). Standard is 120 days, but it can extend to 540 days for certain disputes.

## Why it matters
Account Closure. Merchants are often shocked when a processor holds their funds for 120 days *after* they close the account. This is not punishment; it is the duration of the Liability Horizon. The processor is holding the collateral until the risk window closes.

## Signals to monitor
- **Vintage Exposure**: The $ volume of sales that are still within the 120-day window.
- **Tail Risk**: The projected dispute rate of the remaining open cohort.
- **Reserve Release Date**: The calendar date when the oldest batch of held funds matures.

## Breakdown modes
- **The Delivery Gap**: Selling "Pre-Orders" for a product shipping in 6 months extends the horizon. The 120-day clock only starts *on delivery*.
- **Subscription Tails**: A user cancelling a year-long subscription on Month 11 and disputing the original charge.
- **Bankruptcy**: If a merchant goes bust, the processor inherits 100% of the horizon liability.

## Where observability fits
- **Liability Ledger**: Tracking "Open Exposure" vs "Cash in Reserve."
- **Contract Monitoring**: Alerting when the "Delivery Date" shifts, pushing the horizon further out.
- **Payout Forecasting**: "On July 1st, $10k of liability expires, so we should expect a reserve release."

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Can I shorten the horizon?
No, it is set by Network Rules. However, fast shipping closes the risk window earlier (for delivery disputes).

### Why 120 days?
It is the standard timeframe given to cardholders to file a dispute (roughly 4 billing cycles).

### Does it apply to refunds?
Yes. You can usually refund a transaction up to 90-180 days, depending on the processor.

## See also
- [Dispute Aging Curves](./how-dispute-aging-curves-work.md)
- [Payment Reserves](./what-is-a-payment-reserve.md)
- [Rolling Risk Windows](./how-rolling-risk-windows-work.md)
