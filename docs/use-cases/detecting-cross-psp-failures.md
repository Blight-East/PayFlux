<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Cross-PSP Failures",
  "description": "Cross-PSP Detection identifies systemic payment failures that affect *multiple* processors simultaneously. It differentiates \"My Processor is down\" from \"The Card Network is down.\"",
  "about": "Cross-PSP Failures",
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
      "name": "What are Cross-PSP Failures?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Cross-PSP Detection identifies systemic payment failures that affect *multiple* processors simultaneously. It differentiates \"My Processor is down\" from \"The Card Network is down.\""
      }
    },
    {
      "@type": "Question",
      "name": "Why do Cross-PSP Failures matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Routing logic. If Stripe is down, you route to Adyen. If *Visa* is down, routing to Adyen is useless (and costs fees). Identifying the root scope prevents wasted retries and allows for accurate status page communication."
      }
    }
  ]
}
</script>

Up: [Payment System Observability](../pillars/payment-system-observability.md)
See also: [Detecting Stripe Incidents](./detecting-stripe-payment-incidents.md)

# Cross-PSP Failures

## Definition
Cross-PSP Detection identifies systemic payment failures that affect *multiple* processors simultaneously. It differentiates "My Processor is down" from "The Card Network is down."

## Why it matters
Routing logic. If Stripe is down, you route to Adyen. If *Visa* is down, routing to Adyen is useless (and costs fees). Identifying the root scope prevents wasted retries and allows for accurate status page communication.

## Signals to monitor
- **Global Error Sync**: Are `500` errors spiking on Stripe AND PayPal at the exact same second?
- **Issuer Correlation**: Are all processors declining `Chase` cards specifically?
- **Region Correlation**: Are all processors failing for `UK` IP addresses?

## Breakdown modes
- **3DS Outage**: The 3D Secure directory server goes down; all processors fail auths requiring challenge.
- **AWS East Outage**: Underlying cloud infra impacting multiple providers.
- **Bin Attack**: A global fraud attack hitting all your gateways at once.

## Where observability fits
- **Triangulation**: "Adyen is healthy. Stripe is failing. conclusion: Stripe Incident."
- **Status Page Independence**: Knowing about an outage 15 minutes before the provider updates their status page.
- **Smart Routing**: Auomatically disabling a specific path based on error rate.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### How common are Network outages?
Rare for the core network (Visa/MC). More common for edge services (3DS, Risk APIs).

### Should I retry on a different PSP?
Only if the error is "Gateway Error" or "Timeout." Never retry "Insufficient Funds" or "Do Not Honor" across PSPs (it looks like velocity fraud).

## See also
- [Payment Risk Events](../pillars/payment-risk-events.md)
- [Payment Service Providers](../verticals/payment-risk-observability-for-psps.md)
- [Retry Storms](../how-it-works/how-retry-storms-form.md)
