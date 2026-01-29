# Network vs. Processor Authority

Up: [Risk Thresholds](./how-risk-threshold-events-work.md)
See also:
- [How Card Networks Handle Disputes](./how-card-networks-handle-disputes.md)
- [How Network Monitoring Programs Work](./how-network-monitoring-programs-work.md)

## Definition
Network vs. Processor Authority refers to the hierarchy of rules and enforcement in the payment ecosystem. **Network Authority** (Visa/Mastercard) sets global mandates and liability rules, while **Processor Authority** (Stripe/Adyen) implements those rules and adds their own risk layers to protect their banking licenses.

## Why it matters
The "Silent Conflict." Sometimes a transaction is valid according to the Network but blocked by the Processor (or vice-versa). Understanding who made the "Decline" decision is critical for troubleshooting—you cannot fix a Network-level mandate issue by changing Processor-level settings.

## Signals to monitor
- **Response Source**: Identifying which layer generated an error code (Gateway, Processor, or Network).
- **Mandate Drift**: Discrepancies between what the Network requires (e.g., 3DS) and what the Processor enforces.
- **Decline Reason codes**: Mapping generic "Declined" messages to specific Network-level reason bits (e.g., "NSF" vs "Do Not Honor").

## Breakdown modes
- **Over-zealous Processors**: A processor blocking a valid sale because their internal model is more conservative than the card issuer's.
- **Network Mandate Violations**: A processor failing to pass a required 3DS signal, leading to an automatic Network-level fine for the merchant.
- **Lapsed Authority**: A processor's certificate or credential expiring, causing all Network requests to fail globally.

## Where observability fits
Observability provides "Identity Attribution" for declines. By decoding the response codes and tracing the request path, the system can tell you: "This wasn't a bank decline; your processor's risk model blocked this before it ever reached the Network."

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Who has the final say on a payment?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The Issuing Bank (the user's bank) has the final 'Yes/No,' but the Network and Processor can both block it before it reaches the bank."
      }
    },
    {
      "@type": "Question",
      "name": "Can my processor ignore network rules?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Processors must follow network mandates or face multi-million dollar fines and loss of license."
      }
    },
    {
      "@type": "Question",
      "name": "Why did my processor block a sale the bank approved?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Processors often have 'Pre-processing' risk filters designed to prevent fraud from reaching the network, which helps maintain the processor's own standing with banks."
      }
    }
  ]
}
</script>
