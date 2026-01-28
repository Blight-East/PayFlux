# Risk Threshold Events

## Definition
A Risk Threshold Event is a programmatic trigger that fires when a merchant's metrics breach a pre-defined safety limit. Unlike a "Review," which is investigative, a Threshold Event is executive: it applies an immediate consequence (Reserve, Freeze, Fee).

## Why it matters
Automation. These actions happen at machine speed. You do not get a phone call first. Understanding where the "Tripwires" are is the only way to prevent accidental breaches.

## Signals to monitor
- **Dispute Ratio**: The classic 0.9% limit.
- **Refund Ratio**: Crossing 10-15%.
- **Unauthorized Returns**: Crossing 0.5% (the Unauthorized limits are stricter than general disputes).
- **Turnover Volume**: Exceeding the monthly processing cap.

## Breakdown modes
- **The Double Whammy**: A fraud attack spikes the Refund rate (attempted fix) AND the Dispute rate (failed fix), triggering two threshold events simultaneously.
- **The Monthly Reset**: Hitting a volume cap on Day 25, meaning you cannot process any sales for the remaining 5 days of the month.

## Where observability fits
- **Distance-to-Breach**: Visualizing how close you are to the edge. "You are at 0.8% (Danger)."
- **Velocity Tracking**: "At current pace, you will hit the volume cap in 4 days."
- **Scenario Planning**: "If we refund these 100 orders, our refund rate will hit 12%. Is that safe?"

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Who sets the thresholds?
Combinations of Network Rules (Visa/MC) and internal Processor Risk Policy.

### Are they public?
Network rules are public (Visa Core Rules). Processor rules are internal/proprietary, but usually follow industry norms.

### Can I get a waiver?
Sometimes. If you warn the processor *before* a launch that volume will spike, they can raise the threshold temporarily.

## See also
- [Payment Risk Events](../pillars/payment-risk-events.md)
- [Risk Threshold Hysteresis](../how-it-works/how-risk-threshold-hysteresis-works.md)
- [Merchant Underwriting](./how-merchant-underwriting-works.md)
