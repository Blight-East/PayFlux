<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Settlement Batching",
  "description": "Batching is the operational grouping of authorized transactions into a single file \"envelope\" for transmission to the processor. Typically occurs once every 24 hours.",
  "about": "Settlement Batching",
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
      "name": "What is Settlement Batching?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Batching is the operational grouping of authorized transactions into a single file \"envelope\" for transmission to the processor. This typically occurs once every 24 hours (e.g., 5 PM EST)."
      }
    },
    {
      "@type": "Question",
      "name": "Why does Settlement Batching matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The Moment of Truth. Before the batch closes, a transaction can be **Voided** (Cheap, Instant). After the batch closes, it must be **Refunded** (Costly, Slow). The batch close event starts the T+2 settlement clock."
      }
    }
  ]
}
</script>

This page is part of the Payment Risk Mechanics series and serves as the primary reference for this topic.

Up: [Payment System Observability](../pillars/payment-system-observability.md)
See also: [Payment Settlements](./mechanics-payment-settlements.md), [Payout Delays](./mechanics-account-freezes-and-holds.md)

# Settlement Batching

## Definition
Batching is the operational grouping of authorized transactions into a single file "envelope" for transmission to the processor. This typically occurs once every 24 hours (e.g., 5 PM EST).

## Why It Matters
The Moment of Truth.
- **Irreversibility**: Before the batch closes, a transaction can be **Voided** (Cheap, Instant). After the batch closes, it must be **Refunded** (Costly, Slow).
- **Funding Trigger**: The batch close event starts the T+2 settlement clock. Missing the batch window delays funding by 24h.

## Signals to Monitor
- **Batch State**: `open` vs `closed`.
- **Item Count**: Number of transactions in the envelope.
- **Net Total**: The mathematical sum `(Sales - Credits)` inside the batch.
- **Error Response**: Rejection of the entire batch file by the processor gateway.

## How It Breaks Down
- **Upload Failure**: Connectivity issues preventing the batch file from reaching the acquirer (Funds delayed).
- **Held Batch**: One suspicious transaction causing the processor to flag the *entire* batch for review.
- **Negative Batch**: Refunds exceeding sales, resulting in a debit owed to the processor rather than a deposit.

## How Risk Infrastructure Surfaces This
An observability system would surface these mechanics by:
- **Lifecycle Monitoring**: Alerting if a batch fails to close on schedule (e.g., "Batch open > 26 hours").
- **Deposit Matching**: Tracking which specific batch corresponds to which bank deposit for reconciliation.
- **Void Opportunity**: Identifying transactions that should be voided *before* the batch closes to save interchange fees.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Can I close a batch manually?
On legacy terminals, yes ("Batch Out"). On modern APIs (Stripe/Adyen), batching is usually automated.

### What is "Intraday" batching?
Closing batches multiple times a day (e.g., every 6 hours) to speed up funding or align with shift changes.

### Why did my batch fail?
Often due to a single malformed transaction signature or an interruption during the upload handshake.
