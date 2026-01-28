# Compliance Timing Gaps

## Definition
A Compliance Timing Gap is the dangerous window between "Money Moving" and "Risk Checking." It occurs when instant payments outpace asynchronous compliance checks (KYC/AML), leaving the platform exposed to regulatory violations.

## Why it matters
Liability. If a sanctioned entity (terrorist/criminal) moves money on your platform, you are liable even if you ban them 1 hour later. The violation occurred the moment the money moved. Regulators punish the *gap*.

## Signals to monitor
- **Time-to-Review**: The average minutes between "User Signup" and "Compliance Decision."
- **Gap Volume**: Total dollars processed by users in the "Pending Review" state.
- **Enforcement Lag**: The time between "Clicking Ban" and the user actually being blocked in the database.

## Breakdown modes
- **Instant Payouts**: Letting a user withdraw funds *before* the KYC vendor returns a result.
- **Queue Overload**: A backlog of manual reviews extending the gap from minutes to days.
- **Fail-Open**: System defaulting to "Allowed" when the compliance API is down.

## Where observability fits
- **Exposure Meter**: "We currently have $50,000 flowing through unverified users."
- **Vendor Latency**: Tracking how long IDV providers (e.g., Persona, Checkr) take to return signals.
- **State Integrity**: Ensuring no user can reach `payout_enabled: true` without `kyc: approved`.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Can I do checks later?
For low amounts, sometimes. But for high velocity or payouts, checks must be blocking (synchronous).

### What is "Fail-Open" vs "Fail-Closed"?
Fail-Closed means "If we can't verify you, you can't transact." This is safer but hurts conversion.

### Why is the gap dangerous?
Because money moves faster than data. ACH is slow, but crypto/push-to-card is instant.

## See also
- [Merchant Underwriting](./how-merchant-underwriting-works.md)
- [Manual Review Backlogs](../use-cases/monitoring-manual-review-backlogs.md)
- [Payout Delays](./how-payout-delays-work.md)
