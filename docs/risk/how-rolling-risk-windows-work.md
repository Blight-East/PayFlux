# How Rolling Risk Windows Work

Up: [Payment Risk Events](../pillars/payment-risk-events.md)
See also:
- [Monitoring Dispute Ratios](../use-cases/monitoring-dispute-ratios.md)
- [Risk Threshold Events](./how-risk-threshold-events-work.md)
- [How Risk Threshold Hysteresis Works](../how-it-works/how-risk-threshold-hysteresis-works.md)

## Definition
Rolling Risk Windows are the periodic timeframes (usually 30, 60, or 90 days) used to calculate dispute ratios and fraud velocity. Unlike "Calendar Months," a rolling window moves daily, dropping the oldest day of data and adding today's results. This creates a continuous, real-time view of account health.

## Why it matters
Volatility Management. One "Bad Day" doesn't necessarily trigger enforcement, but a "Bad Week" within a 30-day window will. Understanding the "Exit Date" (when a high-fraud day will drop off the back of the window) allows a merchant to precisely predict when they will return to "Safe" standing.

## Signals to monitor
- **Window Entry**: New disputes or sales entering the count today.
- **Window Exit**: Old high-risk events "Falling off" the back of the window.
- **Net Ratio Change**: The daily shift in standing caused by the difference between entries and exits.
- **Safe Date**: The specific calendar date when a past fraud spike will no longer impact the rolling ratio.

## Breakdown modes
- **The "Hump" Effect**: A massive attack that stays in your metrics for the full duration of the window (e.g., 30 days), pinning your ratio in the "Dangerous" zone even if you fix the problem instantly.
- **Received-Date Bias**: Networks often count disputes in the window they were *Received*, not the window of the original sale, making ratios unpredictable.
- **Volume Dilution Lag**: Increasing sales today to fix a 30-day ratio won't fully "Dilute" the score until tomorrow, creating a lag in recovery.

## Where observability fits
Observability provides "Recovery Forecasting." By calculating the "Drop-off Dates" for every past dispute, the system can tell you: "You will be back below the 1.0% threshold on Nov 15th, provided you process at least $50k in clean volume this week."

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Why use rolling windows instead of months?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "To prevent 'Hiding' risk by only looking at monthly snapshots. Rolling windows provide a continuous, accurate view of current exposure."
      }
    },
    {
      "@type": "Question",
      "name": "Can I reset a window?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. You must wait for the old data to age out. Time is the only cure for a high rolling ratio."
      }
    },
    {
      "@type": "Question",
      "name": "Does adding more volume help?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Adding clean sales increases the denominator of the ratio, effectively diluting the impact of past disputes within the same window."
      }
    }
  ]
}
</script>
