<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Risk Thresholds and Hysteresis",
  "description": "Risk management operates on non-linear thresholds and state-based logic. Includes Threshold Events (triggers), Hysteresis (exit traps), and Retraining Lag (temporal gaps).",
  "about": "Risk Thresholds and Hysteresis",
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
      "name": "What are Risk Thresholds and Hysteresis?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Risk management operates on non-linear thresholds and state-based logic.\n- **Threshold Event**: A programmatic trigger that fires (Reserve/Freeze/Fine) when metrics breach a limit (e.g., 0.9% dispute rate).\n- **Hysteresis**: The \"Trap\" where the exit threshold is stricter than the entry threshold. If you breach 0.9%, you may need to stay below 0.6% for 3 months to normalize."
      }
    },
    {
      "@type": "Question",
      "name": "Why do Risk Thresholds matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Operational survival vs. Automation. Threshold events are automated and binary. You do not get a warning; you get a consequence. Hysteresis means \"fixing\" the problem isn't enough; you must \"over-perform\" to escape the penalty box."
      }
    }
  ]
}
</script>

This page is part of the Payment Risk Mechanics series and serves as the primary reference for this topic.

Up: [Payment Risk Events](../pillars/payment-risk-events.md)
See also: [Payment Reserves and Balances](./mechanics-payment-reserves-and-balances.md), [Rolling Risk Windows](./how-rolling-risk-windows-work.md)

# Risk Thresholds and Hysteresis

## Definition
Risk management operates on non-linear thresholds and state-based logic.
- **Threshold Event**: A programmatic trigger that fires (Reserve/Freeze/Fine) when metrics breach a limit (e.g., 0.9% dispute rate).
- **Hysteresis**: The "Trap" where the exit threshold is stricter than the entry threshold. If you breach 0.9%, you may need to stay below 0.6% for 3 months to normalize.
- **Retraining Lag**: The temporal gap between a new fraud vector emerging and the risk model learning to block it (The "Zero Day" of payments).

## Why It Matters
Operational survival vs. Automation.
- **Machine Speed**: Threshold events are automated and binary. You do not get a warning; you get a consequence.
- **Recovery Difficulty**: Hysteresis means "fixing" the problem isn't enough; you must "over-perform" to escape the penalty box.
- **Exposure Windows**: Retraining lag creates a dangerous window where approval rates stay high while invisible risk (future chargebacks) accumulates.

## Signals to Monitor
- **Distance-to-Breach**: The delta between current metrics (e.g., 0.82%) and the penalty threshold (0.9%).
- **Probation Counter**: "Month 1 of 3" consecutive clean months required for exit.
- **Approval Rate Stability**: A sudden drop usually means a model update (end of lag); a flat line during an attack means the model is lagging.
- **Fraud Vintage**: The timestamp of the fraud vs. the timestamp of the model update.

## How It Breaks Down
- **The "Almost" Reset**: Hitting 0.5% for two cleaning months, then spiking to 0.65% in month 3, resetting the entire 3-month probation counter.
- **The Double Whammy**: A fraud attack spikes the Refund rate (attempted fix) AND the Dispute rate (failed fix), triggering two threshold events simultaneously.
- **The Open Window**: 48 hours where a specific attack bypasses checks before the model retrains, allowing massive liability accumulation.
- **The Yo-Yo**: Models oscillating between "Too Loose" (fraud spikes) and "Too Strict" (false declines) with every deployment.

## How Risk Infrastructure Surfaces This
An observability system would surface these mechanics by:
- **Burn-Down Tracking**: Visualizing the path to the *exit* threshold (which is different from the entry threshold).
- **Change Detection**: "Risk Score Distribution shifted significantly at 4am UTC," signaling a model update.
- **Gap Protection**: Alerting when manual rules are needed to cover the lag period before the model catches up.
- **Scenario Planning**: "If we refund these 100 orders, our refund rate will hit 12%. Is that safe?"

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Who sets the thresholds?
Combinations of Network Rules (Visa/MC) and internal Processor Risk Policy.

### Why is Hysteresis so unfair?
It is designed to be conservative. The processor needs "assurance" (over-performance) to trust the volume again after a breach.

### How long does a penalty program last?
Typically 3 to 12 months, depending on severity (e.g., Visa VFMP ranges from 4-12 months).
