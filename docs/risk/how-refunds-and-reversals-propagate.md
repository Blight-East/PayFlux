# How Refunds and Reversals Propagate

Up: [Dispute Infrastructure](../pillars/dispute-infrastructure.md)
See also:
- [How Chargebacks Propagate](./how-chargebacks-propagate.md)
- [How Dispute Evidence Works](./how-dispute-evidence-works.md)

## Definition
Refund and Reversal Propagation is the asynchronous journey of a credit transaction from the Merchant -> Processor -> Card Network -> Issuing Bank -> Customer's Account. While a Sale is often authorized in seconds, a Refund can take 5–10 business days to fully settle and reflect on a cardholder's statement.

## Why it matters
The "Trust Gap." Customers often contact support because they don't see their refund immediately. If a merchant cannot "prove" the refund has propagated to the Network, the customer may file a "Duplicate" chargeback, leading to the merchant losing the funds twice.

## Signals to monitor
- **Refund Status**: API flags like `pending`, `succeeded`, or `failed`.
- **ARN (Acquirer Reference Number)**: The unique ID generated once a refund hits the Card Network. This is the only "Proof of Propagation."
- **Settlement Lag**: The time between a refund being triggered and the funds being debited from the merchant's balance.

## Breakdown modes
- **The Double Refund**: Refunding a customer via the dashboard *after* they have already filed a chargeback for the same transaction.
- **Insufficient Funds**: A refund failing because the merchant's available processor balance (or linked bank account) is empty.
- **Card Expiry**: Attempting to refund a card that has been cancelled or expired, requiring a move to "Alternative Refund" methods (Check/ACH).

## Where observability fits
Observability provides "Lifecycle Transparency." By fetching and surfacing the ARN (Acquirer Reference Number) for every refund, the system allows support agents to give customers deterministic proof that the money has left the merchant and is currently with the user's bank.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Why do refunds take 5-10 days?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Because they involve batch processing across multiple legacy banking systems (ACH/Network clearing) that only move funds on business days."
      }
    },
    {
      "@type": "Question",
      "name": "Can I cancel a refund?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Usually no. Once a refund is 'Succeeded' in the API, it has been sent to the Network and cannot be clawed back."
      }
    },
    {
      "@type": "Question",
      "name": "What is an ARN?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The Acquirer Reference Number is a unique tracking ID that allows a customer's bank to locate a specific refund within their system."
      }
    }
  ]
}
</script>
