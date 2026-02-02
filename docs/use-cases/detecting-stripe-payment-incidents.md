<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Detecting Stripe Incidents",
  "description": "Stripe Incident Detection is the monitoring of account capability status. Stripe (and other aggregators) can programmatically restrict processing, payouts, or both based on automated risk assessments.",
  "about": "Detecting Stripe Incidents",
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
      "name": "What is Stripe Incident Detection?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Stripe Incident Detection is the monitoring of account capability status. Stripe (and other aggregators) can programmatically restrict processing, payouts, or both based on automated risk assessments."
      }
    },
    {
      "@type": "Question",
      "name": "Why does Stripe Incident Detection matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Speed. If Stripe disables your payouts, you have hours to respond before cash flow affects operations. If they disable processing, your business is effectively offline. Detecting this via API (vs waiting for an email) allows for instant reaction."
      }
    }
  ]
}
</script>

Up: [Payment System Observability](../pillars/payment-system-observability.md)
See also: [Cross-PSP Failures](./detecting-cross-psp-failures.md), [Payment Incident Detection (Mechanics)](../risk/payment-incident-detection.md)

# Detecting Stripe Incidents

## Definition
Stripe Incident Detection is the monitoring of account capability status. Stripe (and other aggregators) can programmatically restrict processing, payouts, or both based on automated risk assessments.

## Why it matters
Speed. If Stripe disables your payouts, you have hours to respond before cash flow affects operations. If they disable processing, your business is effectively offline. Detecting this via API (vs waiting for an email) allows for instant reaction.

## Signals to monitor
- **Account Capabilities**: The API status of `card_payments` (inactive/active) and `transfers` (inactive/active).
- **Webhook Events**: `account.updated`, `payout.failed`, `radar.early_fraud_warning.created`.
- **Error Codes**: Spikes in `account_invalid` or `sending_limit_exceeded`.

## Breakdown modes
- **Payout Suspension**: You can process sales, but you can't withdraw the money (common in KYC reviews).
- **Processing Kill**: Total inability to charge cards (common in fraud spikes).
- **Reserve Imposition**: Silent addition of a 25% reserve to the account.

## Where observability fits
- **State Change Alerts**: "Alert: Payouts Disabled at 14:02 UTC."
- **Evidence Timeline**: correlating the restriction with a recent deploy or volume spike.
- **Multi-Account View**: Seeing which specific connected account is affected in a marketplace.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Why did they ban me?
Usually automated. Common triggers: sudden volume spike, high dispute rate, or matching a bad actor on a blacklist.

### How do I appeal?
Dashboards usually have a generic form. Best path: Reply to the email with structured data (tracking numbers, invoices) proving legitimacy.

### Can PayFlux unban me?
No. PayFlux alerts you to the ban so you can act fast.

## See also
- [Detecting Cross-PSP Failures](./detecting-cross-psp-failures.md)
- [Payment Risk Events](../pillars/payment-risk-events.md)
- [Merchant Underwriting](../risk/how-merchant-underwriting-works.md)
