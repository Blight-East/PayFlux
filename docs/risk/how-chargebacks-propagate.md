# Chargeback Propagation

Up: [Dispute Infrastructure](../pillars/dispute-infrastructure.md)
See also:
- [Dispute Evidence](./how-dispute-evidence-works.md)
- [How Refunds and Reversals Propagate](./how-refunds-and-reversals-propagate.md)
- [Handling Dispute Surges](../use-cases/handling-dispute-surges.md)

## Definition
Chargeback Propagation is the multi-step journey of a dispute from the Cardholder's Bank (Issuer) -> Card Network -> Acquiring Bank -> Processor -> Merchant. It is a slow, asynchronous message chain that often takes weeks to complete.

## Why it matters
Latency and Forecasting. You might receive a chargeback notification 45 days after the sale. This "Blind Spot" means your current risk models are always fighting the war from last month. Understanding the lag is critical for accurate forecasting and modeling the exposure tail.

## Signals to monitor
- **TC40 / SAFE Reports**: Early fraud warnings sent by the network days before the actual chargeback lands.
- **Retrieval Requests**: "Soft inquiries" from the bank asking for details, often a precursor to a chargeback.
- **Dispute Webhooks**: Real-time pings from the processor when a dispute officially enters the system.
- **Lag Metrics**: Measuring "Days to Dispute" (Sale Date vs Dispute Date) to calculate exposure probability.

## Breakdown modes
- **Evidence Timeout**: Failing to respond within strict timeframes (usually 14-20 days), leading to automatic loss.
- **Double Refund**: Refunding a customer *after* a chargeback has already arrived, resulting in losing funds twice.
- **Representment Failure**: Submitting illegible or irrelevant evidence that is auto-rejected by network systems.
- **Financial Reconciliation Gaps**: Debited funds for disputes not being correctly credited back after a representment win.

## Implementation notes
Observability should track win rates by reason code and correlate representment efforts with financial outcomes to ensure the system reflects the true state of disputes.

## Upstream Causes
Chargeback propagation is driven by:
- clustered dispute events
- delayed issuer responses
- shared traffic patterns
- model generalization
- threshold-based enforcement

Propagation begins when localized disputes are treated as global signals.


## Downstream Effects
Propagation leads to:
- elevated fraud scores
- reserve growth
- account-level penalties
- traffic suppression
- portfolio-wide risk reclassification

It transforms individual disputes into systemic risk.


## Common Failure Chains
**Dispute Cluster → Model Shift → Threshold Trigger**

**Issuer Spike → Portfolio Risk Increase**

**Refund Delay → Chargeback Wave → Enforcement Escalation**

These chains explain how disputes scale beyond their original transactions.


## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Chargeback Propagation?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Chargeback Propagation is the multi-step journey of a dispute from the Cardholder's Bank to the Card Network, Acquiring Bank, Processor, and finally the Merchant."
      }
    },
    {
      "@type": "Question",
      "name": "Why does Chargeback Propagation take so long?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Because it involves multiple financial institutions and network layers, each with their own processing times and manual review requirements."
      }
    },
    {
      "@type": "Question",
      "name": "Can I stop a chargeback once it has propagated?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Once a chargeback is filed, it must play out through the representment process. You can only prevent them via refunds *before* the filing occurs."
      }
    },
    {
      "@type": "Question",
      "name": "Who decides the outcome of a chargeback?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The Issuing Bank (the customer's bank) acts as the judge in chargeback disputes, which is why the system often feels biased towards cardholders."
      }
    }
  ]
}
</script>
