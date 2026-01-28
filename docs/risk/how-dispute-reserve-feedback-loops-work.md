# How Dispute-Reserves Feedback Loops Work

## Overview
A feedback loop occurs when a risk control mechanism (like a Reserve) inadvertently creates the very condition it was trying to prevent (more Disputes). This circular causality creates a "death spiral" for merchants if not carefully managed.

## What feedback loops are
**System**: "Risk is high, so I will hold 50% of your funds."
**Reality**: The merchant now has 50% less cash to fulfill orders using the vendors.
**Result**: Orders are delayed. Customers get angry.
**Reaction**: Customers file disputes for "Item Not Received."
**System**: "Disputes just went up! Risk is higher! I will now hold 100% of your funds."

## How disputes trigger reserves
Standard logic: A rise in dispute rate suggests operational instability or fraud. The rational processor response is to increase the collateral (reserve) to cover potential future losses.

## How reserves affect payouts
Reserves are "Top-Level Deductions." They come out of the settlement *before* the merchant gets a penny. A 50% reserve means the merchant only gets 50 cents on the dollar for operating expenses.

## How payout changes affect disputes
If a merchant operates on thin margins (dropshipping, travel), a cash crunch leads to service failure.
- **Inventory**: Can't buy goods to ship.
- **Support**: Can't pay staff to answer tickets.
- **Refunds**: Can't issue voluntary refunds because the balance is locked, forcing customers to chargeback.

## Why loops persist
Risk models rarely account for *their own impact*. They see the rising disputes as "Merchant Bad Behavior," not "result of my reserve." They respond by tightening the screws, which accelerates the failure.

## Where observability infrastructure fits
Infrastructure detects the correlation between "Reserve Imposition" and "Dispute Acceleration." It tracks:
- **Lagged Correlation**: Did the dispute spike occur 14 days *after* the reserve was applied? (Suggests a feedback loop).
- **Reason Code Shift**: Are the new disputes predominantly "Item Not Received" or "Credit Not Processed"? (Liquidity issues).
- **Intervention**: Alerting operations teams that the standard risk mitigation strategy is actually increasing the total exposure.
