# How Shadow Risk Accumulates

Up: [Shadow Risk](mechanics-shadow-risk.md)
See also:
- [What is Shadow Risk?](what-is-shadow-risk.md)
- [How Dispute Reserve Feedback Loops Work](./how-dispute-reserve-feedback-loops-work.md)

## Definition
Shadow Risk accumulation is the process by which "Authorized but not Settled" transactions, "In-Transit" refunds, and "Pre-Dispute" inquiries build up invisible liability. It represents future losses that have been "Locked In" but have not yet appeared on a merchant's primary risk dashboard.

## Why it matters
The Lag Blindspot. Standard dashboards show satisfied sales from the past, while Shadow Risk identifies the pending chargebacks of the future. Monitoring this accumulation is the only way to predict and prepare for account freezes before they are officially triggered.

## Signals to monitor
- **Open Authorizations**: The volume of funds held on cardholder accounts but not yet captured.
- **Retrieval Request Volume**: "Soft inquiries" from banks that often serve as a 2-week early warning for formal disputes.
- **Pending Refund Liability**: Initiated refunds that have not yet been debited from the merchant's available balance.
- **Settlement Gap**: The chronological difference between when revenue is settled and when corresponding refunds/disputes typically hit.

## Breakdown modes
- **Auth Bombs**: A high volume of low-value authorizations used for card testing that can trigger velocity blocks without a single capture.
- **Retrieval Spikes**: A sudden influx of bank inquiries that signal a coordinated fraud attack or a systemic product quality failure.
- **Settlement Caps**: Revenue being trapped by payout timing while high-velocity refunds continue to drain the available balance.
- **Deferred Capture exposure**: Risk accumulating during the window between authorization and the final capture of high-value goods.

## Where observability fits
Observability assigns a "Shadow Score" to a merchant account based on pending activity, rather than just settled history. By tracking transactions "Between Statuses," the system provides a more accurate view of true portfolio exposure at any given moment.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is 'Shadow Risk' a standard industry term?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, it is commonly used to describe 'Unrealized Liability' or 'Pending Exposure' that isn't yet reflected in settled P&L."
      }
    },
    {
      "@type": "Question",
      "name": "How is a Retrieval different from a Dispute?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A Retrieval is a request for information from the bank. It doesn't involve a fund reversal yet, but it is the precursor to a formal Dispute."
      }
    },
    {
      "@type": "Question",
      "name": "Do Authorizations count toward risk limits?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. While they cannot be disputed until captured, they count toward velocity limits and 'Card Testing' security checks."
      }
    }
  ]
}
</script>
