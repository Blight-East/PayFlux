# Payment Service Providers (PSPs)

## Definition
PSP Observability is the "Control Tower" view of payment processing. PSPs aggregate thousands of merchants. Their risk is **Systemic**: if the PSP's master risk ratios breach network thresholds, the entire portfolio is threatened.

## Why it matters
PSPs operate on thin margins and high volume. A single fraudulent merchant processing $1M in bad volume can wipe out the profit of 1,000 good merchants. Worse, it can cause the acquiring bank to "turn off" the PSP.

## Signals to monitor
- **Portfolio-Wide Dispute Rate**: The aggregate ratio across all sub-merchants.
- **Concentration Risk**: The % of volume coming from the Top 10 merchants.
- **Sector Health**: Risk performance by MCC (e.g., "How is our Travel portfolio performing?").
- **Onboarding Leakage**: The fraud rate of merchants aged < 30 days.

## Breakdown modes
- **Merchant Bust-Out**: A merchant processing clean volume for 3 months to build credit, then hitting the limit with fraud and vanishing.
- **Collusion**: A ring of fake merchants and fake buyers extracting cash from the PSP.
- **Bank Action**: The Acquiring Bank imposing a "Blanket Reserve" on the PSP due to aggregate risk.

## Where observability fits
- **Decomposition**: Clicking down from "Portfolio Alert" -> "Sector Alert" -> "Specific Merchant."
- **Shadow Monitoring**: Tracking merchants who are technically "active" but have stopped processing (often a precursor to abandonment or takeover).
- **Float Management**: Tracking the exact location of funds across the clearing cycle.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### What is a "Master MID?"
The aggregated merchant ID used by the PSP to process on behalf of sub-merchants. The card network often sees only this ID.

### How do PSPs protect themselves?
Reserves. Holding funds from merchants to cover potential trailing liabilities.

### Can a PSP ignore a small merchant's fraud?
No. Networks track "Excessive" merchants individually too. If a PSP harbors too many bad actors, the PSP itself is penalized.

## See also
- [Aggregators](./payment-risk-observability-for-aggregators.md)
- [Network Monitoring Programs](../risk/how-network-monitoring-programs-work.md)
- [Detecting Cross-PSP Failures](../use-cases/detecting-cross-psp-failures.md)
