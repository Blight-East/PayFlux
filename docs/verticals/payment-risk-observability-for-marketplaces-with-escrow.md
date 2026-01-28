# Payment Risk Observability for Marketplaces with Escrow

## Overview
Marketplaces with escrow logic hold buyer funds in a separate ledger (FBO Account) before releasing them to the seller. This introduces a complex "Held" state that must be rigorously monitored to prevent commingling funds or releasing money early.

## Escrow-based risk profile
Escrow adds a temporal risk dimension:
- **Liability Gap**: The platform is liable for the funds while they are held.
- **Release Triggers**: Payouts depend on external events (shipping updates, service completion) that can fail or be spoofed.

## Payout dependency chains
Funds must flow strictly: `Buyer Auth -> Capture -> Escrow Hold -> Trigger Event -> Seller Payout`.
- **Breakage**: If the trigger never fires (e.g., tracking API down), funds sit in limbo.
- **Race Conditions**: Refunding a buyer *after* paying the seller creates a negative balance for the platform.

## Dispute timing challenges
Disputes often arrive while funds are in escrow.
- **Scenario A**: Buyer disputes while funds are held. The platform can simply return the money.
- **Scenario B**: Buyer disputes *after* release. The platform must claw back funds from the seller or eat the loss.

## Monitoring and alerting needs
- **Stalled Funds**: Alerting on any escrow balance held longer than X days without release.
- **Ledger Integrity**: Verifying that `Total Buyer Inflows == Total Seller Outflows + Fees + Escrow Balance`.
- **Negative Escrow**: Detecting if a specific bucket/order ID typically has a negative balance (indicating a logic error).

## Where PayFlux fits
PayFlux audits the state transitions of escrowed funds. It acts as a neutral observer, verifying that money moves only when conditions are met. PayFlux highlights operational bottlenecks—like stuck triggers or failed releases—ensuring the marketplace remains compliant with money transmission rules.
