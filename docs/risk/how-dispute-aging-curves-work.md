# Dispute Aging Curves

Up: [Dispute Infrastructure](../pillars/dispute-infrastructure.md)
See also: [Liability Horizons](./how-liability-horizons-affect-payouts.md)

## Definition
Dispute Aging Curves (Vintage Analysis) visualize the arrival of disputes over time for a specific sales cohort. Instead of looking at disputes as they happen, it answers: "For the sales we made in January, how many disputes have arrived by Day 30? Day 60? Day 120?" 

## Why it matters
Forecasting. Disputes take up to 120 days to fully materialize. If you only look at "Today's Disputes," you are missing 90% of the risk from recent sales. The Curve allows you to predict the "Final Loss" of a cohort based on its early trajectory, allowing you to stop a bad marketing campaign before the bills come due.

## Signals to monitor
- **Curve Velocity**: The slope of the line. Is it flattening (Safe) or going vertical (Danger)?
- **Day 30% Projection**: "Typically, 40% of disputes arrive by Day 30. If this month is 60%, the final rate will be 1.5x higher than normal."
- **Cohort Delta**: Comparing the current cohort's curve against the 12-month historical average.

## Breakdown modes
- **The Long Tail**: A forgotten recurring billing charge generating a "curve spike" 11 months after the initial sale.
- **The Delivery Spike**: A shipping failure that causes the curve to hit its maximum on Day 15 (when customers expect the goods).
- **Cohort Rot**: A specific marketing campaign or affiliate partner bringing in users with permanently worse aging curves than organic users.

## Where observability fits
Observability provides predictive alerting. By modeling the "Expected Shape" of your curve, the system can alert you on Day 10 that a cohort is likely to breach network thresholds on Day 60, giving you 50 days to take corrective action.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How long is the tail of the curve?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Usually 120 days covers 98% of disputes, though some network rules allow for up to 540 days."
      }
    },
    {
      "@type": "Question",
      "name": "Why calculate by vintage instead of activity?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Calculating by 'Activity Month' hides the delay. Vintage is the only 'True' view of the actual loss rate of a specific sale."
      }
    },
    {
      "@type": "Question",
      "name": "Can I influence the curve?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Better shipping notifications and active customer communication flatten the 'late' part of the curve."
      }
    }
  ]
}
</script>
