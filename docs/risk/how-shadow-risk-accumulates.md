<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Shadow Risk",
  "description": "Shadow Risk is the accumulation of exposure that has not yet appeared on a dashboard. It includes \"Authorized but not Settled\" transactions, \"In-Transit\" refunds, and \"Pre-Dispute\" inquiries. It is the invisible liability that causes sudden account freezes.",
  "about": "Shadow Risk",
  "author": {
    "@type": "Organization",
    "name": "PayFlux"
  },
  "publisher": {
    "@type": "Organization",
    "name": "PayFlux"
  }
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Shadow Risk?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Shadow Risk is the accumulation of exposure that has not yet appeared on a dashboard. It includes \"Authorized but not Settled\" transactions, \"In-Transit\" refunds, and \"Pre-Dispute\" inquiries. It is the invisible liability that causes sudden account freezes."
      }
    },
    {
      "@type": "Question",
      "name": "Why does Shadow Risk matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Predictability. Dashboards show the *past* (Settled Sales). Shadow Risk shows the *future* (Pending Chargebacks). Monitoring Shadow Risk is the only way to predict a freeze *before* it happens."
      }
    }
  ]
}
</script>

Up: [Payment Risk Events](../pillars/payment-risk-events.md)
See also: [Risk Growth Correlation](./mechanics-risk-growth-correlation.md)

# Shadow Risk

## Definition
Shadow Risk is the accumulation of exposure that has not yet appeared on a dashboard. It includes "Authorized but not Settled" transactions, "In-Transit" refunds, and "Pre-Dispute" inquiries. It is the invisible liability that causes sudden account freezes.

## Why it matters
Predictability. Dashboards show the *past* (Settled Sales). Shadow Risk shows the *future* (Pending Chargebacks). Monitoring Shadow Risk is the only way to predict a freeze *before* it happens.

## Signals to monitor
- **Open Authorizations**: The total value of "Held" funds on customer cards that haven't been captured.
- **Retrieval Requests**: The volume of "Soft Inquiries" from banks (precursors to chargebacks).
- **Pending Refunds**: Refunds initiated by the merchant but not yet debited from the balance.

## Breakdown modes
- **The Auth bomb**: A bot testing 10,000 cards with $1.00 Auths. The merchant sees $0 sales, but the network sees 10,000 risk events.
- **The Retrieval Spike**: Receiving 50 retrieval requests in one day. The Chargeback rate is 0%, but the Shadow Risk is 100%.
- **The Settlement Gap**: Sales settling in T+3, Refunds settling in T+1. The dashboard looks positive, but the bank account is negative.

## Where observability fits
- **Leading Indicators**: "Retrievals are up 200%. Expect chargebacks to rise in 2 weeks."
- **State Tracking**: Monitoring the lifecycle of a transaction *between* statuses (e.g., Auth -> Capture).
- **Risk Scoring**: Assigning a "Shadow Score" to the account based on pending activity, not just settled activity.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Is "Shadow Risk" a standard term?
It is an industry term for "Unrealized Liability."

### Can I see Retrieval Requests?
Yes, most processors expose them via API. You should monitor them closely.

### Do Auths count for disputes?
No, a transaction must be Captured to be disputed. But Auths DO count for Velocity limits.

## See also
- [Dispute Aging Curves](./how-dispute-aging-curves-work.md)
- [Transaction Monitoring](./how-transaction-monitoring-works.md)
- [Negative Balance Cascades](./how-negative-balance-cascades-form.md)
