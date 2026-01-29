# Network Monitoring Programs

Up: [Payment Risk Events](../pillars/payment-risk-events.md)
See also:
- [Monitoring Dispute Ratios](../use-cases/monitoring-dispute-ratios.md)
- [How Card Networks Handle Disputes](./how-card-networks-handle-disputes.md)

## Definition
Network Monitoring Programs (e.g., Visa VFMP, Mastercard ECP) are mandatory enforcement cycles triggered when a merchant's monthly dispute or fraud ratio exceeds network-defined thresholds (usually 0.9% and $75,000). Once "qualified," a merchant enters a multi-month period of increased scrutiny, fines, and potential loss of processing privileges.

## Why it matters
Financial and Operational Penalties. Entering a program is not just a warning; it often results in immediate "Fine per Dispute" (e.g., $50-$100 extra per chargeback) and a loss of the right to fight (represent) certain disputes. Failure to "exit" the program within a set timeframe (often 12 months) leads to permanent termination of the merchant account.

## Signals to monitor
- **Dispute Ratio (Count)**: Number of disputes divided by the number of transactions in the previous month.
- **Fraud Ratio (Value)**: Total dollar volume of fraud-coded disputes divided by total processed volume.
- **Threshold Proximity**: Warnings when metrics approach 0.6% (Visa's Warning level).
- **Hysteresis Counters**: Tracking consecutive "clean" months required to exit the program.

## Breakdown modes
- **The "Month 3" Spike**: Having two clean months and then spiking in month 3, resetting the 12-month exit clock back to zero.
- **Late reporting**: Discovering you were qualified for a program weeks after the fact because the processor's reporting lag.
- **Threshold Crashing**: High volumes of small sales causing a count-based ratio to breach even when dollar volume remains low.

## Where observability fits
Observability provides early warning and recovery forecasting. By tracking your ratios in real-time, the system can predict program qualification before the networks send a notification, allowing you to dilute the ratio with "clean" sales or pause risky traffic immediately.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What are Visa VFMP and Mastercard VMP?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "These are monitoring programs that enforce strict limits on fraud and dispute ratios. Breach of these limits leads to fines and account termination."
      }
    },
    {
      "@type": "Question",
      "name": "How long does it take to exit a program?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Typically 3 to 12 consecutive months of performance below the limit, depending on the severity level (Standard vs. Excessive)."
      }
    },
    {
      "@type": "Question",
      "name": "What is the penalty for being in a program?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Penalties include monthly fines (starting at $1k-$5k), per-dispute surcharges, and the potential loss of ability to process certain cards."
      }
    }
  ]
}
</script>
