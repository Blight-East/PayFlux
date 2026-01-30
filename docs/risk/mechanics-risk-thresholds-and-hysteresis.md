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

## Upstream Causes
Risk thresholds are triggered by:
- elevated dispute ratios
- sudden traffic velocity changes
- retry amplification
- model confidence shifts
- abnormal refund rates
- delayed settlement confirmation

Threshold hysteresis is caused by:
- rolling evaluation windows
- asymmetric trigger and release conditions
- delayed risk model retraining
- enforcement cooldown timers

These inputs cause thresholds to behave as stateful control systems rather than simple limits.


## Downstream Effects
Threshold crossings result in:
- step-function enforcement changes
- reserve imposition
- payout delays
- transaction blocking
- manual review escalation

Hysteresis causes:
- delayed recovery after traffic normalizes
- prolonged enforcement after incidents resolve
- risk memory effects across time windows

This converts transient failures into persistent operational constraints.


## Common Failure Chains
**Retry Storm → Threshold Breach → Reserve Formation**

**Model Drift → Threshold Shift → Higher Decline Rates**

**Dispute Cluster → Threshold Trigger → Account Review**

**Traffic Spike → Velocity Threshold → Enforcement Lock**

These chains explain why risk controls behave non-linearly during incidents.


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
