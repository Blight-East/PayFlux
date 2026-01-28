<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Rolling Risk Windows",
  "description": "Rolling Windows are the timeframes used to calculate liability. \"Trailing 30 Days\" means \"Today plus the last 29 days.\" This moving window smooths out volatility but creates a \"Memory Effect\" where past bad events haunt the score for weeks.",
  "about": "Rolling Risk Windows",
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
      "name": "What are Rolling Risk Windows?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Rolling Windows are the timeframes used to calculate liability. \"Trailing 30 Days\" means \"Today plus the last 29 days.\" This moving window smooths out volatility but creates a \"Memory Effect\" where past bad events haunt the score for weeks."
      }
    },
    {
      "@type": "Question",
      "name": "Why do Rolling Risk Windows matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Calculation Confusion. Merchants often think \"I fixed the fraud today, so my score should be good.\" But the Rolling Window includes the fraud from 2 weeks ago. The score won't recover until that bad day \"falls off\" the back of the window."
      }
    }
  ]
}
</script>

Up: [Payment Reserves](./mechanics-payment-reserves-and-balances.md)
See also: [Risk Thresholds and Hysteresis](./mechanics-risk-thresholds-and-hysteresis.md)

# Rolling Risk Windows

## Definition
Rolling Windows are the timeframes used to calculate liability. "Trailing 30 Days" means "Today plus the last 29 days." This moving window smooths out volatility but creates a "Memory Effect" where past bad events haunt the score for weeks.

## Why it matters
Calculation Confusion. Merchants often think "I fixed the fraud today, so my score should be good." But the Rolling Window includes the fraud from 2 weeks ago. The score won't recover until that bad day "falls off" the back of the window.

## Signals to monitor
- **Window Entry**: New disputes entering the count today.
- **Window Exit**: Old disputes dropping off the count today.
- **Net Change**: The mathematical result of (Entry - Exit).
- **Projected Exit**: "On Nov 15th, the big fraud attack from Oct 15th will expire."

## Breakdown modes
- **The "Hump"**: A massive spike in disputes that keeps the ratio high for a full 30 days, determining the fate of the account.
- **Program Qualification**: Visa counts disputes in the month they are *received*, not the month of the sales. This is a "Received Date" window.

## Where observability fits
- **Recovery Forecasting**: "We need to process $50k in clean volume this week to dilute the rolling ratio below 0.9%."
- **Vintage Analysis**: Comparing "Transaction Date" windows vs "Report Date" windows to understand the lag.
- **Alerting**: Warning when a new batch of disputes is about to push the rolling average into the red zone.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Why use rolling windows?
To prevent knee-jerk reactions. One bad day shouldn't kill a business; a bad *month* should.

### Can I reset the window?
No. You have to wait it out. Time is the only cure.

### Does volume help?
Yes. Adding clean sales volume dilutes the ratio (increases the denominator) within the window.

## See also
- [Monitoring Dispute Ratios](../use-cases/monitoring-dispute-ratios.md)
- [Risk Threshold Hysteresis](../how-it-works/how-risk-threshold-hysteresis-works.md)
- [Risk Threshold Events](./how-risk-threshold-events-work.md)
