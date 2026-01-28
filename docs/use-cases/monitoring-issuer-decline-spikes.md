# Monitoring Issuer Decline Spikes

## Overview
An issuer decline occurs when the cardholder's bank (the issuer) rejects a transaction, even though the merchant and processor accepted it. A sudden spike in issuer declines indicates that a bank has flagged the merchant or a specific traffic segment as risky.

## How issuer declines differ from processor declines
- **Processor Decline**: The payment gateway rejects the transaction (e.g., "Gateway Rejected: Risk").
- **Issuer Decline**: The gateway sends the transaction to the bank, and the bank responds with a "Do Not Honor" or "Insufficient Funds" content.

## Common causes of decline spikes
- **BIN Attack**: A fraud attack focusing on a specific Bank Identification Number (BIN) range.
- **MCC Mismatch**: The merchant is processing under a Category Code (MCC) the issuer blocks (e.g., Crypto).
- **Reputation Flag**: The issuer's risk model has tagged the merchant descriptor as "high fraud."
- **Regional Block**: An issuer declining all transactions from a specific country.

## Risk implications
- **Revenue Loss**: Legitimate customers are unable to pay.
- **Velocity Damage**: A high decline rate damages the merchant's reputation with the network.
- **Authorization Fee Costs**: Merchants pay for every authorization attempt, even declines.

## Operational response requirements
When a spike is detected, teams must:
- **Segment the Data**: Is the spike from one bank (Chase), one card type (Visa), or one country?
- **Check Integration**: Verify that CVV and AVS data are being sent correctly.
- **Pause Traffic**: Stop the affected segment to protect the authorization rate.

## What infrastructure supports decline monitoring
Robust infrastructure ensures:
- **Granular Error Codes**: distinguishing generic "Decline" signals from specific "Stolen Card" signals.
- **BIN Performance Tracking**: Monitoring approval rates per issuing bank.
- **Real-time Alerting**: Triggering notifications when the global approval rate drops below a set deviation (e.g., -5%).

## Where PayFlux fits
PayFlux monitors authorization performance at the issuer level. It visualizes approval rates by BIN, country, and card brand, alerting teams to localized decline spikes. PayFlux helps merchants distinguish between a general outage and a targeted issuer block, enabling faster operational triage.
