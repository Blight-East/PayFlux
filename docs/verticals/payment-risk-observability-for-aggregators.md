# Payment Risk Observability for Aggregators

## Overview
Aggregators (Payment Facilitators or PayFacs) provide processing services to sub-merchants under a master account. This model simplifies onboarding but concentrates risk. The aggregator is financially liable for the losses of every sub-merchant in its portfolio, making risk observability an existential requirement.

## Aggregator risk structure
Aggregators operate a tiered risk model:
1.  **Sub-Merchant**: The entity generating the transaction and the primary source of risk.
2.  **Master Account**: The aggregator’s pooled account with the processor/acquirer.
3.  **Liability Chain**: If a sub-merchant cannot cover a chargeback, the aggregator must pay. If the aggregator fails, the acquirer pays.

## Monitoring challenges
- **Data Isolation**: Keeping sub-merchant data distinct while monitoring aggregate health.
- **Speed of Action**: Detection must happen faster than the settlement cycle to prevent paying out funds to a fraudulent sub-merchant.
- **Shadow Risk**: inactive sub-merchants suddenly waking up with high-velocity traffic (signaling account takeover).

## How processors assess aggregator exposure
Processors view the aggregator as a single large merchant. If the aggregate dispute rate breaches 1%, the *entire* platform can be fined or shut down, regardless of how many individual sub-merchants are compliant. This "one bad apple" effect is the primary structural weakness of the aggregator model.

## Operational visibility requirements
Aggregators need:
- **Real-time Ledger**: Tracking the balance of every sub-merchant continuously.
- **Cross-Portfolio Alerts**: Detecting if a single identity is operating across multiple sub-merchant accounts (collusion).
- **Reserve Management**: Automating the collection and release of sub-merchant reserves based on their specific risk score.

## Where PayFlux fits
PayFlux provides the observability layer for aggregator risk stacks. It ingests risk signals across the entire sub-merchant portfolio, attributing disputes and declines to specific entities. PayFlux helps aggregators protect their master account by identifying and isolating toxic sub-merchants before their behavior impacts the platform's standing with the card networks.
