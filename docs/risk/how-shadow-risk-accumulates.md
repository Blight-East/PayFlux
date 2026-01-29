# How Shadow Risk Accumulates

Up: [Shadow Risk](mechanics-shadow-risk.md)
See also:
- [What is Shadow Risk?](what-is-shadow-risk.md)

## Definition
Shadow Risk accumulation is the process by which "Authorized but not Settled" transactions, "In-Transit" refunds, and "Pre-Dispute" inquiries build up invisible liability.

## Why it matters
Dashboards show satisfied sales (the past), while Shadow Risk shows pending chargebacks (the future). Monitoring accumulation is the only way to predict freezes before they happen.

## Signals to monitor
- Open Authorizations (held funds not captured)  
- Retrieval Request volume (soft inquiries)  
- Pending Refunds (initiated but not debited)  
- Settlement Gap (difference between settlement T+N and refund T+N)  
- Void velocity  

## Breakdown modes
- Auth Bombs (high volume of low-value auths)  
- Retrieval Spikes (sudden influx of inquiries)  
- Settlement Caps (revenue trapped by payout timing)  
- Deferred Capture exposure  

## Implementation notes
Risk scoring should assign a "Shadow Score" based on pending activity, not just settled history. State tracking must monitor transactions *between* statuses.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is Shadow Risk a standard term?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "It is an industry term for 'Unrealized Liability' or 'Pending Exposure'."
      }
    },
    {
      "@type": "Question",
      "name": "Can I see Retrieval Requests?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, most processors expose them via API. They are distinct from disputes."
      }
    },
    {
      "@type": "Question",
      "name": "Do Auths count for disputes?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No, a transaction must be Captured to be disputed. However, Auths do count toward velocity limits and card testing checks."
      }
    }
  ]
}
</script>
