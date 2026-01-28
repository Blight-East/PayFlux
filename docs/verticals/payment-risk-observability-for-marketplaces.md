# Payment Risk Observability for Marketplaces

## Overview
Marketplaces face unique payment risk challenges due to their aggregated liability model. While the risk action (fraud, bad service) occurs at the seller level, the financial and regulatory liability often sits with the platform. Observability is required to decompose platform-level risk into seller-level exposure.

## Common marketplace risk patterns
Marketplaces aggregate risk from diverse sources:
- **Seller Fraud**: Fake listings or non-delivery of goods.
- **Collusive Activity**: Buyers and sellers coordinating to extract funds via chargebacks.
- **Category Drift**: Sellers shifting from approved goods to high-risk or prohibited items.
- **Platform Exposure**: The platform is often the merchant of record (MoR) and liable for the cumulative dispute rate.

## How risk propagates across sellers
Risk signals in a marketplace are often "pooled":
1.  **Individual Breach**: A single seller spikes in dispute rate.
2.  **Pool Contamination**: Use of shared MIDs (Merchant IDs) means one bad actor inflates the dispute ratio for the entire pool.
3.  **Platform Enforcement**: If the pool breaches a network threshold (e.g., 0.9%), the processor penalizes the platform, not just the bad seller.

## Operational challenges
- **Attribution**: Identifying exactly which seller is driving the spike in platform-level risk.
- **Isolation**: Quarantining risky sellers before they impact the master account.
- **Settlement Lag**: Managing funds when sellers are paid out before the chargeback window closes.

## What observability infrastructure enables
Effective infrastructure provides:
- **Granular Attribution**: Mapping disputes and declines to specific connected accounts.
- **Shared Threshold Monitoring**: Tracking how close a shared MID is to a network limit.
- **Unified Auditing**: Centralizing risk status and document requirements across the entire seller base.

## Where PayFlux fits
PayFlux provides multi-account risk observability for marketplaces. It ingests risk signals and attributes them to specific sub-merchants, enabling platforms to identify liability sources. PayFlux helps marketplaces operationalize their risk response by providing a clear view of exposure across their entire seller ecosystem.
