<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Network Monitoring Programs",
  "description": "Network Monitoring Programs (such as Visa's VFMP or Mastercard's ECP) are enforcement frameworks operated by Card Networks to police merchant behavior. They set strict thresholds for disputes and fraud.",
  "about": "Network Monitoring Programs",
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
      "name": "What are Network Monitoring Programs?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Network Monitoring Programs (such as Visa's **VFMP** or Mastercard's **ECP**) are enforcement frameworks operated by Card Networks to police merchant behavior. They set strict thresholds for disputes and fraud. Exceeding these thresholds places a merchant in a \"program\" involving fines, remediation plans, and potential termination."
      }
    },
    {
      "@type": "Question",
      "name": "Why do Network Monitoring Programs matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "These programs are the \"Supreme Court\" mandates of payments. While a processor might tolerate risk, they *cannot* tolerate a network violation. Entering a program is an existential threat to a merchant account, often leading to immediate reserves or closure to protect the processor."
      }
    }
  ]
}
</script>

Up: [Card Network Rules](./mechanics-card-network-rules.md)
See also: [Risk Thresholds and Hysteresis](./mechanics-risk-thresholds-and-hysteresis.md)

# Network Monitoring Programs

## Definition
Network Monitoring Programs (such as Visa's **VFMP** or Mastercard's **ECP**) are enforcement frameworks operated by Card Networks to police merchant behavior. They set strict thresholds for disputes and fraud. Exceeding these thresholds places a merchant in a "program" involving fines, remediation plans, and potential termination.

## Why it matters
These programs are the "Supreme Court" mandates of payments. While a processor might tolerate risk, they *cannot* tolerate a network violation. Entering a program is an existential threat to a merchant account, often leading to immediate reserves or closure to protect the processor.

## Signals to monitor
- **Dispute-to-Sales Ratio**: The key metric (typically monitored against 0.9% or 1.8%).
- **Fraud-to-Sales Ratio**: Calculated using TC40/SAFE data (reported fraud) vs sales.
- **Program Identification**: Specific flags in processor reports indicating `VDMP` or `ECP` status.
- **Remediation Timelines**: Countdown clocks for exiting the program (usually requiring 3 clean months).

## Breakdown modes
- **The Denominator Effect**: Sales volume drops (seasonality), but dispute counts stay flat (lagging), causing the *ratio* to spike above 0.9%.
- **Program Graduation**: Moving from "Standard" (warnings) to "Excessive" (heavy fines) programs.
- **Fine Allocation**: Unexpected large debits appearing on the settlement statement.

## Where observability fits
- **Forecasting**: Predicting month-end ratios based on real-time data to warn of breaches *before* they happen.
- **Fine Liability**: Calculating potential fines based on current tiering.
- **Root Cause Isolation**: determining *which* bin or geo is driving the program breach.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Can I just pay the fine?
For a while, yes. But eventually (usually after 12 months), the networks will force the acquirer to close your account. You cannot "pay to play" indefinitely.

### Who pays the fine?
The Network fines the Acquirer. The Acquirer passes the fine (plus a markup) to You.

### How do I exit?
You typically need 3 consecutive months below the threshold (e.g., < 0.9%) to "graduate" out of the program. One bad month resets the clock.

## See also
- [Network vs Processor Authority](./how-network-vs-processor-authority-works.md)
- [Decline Reason Codes](./understanding-decline-reason-codes.md)
- [Dispute Infrastructure](../pillars/dispute-infrastructure.md)
