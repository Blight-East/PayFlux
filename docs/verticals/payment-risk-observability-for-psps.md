# Payment Risk Observability for PSPs

## Overview
Payment Service Providers (PSPs) manage processing for thousands of distinct merchants, often aggregating them under shared Portfolio IDs or Master Merchant accounts. This structure creates complex risk interdependencies where one merchant's behavior can impact the standing of the entire portfolio. Observability for PSPs requires decomposing aggregated risk signals into merchant-level attribution.

## Common PSP risk patterns
PSPs face specific structural risks:
- **Portfolio Contamination**: High dispute rates from a few merchants pushing the aggregate portfolio above network thresholds (e.g., 0.9%).
- **Onboarding Leakage**: Merchants approved quickly who later exhibit high-risk behavior or fraud.
- **Settlement Float**: Managing the timing gap between paying merchants and receiving funds from upstream acquirers.
- **Vertical Concentration**: Over-exposure to high-risk industries (e.g., travel, crypto) amplifying volatility.

## How risk propagates across merchants
In a PSP model, risk is often non-linear:
1.  **Merchant Violation**: A single merchant suffers a fraud attack or high chargeback month.
2.  **Aggregator Trigger**: The PSP's master account sees a spike in the dispute-to-sales ratio.
3.  **Upstream Enforcement**: The acquiring bank or network places the *entire* PSP portfolio on a monitoring program or hold, affecting compliant merchants.

## Operational challenges
- **Signal Latency**: Receiving chargeback data weeks after the transaction occurred.
- **Reporting Fragmentation**: Aggregating risk data across multiple acquiring banks and processor connections.
- **Mitigation Tuning**: Applying holds or reserves to specific merchants without disrupting the wider portfolio.

## What observability infrastructure enables
Effective infrastructure provides:
- **Merchant Segmentation**: Isolating risk metrics by merchant category (MCC), vintage, or region.
- **Early Warning**: Detecting ratio shifts at the merchant level before they impact the portfolio aggregate.
- **Lifecycle Tracking**: Monitoring merchants from onboarding through to maturity and churn.

## Where PayFlux fits
PayFlux provides portfolio-wide risk observability for PSPs. It ingests transaction and dispute data across all acquirer connections, attributing risk signals to individual sub-merchants. PayFlux enables PSPs to visualize their risk exposure at both the portfolio and merchant level, supporting data-driven decisions on reserves and compliance without dictating the enforcement policy itself.
