# Risk Events and Growth

## Definition
The "Growth Risk Paradox" describes the high correlation between rapid revenue scaling and payment risk events. To a risk model, a sudden spike in sales looks identical to a "Bust-Out" fraud attack (where a bad actor pumps volume before disappearing).

## Why it matters
Success is the biggest risk factor. Scaling from $10k/month to $100k/month triggers velocity alerts, credit reviews, and often reserve impositions. Merchants often feel punished for succeeding, but the processor is mathematically reacting to "uncollateralized exposure."

## Signals to monitor
- **Velocity vs Cap**: Current processing volume relative to the "Monthly Limit" set at onboarding.
- **Average Ticket**: Sudden shifts in AOVs (e.g., selling a new $500 product when usually selling $20 items).
- **geo_mismatch**: New growth coming from high-risk regions unexpected by the underwriter.
- **Volume Acceleration**: The derivative of growth (how *fast* it is rising).

## Breakdown modes
- **Velocity Freeze**: Hitting the hard processing cap, causing all subsequent txns to fail.
- **Protective Reserve**: Processor imposing a 25% hold to cover the "new, untested" volume.
- **Verification Loop**: Processing paused while the risk team asks for invoices to prove the sales are real.

## Where observability fits
- **Capacity Planning**: Tracking "Percent of Monthly Cap Used" to request limit increases *before* hitting the wall.
- **Cohort Analysis**: proving that the new traffic performs just as well (low disputes) as the old traffic.
- **Exposure Modeling**: Calculating the processor's "Funds at Risk" to anticipate their anxiety.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Why do they freeze my money?
Because if those new sales turn out to be fraud, the processor is liable for the refunds. They hold the money until the delivery window closes.

### How do I prevent this?
Communication. Tell your account manager *before* you launch a big promo or viral campaign.

### Is it personal?
No. It's an algorithm detecting a "Volume Anomaly."

## See also
- [Merchant Underwriting](../risk/how-merchant-underwriting-works.md)
- [Payment Risk Events](../pillars/payment-risk-events.md)
- [Risk Threshold Events](../risk/how-risk-threshold-events-work.md)
