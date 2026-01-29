# Payment Processor Freezes

## Definition
A Processor Freeze is the operational suspension of a merchant account. It pauses the flow of funds to protect the financial system from "Credit Risk" (Merchant Insolvency) or "Fraud Risk" (Criminal Activity).

## Why it matters
It is the nuclear option. A freeze stops cash flow, often killing the business. Understanding *why* it happens (Negative Balance, Excessive Disputes, Suspicious Velocity) is the key to preventing it.

## Signals to monitor
- **Velocity Spikes**: Exceeding the "Soft Cap" on monthly processing volume.
- **Ticket Size Jumps**: Suddenly processing $5,000 orders when your average is $50.
- **New Account Activity**: A brand new account processing high volume immediately (looks like a "Bust-Out").

## Breakdown modes
- **The "Bust-Out"**: A fraudster maxing out a merchant account before fleeing.
- **The "Pivot"**: A merchant changing from "Books" to "Bitcoin" without telling the processor.
- **The "Flash Sale"**: A valid marketing campaign looking like a velocity attack.

## Where observability fits
- **Capacity Planning**: "We are at 90% of our monthly volume cap. Request an increase NOW."
- **Drift Alerts**: "Warning: Average Ticket size increased 500% today. This will trigger a freeze."
- **Document Readiness**: Having KYC docs ready to upload the moment a review is triggered.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### What is the difference between a Hold and a Freeze?
Hold = Partial restriction (e.g., holding 10%). Freeze = Total restriction (holding 100%).

### Is it legal?
Yes. It is in the Terms of Service. It looks like "Theft," but it is "Collateralization."

### How long does it last?
Until the risk is resolved, or the Liability Horizon expires (120 days).

## See also
Up: Operational Risk
See also: [Why Major Processors Freeze Funds](./why-major-processors-freeze-funds.md)
- [Payment Reserves](./what-is-a-payment-reserve.md)
- [Merchant Underwriting](./how-merchant-underwriting-works.md)
