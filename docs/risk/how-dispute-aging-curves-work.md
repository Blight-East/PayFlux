<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Dispute Aging Curves",
  "description": "Dispute Aging Curves (Vintage Analysis) visualize the arrival of disputes over time for a specific sales cohort. It answers: \"For the sales we made in January, how many disputes have arrived by Feb? By March? By April?\"",
  "about": "Dispute Aging Curves",
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
      "name": "What are Dispute Aging Curves?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Dispute Aging Curves (Vintage Analysis) visualize the arrival of disputes over time for a specific sales cohort. It answers: \"For the sales we made in January, how many disputes have arrived by Feb? By March? By April?\""
      }
    },
    {
      "@type": "Question",
      "name": "Why do Dispute Aging Curves matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Forecasting. Disputes take up to 120 days to fully materialize. If you only look at \"Today's Disputes,\" you are missing 90% of the risk from recent sales. The Curve allows you to predict the \"Final Loss\" based on early indicators."
      }
    }
  ]
}
</script>

Up: [Dispute Infrastructure](../pillars/dispute-infrastructure.md)
See also: [Liability Horizons](./how-liability-horizons-affect-payouts.md)

# Dispute Aging Curves

## Definition
Dispute Aging Curves (Vintage Analysis) visualize the arrival of disputes over time for a specific sales cohort. It answers: "For the sales we made in January, how many disputes have arrived by Feb? By March? By April?"

## Why it matters
Forecasting. Disputes take up to 120 days to fully materialize. If you only look at "Today's Disputes," you are missing 90% of the risk from recent sales. The Curve allows you to predict the "Final Loss" based on early indicators.

## Signals to monitor
- **Shape of the Curve**: Is it flattening (Safe) or accelerating (Danger)?
- **Day 30%**: "Typically, 40% of disputes arrive by Day 30. This month, it's 60%. Something is wrong."
- **Expected vs Actual**: Comparing the current cohort against the 12-month average.

## Breakdown modes
- **The Long Tail**: A forgotten recurring billing charge generating disputes 11 months later.
- **The Spike**: A shipping failure causes the curve to go vertical on Day 15 (Arrival of goods).
- **Cohort Rot**: A specific marketing campaign brings in users with a permanently worse curve than organic users.

## Where observability fits
- **Predictive Alerting**: "Based on Day 30 data, the Jan Cohort is projected to hit 1.2% by Day 90."
- **Marketing Feedback**: Telling the Growth team which campaigns are acquiring "Bad Curves."
- **Reserve Modeling**: Calculating how much money needs to be held to cover the remaining tail risk.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### How long is the tail?
Usually 120 days covers 98% of disputes. Some can go up to 540 days (rare).

### Why calculate by vintage?
Because calculating by "Activity Month" (Total Disputes / Total Sales) hides the delay. Vintage is the only "True" view of risk.

### Can I change the curve?
Yes. Better shipping/communication flattens the curve (stops late disputes).

## See also
- [Monitoring Dispute Ratios](../use-cases/monitoring-dispute-ratios.md)
- [Rolling Risk Windows](./how-rolling-risk-windows-work.md)
- [How Chargebacks Propagate](./how-chargebacks-propagate.md)
