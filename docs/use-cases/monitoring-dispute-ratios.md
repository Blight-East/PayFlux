<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Monitoring Dispute Ratios",
  "description": "The Dispute Ratio (or Chargeback Rate) is the key health metric for any merchant. It is typically calculated as `Count of Disputes / Count of Sales`. Breaching 0.9% triggers monitoring programs.",
  "about": "Monitoring Dispute Ratios",
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
      "name": "What is a Dispute Ratio?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The Dispute Ratio (or Chargeback Rate) is the key health metric for any merchant. It is typically calculated as `Count of Disputes / Count of Sales`. Breaching 0.9% (Visa) or 1.0% (Mastercard) triggers monitoring programs."
      }
    },
    {
      "@type": "Question",
      "name": "Why does a Dispute Ratio matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "It is the \"Risk Scoreboard.\" Staying below the threshold keeps you safe. Breaching it leads to fines ($25k+), reserves, and eventual termination (TMF)."
      }
    }
  ]
}
</script>

Up: [Dispute Infrastructure](../pillars/dispute-infrastructure.md)
See also: [Handling Dispute Surges](./handling-dispute-surges.md)

# Monitoring Dispute Ratios

## Definition
The Dispute Ratio (or Chargeback Rate) is the key health metric for any merchant. It is typically calculated as `Count of Disputes / Count of Sales`. Breaching 0.9% (Visa) or 1.0% (Mastercard) triggers monitoring programs.

## Why it matters
It is the "Risk Scoreboard." Staying below the threshold keeps you safe. Breaching it leads to fines ($25k+), reserves, and eventual termination (TMF).

## Signals to monitor
- **Monthly Ratio**: The official metric used by networks.
- **Daily Trend**: The leading indicator (moving average).
- **Sales Volume**: The denominator. (Dropping sales volume causes the ratio to spike even if disputes stay flat).
- **Vintage Ratio**: Disputes divided by the sales from the *same month* they occurred (Cohort view).

## Breakdown modes
- **Denominator Shock**: Turning off marketing reduces sales, causing the dispute ratio to skyrocket (Math problem).
- **Program Entry**: Entering the "Visa Monitoring Program" (VFMP) or "Mastercard ECP."
- **Fine Assessment**: Unexpected debits for program fees.

## Where observability fits
- **Forecasting**: "At this rate, we will hit 1.1% on the 25th."
- **Attribution**: "The spike is coming from the affiliate 'Summer_Promo_2024'."
- **Denom Management**: Identifying the need to push safe volume to dilute the ratio.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Is it by Count or Value?
Almost always by **Count**. A $1 dispute hurts you exactly as much as a $1,000 dispute.

### What is the "Lookback" window?
Networks typically compare "Disputes Received this Month" vs "Sales Processed this Month."

### Can I ignore Won disputes?
No. The ratio counts *all* disputes filed, regardless of whether you win or lose. The damage is done at the filing.

## See also
- [Network Monitoring Programs](../risk/how-network-monitoring-programs-work.md)
- [Dispute Infrastructure](../pillars/dispute-infrastructure.md)
- [Handling Dispute Surges](./handling-dispute-surges.md)
