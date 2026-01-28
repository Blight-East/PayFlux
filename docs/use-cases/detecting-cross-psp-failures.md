# Detecting Cross-PSP Payment Failures

## Overview
Large merchants often use multiple Payment Service Providers (PSPs) for redundancy or regional optimization. A "Cross-PSP Failure" is a systemic issue that affects authorizations across *all* connected processors simultaneously, indicating a problem upstream (card networks) or downstream (application logic).

## What cross-PSP failures indicate
When Stripe, Adyen, and PayPal all start failing at the same time, the issue is not the processor. It signals:
- **Network Outage**: Visa or Mastercard is experiencing regional downtime.
- **Bad Deployment**: A code change in the merchant's checkout app is malforming requests sent to *all* gateways.
- **Issuer Outage**: A major issuing bank (e.g., Chase, Citi) is down, affecting all traffic regardless of the route.

## Common correlated failure causes
- **Bin Attacks**: A fraud attack targeting a specific BIN range will cause declines on all PSPs processing that card type.
- **3DS Failures**: If the 3D Secure provider goes down, all transactions requiring authentication will drop.
- **Currency Volatility**: Sudden FX shifts can trigger risk blocks across multiple global processors.

## Why processors cannot detect this alone
Stripe only sees Stripe traffic. Adyen only sees Adyen traffic. Neither can tell you that the *other* is also failing. They will each report "Normal" or "Slight Degradation," missing the global correlation.

## Operational response needs
- **Isolate the Variable**: Is it one card brand? One country? One BIN?
- **Route Shifting**: If one PSP is healthy and others are not, shift traffic dynamically.
- **Stop Deployment**: If the error correlates with a software release, rollback immediately.

## What observability infrastructure provides
- **Unified Control Plane**: Aggregating success rates from all PSPs into a single time-series graph.
- **Correlation Analysis**: Automatically flagging when error codes sync up across disparate providers.
- **Vendor Independence**: A source of truth that does not rely on the PSP's own status page.

## Where PayFlux fits
PayFlux sits above the multi-PSP stack. It ingests data from all connections and detects correlated failure patterns in real-time. PayFlux alerts operations teams to systemic outages that single-processor dashboards miss, enabling faster root cause analysis.
