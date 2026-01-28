# Monitoring Manual Review Backlogs

## Overview
Many merchants and platforms use manual review queues where human agents analyze suspicious transactions before capturing or rejecting them. A "Backlog" occurs when the inflow of potentially risky transactions exceeds the team's capacity to review them, creating a bottleneck that affects revenue and customer experience.

## What manual review queues are
A holding state between "Authorized" and "Captured."
- **Logic**: "This looks 70% risky. Let a human look at the IP, email, and social footprint."
- **SLA**: The target time to make a decision (e.g., 2 hours).

## Why they grow
- **Seasonality**: Black Friday volume spikes imply Black Friday review spikes.
- **Attack**: A card testing attack dumping thousands of "grey area" transactions into the queue.
- **Staffing**: Ops team out sick or understaffed during a surge.

## How backlog affects payouts and approvals
- **Auto-Cancel**: Most authorization holds expire in 7 days. If the review isn't done, the order is auto-cancelled, losing the sale.
- **Customer Friction**: Legitimate customers wondering "Where is my order confirmation?"
- **Cash Flow**: Uncaptured funds don't settle. A massive backlog effectively pauses revenue recognition.

## Early warning signals
- **Queue Age**: The average time an item sits in the queue is rising (e.g., from 1 hour to 12 hours).
- **Inflow > Outflow**: New items arrived > Items resolved per hour.

## What observability infrastructure provides
- **Capacity Planning**: "We need 5 agents online to handle current volume."
- **Triage**: Sorting the queue by value or risk score so the most important items are reviewed first.
- **Performance**: Tracking "Decisions per Hour" per agent.

## Where PayFlux fits
PayFlux treats the review queue as a system state. It monitors the *pressure* on the Ops team. By alerting on backlog depth and age, PayFlux helps Ops leads reallocate resources or tighten auto-decline rules to stem the tide before legitimate orders are lost to timeout.
