# Risk Thresholds & Hysteresis

## Definition
Risk thresholds are numerical limits that trigger enforcement actions.  
Hysteresis is the lag between crossing a threshold and reversing its effect.

## Why it matters
Threshold systems create discontinuous behavior: small metric changes can cause large operational shifts.

## Signals to monitor
- Metric proximity to enforcement thresholds  
- Rate of threshold crossings  
- Time-to-recovery after breach  
- Window size used for calculation  
- Enforcement duration  

## Breakdown modes
- Sudden account freezes  
- Repeated crossing and recrossing  
- Delayed de-escalation  
- Threshold stacking  
- Cross-metric threshold coupling  

## Implementation notes
Thresholds should be observed as state machines rather than static rules.

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
        "text": "It is the delay between breaching a risk limit and being released from its effects."
      }
    },
    {
      "@type": "Question",
      "name": "Why do thresholds cause sudden freezes?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Because enforcement activates when a numeric boundary is crossed."
      }
    },
    {
      "@type": "Question",
      "name": "Can thresholds reverse immediately?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Release requires sustained metric improvement."
      }
    },
    {
      "@type": "Question",
      "name": "Are thresholds the same across processors?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Each processor defines its own threshold logic."
      }
    }
  ]
}
</script>
