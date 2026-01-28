# How Compliance Timing Gaps Form

## Overview
Compliance processes (KYC, AML, Sanctions Screening) often run on different "clocks" than payment processing. A "Compliance Timing Gap" occurs when money creates a risk event *faster* than the compliance team can review it, creating a period of potentially illegal exposure.

## What timing gaps are
- **Instant**: User signs up and processes \$100k (T=0).
- **Lagged**: AML Alert triggers (T+1 hour).
- **Reviewed**: Compliance Officer opens the ticket (T+24 hours).
- **Gap**: For 24 hours, the platform is facilitating money transmission for a potentially sanctioned entity.

## Relationship between risk and compliance
- **Risk**: "Is this transaction going to cause a chargeback?" (Financial Loss).
- **Compliance**: "Is this user a terrorist or money launderer?" (Regulatory Jail).
They are often separate teams with separate data silos, exacerbating the gap.

## Why reviews lag transactions
- **Volume**: Automated onboarding allows 1,000 signups/hour. Human review capacity is 10/hour.
- **Data Availability**: Third-party identity providers (IDV) might have downtime or latency, delaying the "Clear/Fail" signal while the user is already transacting.

## How gaps increase exposure
If the user turns out to be a bad actor, every dollar processed during the gap is a violation.
- **Clawbacks**: Regulators may demand disgorgement of all fees earned.
- **Fines**: Penalties are assessed per violation occurrence during the gap.

## Why closure is delayed
Even after a decision is made ("Ban this user"), the technical enforcement (closing the account, freezing funds, refunding buyers) takes time to propagate through database replicas and payment gateways.

## Where observability infrastructure fits
Infrastructure measures the "Exposure Window." It tracks:
- **Time-to-Review**: Median time from Alert -> Human Decision.
- **Gap Volume**: Total \$ volume processed by users currently in the "Alerted but Review Pending" state.
- **Enforcement Latency**: Time from "Ban Decision" -> "Last API Call Succeeded."
