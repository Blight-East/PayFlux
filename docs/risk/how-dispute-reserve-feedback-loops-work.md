# Dispute-Reserve Feedback Loops

Up: [Payment Reserves & Balances](mechanics-payment-reserves-and-balances.md)
See also:
- [Chargeback Propagation](how-chargebacks-propagate.md)
- [Dispute Infrastructure](../pillars/dispute-infrastructure.md)
- [How Negative Balance Cascades Form](./how-negative-balance-cascades-form.md)
- [How Payout Delays Work](./how-payout-delays-work.md)

## Definition
A Feedback Loop is a dangerous "Death Spiral" where a risk action (like a Reserve) worsens the very metric it monitors (Disputes). The chain reaction typically follows: Reserve -> Cash Flow Crunch -> Service Failure -> Customer Anger -> More Disputes -> Higher Reserve.

## Why it matters
Survival. A feedback loop can destroy a healthy business in as little as 60 days. Identifying the loop early allows for communication with the processor for a "Release Valve" before the operational collapse becomes irreversible.

## Signals to monitor
- **Lead Time Correlation**: Spikes in "Item Not Received" disputes lagging 2-3 weeks behind a Reserve increase.
- **Vendor Payment Health**: Tracking unpaid invoices to suppliers as a leading indicator of fulfillment failure.
- **Refund Failures**: Spikes in "Insufficient Funds" errors when attempting to refund customers (often because the reserve locked the available balance).
- **Quality Divergence**: Degradation in shipping speed or app uptime specifically following a financial constraint.

## Breakdown modes
- **The Liquidity Trap**: Having capital in the reserve but not in the bank, leading to an inability to fulfill goods, which triggers more chargebacks.
- **The Refund Block**: Attempting to resolve customer anger by refunding, only to have the processor block the refund because the available balance is zero.
- **The Causality Spiral**: Visualizing how Event A (Reserve) directly leads to Event B (Dispute Spike) through operational constraint.
- **Cash Flow Exhaustion**: "Runway" alerts indicating how many days of operations remain before current burn and reserve rates cease functionality.

## Implementation notes
Breaking the loop usually requires injecting external capital to fulfill existing orders while the processor holds revenue, or reducing sales volume to lower the absolute reserve amount.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is a Dispute-Reserve Feedback Loop?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A Feedback Loop is a dangerous 'Death Spiral' where a risk action (like a Reserve increase) creates operational constraints that lead to more customer disputes."
      }
    },
    {
      "@type": "Question",
      "name": "Why does a Dispute-Reserve Feedback Loop matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Survival. Without early identification and intervention, a feedback loop can lead to business insolvency in a very short window."
      }
    },
    {
      "@type": "Question",
      "name": "How do I break the loop?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Breaking the loop requires injecting outside capital to fulfill orders while the processor holds funds, or pausing sales to reduce the absolute reserve liability."
      }
    },
    {
      "@type": "Question",
      "name": "Will the processor help?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Rarely. Processors often view the spiral as confirmation of insolvency rather than a structural side effect of their own risk controls."
      }
    }
  ]
}
</script>
