# How Dispute Evidence Works

## Overview

When a cardholder disputes a transaction, the merchant is required to submit evidence to support the validity of the charge. This evidence is evaluated by the card network and issuing bank, not by the payment processor directly. The outcome depends on whether the submitted materials satisfy predefined reason-code rules.

## Evidence Categories

Dispute evidence typically falls into several categories:
- **Transaction Proof**: Receipts, invoices, or order confirmations.
- **Customer Identity**: IP address logs, device fingerprints, or account history.
- **Delivery Confirmation**: Shipping carrier records or digital delivery logs.
- **Usage Records**: Login timestamps, service access logs, or content consumption history.
- **Policy Disclosure**: Refund policy or terms accepted at checkout.

Each dispute reason code determines which categories are considered relevant.

## Reason Code Mapping

Card networks assign a reason code to each dispute. The reason code dictates:
- What evidence is acceptable.
- How evidence must be formatted.
- Whether representment is allowed at all.

## Time Constraints

Evidence must be submitted within a fixed response window. These windows are enforced by card network rules and cannot be extended by processors or support teams.

## Evaluation Process

Once evidence is submitted:
1. The processor packages the data according to network format rules.
2. The issuing bank reviews the evidence.
3. The card network arbitrates if escalation occurs.

## Infrastructure Role

Dispute infrastructure systems help by:
- Normalizing evidence formats across processors.
- Tracking submission deadlines.
- Preserving historical records of prior disputes.
- Mapping reason codes to evidence requirements.

## Where Payflux Fits

Payflux functions as infrastructure for dispute observability. It aggregates dispute metadata, tracks evidence submission state, preserves audit trails, and surfaces contributing transaction patterns. It does not influence network adjudication.
