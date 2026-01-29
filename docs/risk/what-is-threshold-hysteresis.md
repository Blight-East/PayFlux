# What is Threshold Hysteresis?

Up: [Risk Thresholds & Hysteresis](mechanics-risk-thresholds-and-hysteresis.md)
See also:
- [How Risk Threshold Hysteresis Works](../how-it-works/how-risk-threshold-hysteresis-works.md)

## Definition
Threshold hysteresis is the phenomenon where risk enforcement systems activate and deactivate at different metric levels, creating persistence in enforcement even after conditions improve. The "Exit" threshold is stricter than the "Entry" threshold.

## Why it matters
Merchants may correct the original issue (e.g., lowering disputes) but remain restricted because the system requires sustained "over-performance" to release controls. This prevents rapid toggling but delays recovery.

## Signals to monitor
- Entry Threshold (Activates penalty)  
- Exit Threshold (Deactivates penalty)  
- Hysteresis Gap (Difference between Entry and Exit)  
- Probation Duration (Time required below Exit threshold)  
- Oscillation Rate (frequency of entering/exiting)  

## Breakdown modes
- Enforcement persistence after fix  
- Getting stuck in "Probation" loops  
- Threshold stacking (multiple rules keeping account frozen)  
- Failed exit due to single spike  

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
        "text": "It is when enforcement systems require much lower risk levels to deactivate controls than they did to activate them."
      }
    },
    {
      "@type": "Question",
      "name": "Why is hysteresis used?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "It prevents rapid oscillation of controls (on/off flipping) and ensures risk is genuinely stabilized before releasing restrictions."
      }
    },
    {
      "@type": "Question",
      "name": "Does hysteresis cause delays?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Merchants often remain restricted long after their metrics have returned to 'normal' levels."
      }
    }
  ]
}
</script>
