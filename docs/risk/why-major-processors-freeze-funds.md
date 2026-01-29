# Funds Freezes (Major Processors)

Up: [Why Payment Processors Freeze Funds](why-payment-processors-freeze-funds.md)
See also:
- [Payment Reserves & Balances](what-is-a-payment-reserve.md)
- [How Payout Delays Work](how-payout-delays-work.md)
- [Why Processors Request Documents](why-processors-request-documents.md)

Canonical: why-payment-processors-freeze-funds.md


## Definition
A Funds Freeze (or Account Hold) is when a processor stops payouts and/or processing. For major aggregators like Stripe, PayPal, and Adyen, this is largely automated based on machine learning models detecting risk anomalies.

## Why it matters
Continuity. Aggregators (PSPs) are "At-Will" service providers. They can terminate service instantly if their model flags you. Diversification across multiple processors is the only defense against a single point of failure.

## Signals to monitor
- **Account Status API**: Polling `account.status` for changes from `active` to `restricted`.
- **Payout Failures**: `payout_failed` webhooks often precede a formal freeze notice.
- **Support Ticket Sentiment**: Aggressive or automated responses from support often signal an internal risk flag.

## Breakdown modes
- **Stripe**: Known for "Match List" triggers and "High Deviation from Baseline" freezes.
- **PayPal**: Known for "21-Day Holds" on new accounts and "Dispute Spikes."
- **Adyen**: Enterprise-focused; freezes often relate to "Scheme Compliance" (Visa/MC rules).

## Where observability fits
- **Multi-PSP Routing**: "Stripe is frozen. Route traffic to Adyen immediately."
- **Freeze Detection**: "Alert: Payouts paused on Account A."
- **Risk Mirroring**: Ensuring that "High Risk" traffic is balanced, not dumped onto one provider (which triggers a freeze).

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Can they keep my money?
Yes, for the duration of the Liability Horizon (120-180 days).

### Why no warning?
If they warn you, you might "Run Off" (process fraud and vanish). Surprise is a security feature.

### How do I appeal?
Submit the requested documents clearly. Do not spam support.

## See also
- [Payment Reserves](./what-is-a-payment-reserve.md)
- [Why Processors Request Documents](./why-processors-request-documents.md)
- [Detecting Stripe Incidents](../use-cases/detecting-stripe-payment-incidents.md)
