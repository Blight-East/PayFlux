<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Marketplaces with Escrow",
  "description": "Escrow Observability monitors funds held in intermediate states (FBO Accounts) between buyer capture and seller release. It focuses on trigger events like delivery confirmation.",
  "about": "Marketplaces with Escrow",
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
      "name": "What are Marketplaces with Escrow?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Escrow Observability monitors funds held in intermediate states (FBO Accounts) between buyer capture and seller release. It focuses on the trigger events—delivery confirmation, service completion—that unlock the movement of money."
      }
    },
    {
      "@type": "Question",
      "name": "Why does risk observability matter for Marketplaces with Escrow?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Escrow adds a \"Limbo State\" to payments. Funds are captured but not owned by anyone yet. Failure to monitor this state leads to \"Stuck Funds\" (never paid out) or \"Double Release\" (paying seller + refunding buyer)."
      }
    }
  ]
}
</script>

Up: [Payment System Observability](../pillars/payment-system-observability.md)
See also: [Marketplaces](./payment-risk-observability-for-marketplaces.md), [Aggregators](./payment-risk-observability-for-aggregators.md)

# Marketplaces with Escrow

## Definition
Escrow Observability monitors funds held in intermediate states (FBO Accounts) between buyer capture and seller release. It focuses on the trigger events—delivery confirmation, service completion—that unlock the movement of money.

## Why it matters
Escrow adds a "Limbo State" to payments. Funds are captured but not owned by anyone yet. Failure to monitor this state leads to "Stuck Funds" (never paid out) or "Double Release" (paying seller + refunding buyer).

## Signals to monitor
- **Held Balance Age**: How long specific transactions have been sitting in escrow (e.g., > 30 days).
- **Trigger Health**: The success rate of the API calls (e.g., Shipping Webhook) that fire releases.
- **Race Conditions**: Instances where a refund was requested *after* a payout trigger fired.
- **Ledger Integrity**: Verifying `Inflow == Held + Outflow`.

## Breakdown modes
- **Ghost Shipments**: Tracking APIs going down, leaving funds trapped in escrow indefinitely.
- **Dispute Leakage**: A buyer disputing while funds are held; the platform must ensure they don't *also* release funds to the seller.
- **Regulatory Drift**: Holding funds too long (e.g., > 90 days) can trigger money transmission compliance issues in some jurisdictions.

## Where observability fits
- **State Auditing**: Providing a timestamped log of exactly *why* funds moved (or didn't).
- **Stuck Fund Alerts**: flagging orders that have exceeded normal delivery windows.
- **Reconciliation**: Matching the FBO bank balance to the sum of internal ledger states.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Is escrow required?
Not always, but it builds trust. For services (like Upwork), it ensures work is done before payment.

### What happens if I release early?
You take the credit risk. If the buyer disputes later, you have no funds to claw back.

### Can PayFlux control the release?
No. PayFlux monitors the state of the funds. Your backend logic controls the release triggers.

## See also
- [Marketplaces](./payment-risk-observability-for-marketplaces.md)
- [Payment Reserves](../risk/what-is-a-payment-reserve.md)
- [Payout Delays](../risk/how-payout-delays-work.md)
