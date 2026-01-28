# Payment Risk Observability for High-Risk Merchants

## Overview
"High-risk" is a classification used by processors for industries with elevated rates of fraud, disputes, or regulatory scrutiny (e.g., gaming, travel, nutraceuticals). These merchants operate under tighter constraints, including lower dispute thresholds, rolling reserves, and frequent manual reviews.

## Common high-risk merchant patterns
High-risk merchants exhibit distinct processing traits:
- **Volume Volatility**: Spikes in sales due to product launches or seasonality.
- **Dispute Clustering**: High chargeback rates that cluster around specific billing cycles.
- **Cross-Border Traffic**: A large percentage of international cards, leading to lower authorization rates.

## Processor monitoring behavior
Acquirers monitor high-risk accounts aggressively:
- **Velocity Checks**: stricter limits on how quickly funds can be processed.
- **Pendings**: Holding batches for 24-48 hours to screen for fraud before release.
- **Reserve Triggers**: Increasing the reserve percentage immediately if risk metrics degrade.

## Operational challenges
- **Cash Flow Uncertainty**: Reserves and holds make liquidity prediction difficult.
- **MID Management**: Balancing volume across multiple merchant IDs (MIDs) to avoid overloading one account.
- **Documentation Fatigue**: Constant requests for invoices, fulfillment proof, and bank statements.

## What observability infrastructure enables
Effective infrastructure provides:
- **Global Liquidity View**: Tracking available vs. held funds across all processor connections.
- **Forensic Monitoring**: Identifying the specific affiliate or traffic source driving a risk spike.
- **Threshold Alerts**: Warning when an account approaches a volume or dispute limit *before* a freeze occurs.

## Where PayFlux fits
PayFlux provides specialized observability for high-risk operations. It aggregates risk signals across multiple MIDs and processors, providing a unified view of portfolio health. PayFlux helps high-risk merchants maintain situational awareness, ensuring they can react to risk exposure before it triggers an irreversible enforcement action.
