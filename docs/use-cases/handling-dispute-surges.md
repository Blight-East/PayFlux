<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Handling Dispute Surges",
  "description": "A Dispute Surge is a rapid acceleration in incoming chargebacks. It is a \"Force Majeure\" event for a merchant, threatening immediate account suspension if not contained.",
  "about": "Handling Dispute Surges",
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
      "name": "What is a Dispute Surge?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A Dispute Surge is a rapid acceleration in incoming chargebacks. It is a \"Force Majeure\" event for a merchant, threatening immediate account suspension if not contained."
      }
    },
    {
      "@type": "Question",
      "name": "Why does a Dispute Surge matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Time. You have a 30-day \"Dispute Lag.\" The surge identifying today is from sales made 30 days ago. The surge *caused* by sales today won't hit for 30 days. Managing a surge requires managing this time delay."
      }
    }
  ]
}
</script>

Up: [Dispute Infrastructure](../pillars/dispute-infrastructure.md)
See also: [Monitoring Dispute Ratios](./monitoring-dispute-ratios.md)

# Handling Dispute Surges

## Definition
A Dispute Surge is a rapid acceleration in incoming chargebacks. It is a "Force Majeure" event for a merchant, threatening immediate account suspension if not contained.

## Why it matters
Time. You have a 30-day "Dispute Lag." The surge identifying today is from sales made 30 days ago. The surge *caused* by sales today won't hit for 30 days. Managing a surge requires managing this time delay.

## Signals to monitor
- **Daily Dispute Velocity**: Count of new disputes arriving today.
- **Vintage Performance**: The dispute rate of the *current* sales cohort (leading indicator).
- **Reason Code Mix**: Is the surge due to "Fraud" (Criminal) or "Goods Not Received" (Logistics)?

## Breakdown modes
- **Fraud Attack**: A card testing event from last month maturing into chargebacks.
- **Logistics Failure**: A warehouse disaster causing thousands of undelivered orders.
- **Billing Confusion**: Changing the statement descriptor to something unrecognizable.

## Where observability fits
- **Vintage Projection**: "Based on current early alerts (TC40s), our ratio will hit 1.5% next month."
- **Root Cause Isolation**: Pinpointing the specific product or affiliate driving the surge.
- **Refund Gap**: Identifying transactions that should be refunded *now* to prevent disputes *later*.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Should I stop selling?
If the surge is bad enough, yes. You need to lower the *numerator* (disputes) or raise the *denominator* (sales). Stopping bad sales is step 1.

### Can I reverse a chargeback?
You can "Represent" (fight) it. If you win, it falls off the *financial* ledger, but usually stays on the *count* ledger for the ratio.

### What is a TC40?
An early fraud warning from Visa. It predicts a dispute ~2 weeks before it happens.

## See also
- [Monitoring Dispute Ratios](./monitoring-dispute-ratios.md)
- [Dispute Infrastructure](../pillars/dispute-infrastructure.md)
- [Dispute Aging Curves](../risk/how-dispute-aging-curves-work.md)
