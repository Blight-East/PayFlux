# How Risk Threshold Hysteresis Works

Up: [Risk Thresholds & Hysteresis](../risk/mechanics-risk-thresholds-and-hysteresis.md)
See also:
- [What is Threshold Hysteresis?](../risk/what-is-threshold-hysteresis.md)

## Definition
Risk Threshold Hysteresis works by establishing two distinct limits: an **Entry Threshold** (to enter a penalty state) and a stricter **Exit Threshold** (to leave it). Once a rule is broken, the account must "over-correct" to return to normal standing.

## Why it matters
It creates a "trap." If a monitoring program limit is 0.9% disputes, you enter at 0.91%. But to *exit*, the rule might require <0.6% for 3 months. Simply returning to 0.8% is insufficient.

## Signals to monitor
- Current Metric (Real-time rate)  
- Target Threshold (Exit requirement)  
- Probation Counter (Clean months accrued)  
- Cohort Performance (New vs Legacy traffic risk)  
- Burn-Down Rate  

## Breakdown modes
- "The Almost Reset" (Spiking in month 3 of probation, resetting counter to zero)  
- "Permanent Flagging" (Stuck in entry/exit loop)  
- Misaligned expectations (Aiming for Entry threshold instead of Exit threshold)  

## Implementation notes
Observability should visualize the path to the *Exit* threshold and track the "Gap" between current reality and required performance. Key focus is sustained stability.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Why is hysteresis unfair?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "It is designed to be conservative. Processors need extra assurance ('over-performance') to trust volume again after a breach."
      }
    },
    {
      "@type": "Question",
      "name": "How long does it last?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Typically 3 to 12 months, depending on the severity of the program (e.g., Visa VFMP)."
      }
    },
    {
      "@type": "Question",
      "name": "Can I switch processors to escape?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Technically yes, but TMF/MATCH lists often prevent this. Structurally fixing the metrics is usually required."
      }
    }
  ]
}
</script>
