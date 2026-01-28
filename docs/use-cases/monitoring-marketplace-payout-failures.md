# Monitoring Marketplace Payout Failures

## Overview
In a marketplace model, the platform collects funds from buyers and pays out to sellers. Payout failures occur when the transfer to the seller (via ACH, wire, or push-to-card) is rejected or blocked. These failures create operational debt, seller friction, and potential compliance flags.

## Common causes of payout failure
- **Banking Rails**: Invalid routing numbers, closed accounts, or currency mismatch.
- **KYC/Compliance**: The payout is blocked because the seller failed identity verification or is on a sanctions list.
- **Risk Holds**: The risk engine blocked the payout due to suspicious activity (e.g., a "bust-out" pattern).
- **Platform Liquidity**: The platform's funding source (FBO account) has insufficient funds to cover the batch.

## Relationship to compliance and risk
Payout failures are often a "smoke signal" for downstream issues. A sudden spike in payout rejections for a specific seller might indicate their bank account has been flagged for fraud elsewhere. Conversely, a platform-wide failure might signal a disconnection with the banking partner.

## Downstream effects on sellers
- **Cash Flow Crunch**: Sellers rely on payouts to restock inventory.
- **Trust Erosion**: Repeated failures cause sellers to leave the platform.
- **Support Volume**: Every failed payout generates a support ticket asking "Where is my money?".

## Operational response needs
Teams need to:
- **Categorize Failures**: Distinguish between "soft" failures (can be retried) and "hard" failures (compliance block).
- **Automate Retries**: Re-attempting failed transfers only when safe.
- **Proactive Notification**: Alerting the seller to update their bank details before they ask.

## What observability infrastructure provides
Robust infrastructure ensures:
- **Status Normalization**: Mapping diverse error codes from different banks into a standard taxonomy (e.g., "Invalid Account," "Risk Block").
- **Success Rate Tracking**: Monitoring the % of payouts that settle successfully by region/method.
- **Audit Trails**: Recording exactly why a specific payout was blocked or failed.

## Where PayFlux fits
PayFlux audits the payout lifecycle from instruction to settlement. It logs failure reasons and correlates them with seller risk profiles. PayFlux enables platforms to distinguish between a technical banking error and a deliberate risk hold, streamlining the resolution process for operations teams.
