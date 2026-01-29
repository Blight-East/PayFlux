# What is Threshold Hysteresis?

Up: [Risk Thresholds & Hysteresis](mechanics-risk-thresholds-and-hysteresis.md)
See also:
- [How Risk Threshold Hysteresis Works](../how-it-works/how-risk-threshold-hysteresis-works.md)
- [How Network Monitoring Programs Work](./how-network-monitoring-programs-work.md)

## Definition
Threshold Hysteresis is the phenomenon where risk enforcement systems activate and deactivate at different metric levels. To prevent rapid "On/Off" toggling of account restrictions, the "Exit" threshold (to release a hold) is typically much stricter than the original "Entry" threshold (that triggered the hold).

## Why it matters
Recovery Lag. Merchants may correct an underlying issue (e.g., stopping a fraud attack), but they remain restricted because the system requires a sustained period of "Over-Performance" to release controls. This ensures stability but creates a significant delay between operational fixes and financial recovery.

## Signals to monitor
- **Entry Threshold**: The limit that activates a penalty (e.g., 1.0% dispute ratio).
- **Exit Threshold**: The much lower limit required to deactivate the penalty (e.g., 0.6% dispute ratio).
- **Hysteresis Gap**: The mathematical difference between the Entry and Exit levels that represents the "Probationary Zone."
- **Probation Duration**: The number of consecutive days or months required below the Exit threshold to trigger a release.

## Breakdown modes
- **Enforcement Persistence**: A merchant remaining restricted for months after their metrics have returned to "Normal" but have not yet hit the "Excessively Safe" exit level.
- **Probationary Loops**: Getting stuck in a cycle where a single small spike resets the 6-month hysteresis clock back to zero.
- **Threshold Stacking**: Multiple different rules (e.g., Visa, Mastercard, and Processor-internal) with different hysteresis gaps all keeping an account restricted simultaneously.

## Where observability fits
Observability provides visibility into the "Exit Path." By tracking a merchant's standing relative to both the Entry and Exit thresholds, the system can provide a deterministic countdown: "You have fixed the fraud, but you must maintain a ratio below 0.6% for 4 more weeks to exit probation."

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is threshold hysteresis?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "It is when an enforcement system requires you to hit a lower risk level to turn off a penalty than it did to turn it on."
      }
    },
    {
      "@type": "Question",
      "name": "Why do processors use hysteresis?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "To prevent 'Control Oscillation' and ensure that a merchant's risk has genuinely stabilized before releasing bank collateral."
      }
    },
    {
      "@type": "Question",
      "name": "How can I speed up recovery?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "By diluting your risk ratio with high volumes of 'Clean' (low-risk) sales, which helps you hit the strict Exit threshold faster."
      }
    }
  ]
}
</script>
