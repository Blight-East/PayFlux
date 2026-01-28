<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Manual Review Backlogs",
  "description": "A Manual Review Backlog is the accumulation of transactions held for human analysis. When the \"Inflow\" exceeds the \"Outflow,\" the queue grows, delaying revenue.",
  "about": "Manual Review Backlogs",
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
      "name": "What is a Manual Review Backlog?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A Manual Review Backlog is the accumulation of transactions held for human analysis. When the \"Inflow\" (new risky orders) exceeds the \"Outflow\" (analyst decisions), the queue grows, delaying revenue and checking customer patience."
      }
    },
    {
      "@type": "Question",
      "name": "Why does a Manual Review Backlog matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Latency kills conversion. If a legitimate customer waits 12 hours for approval, they will cancel and buy elsewhere. Conversely, rushing reviews leads to \"Rubber Stamping\" fraud."
      }
    }
  ]
}
</script>

Up: [Payment System Observability](../pillars/payment-system-observability.md)
See also: [Monitoring Settlement Failures](./monitoring-settlement-failures.md)

# Manual Review Backlogs

## Definition
A Manual Review Backlog is the accumulation of transactions held for human analysis. When the "Inflow" (new risky orders) exceeds the "Outflow" (analyst decisions), the queue grows, delaying revenue and checking customer patience.

## Why it matters
Latency kills conversion. If a legitimate customer waits 12 hours for approval, they will cancel and buy elsewhere. Conversely, rushing reviews leads to "Rubber Stamping" fraud.

## Signals to monitor
- **Queue Depth**: Total items pending review.
- **Oldest Item Age**: The "Max Latency" experienced by a customer.
- **Agent Velocity**: Decisions per hour per analyst.
- **Approval Rate**: The % of reviewed items approved (High = Rules too strict; Low = Rules too loose).

## Breakdown modes
- **Weekend Spike**: Queue exploding over Saturday/Sunday when staff is low.
- **Bot Attack**: Attackers flooding the queue with "borderline" transactions to hide real fraud.
- **Auto-Expire**: Authorizations timing out (voiding) before an agent can get to them.

## Where observability fits
- **Operational Health**: Dashboarding the "Heartbeat" of the risk team.
- **Rule Tuning**: "We are approving 99% of orders from Canada. Let's auto-approve Canada to clear the queue."
- **Staffing Triggers**: Alerting the lead when Queue Depth > 100.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### What is a good SLA?
< 1 hour during business hours. < 4 hours off-hours.

### Should I use manual review?
Only for high-ticket items. Manual review doesn't scale for low-value transactions.

### Can I automate this?
Yes. Feed the agent decisions back into the model to Train it.

## See also
- [Merchant Underwriting](../risk/how-merchant-underwriting-works.md)
- [Transaction Monitoring](../risk/how-transaction-monitoring-works.md)
- [Payment Risk Events](../pillars/payment-risk-events.md)
