<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Issuer Decline Spikes",
  "description": "Issuer Decline Monitoring tracks the authorization performance of the Cardholder's Bank. It isolates declines caused by the Issuer from declines caused by the Gateway.",
  "about": "Issuer Decline Spikes",
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
      "name": "What are Issuer Decline Spikes?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Issuer Decline Monitoring tracks the authorization performance of the *Cardholder's Bank*. It isolates declines caused by the Issuer (Chase, Citi) from declines caused by the Gateway or Risk Engine."
      }
    },
    {
      "@type": "Question",
      "name": "Why do Issuer Decline Spikes matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Calibration. If your approval rate drops, you need to know *who* is rejecting you. If the ISSUER rejects, your traffic quality might be poor or they are having an outage."
      }
    }
  ]
}
</script>

Up: [Payment System Observability](../pillars/payment-system-observability.md)
See also: [Card Testing vs. Velocity Fraud](./differentiating-card-testing-from-velocity-fraud.md)

# Issuer Decline Spikes

## Definition
Issuer Decline Monitoring tracks the authorization performance of the *Cardholder's Bank*. It isolates declines caused by the Issuer (Chase, Citi) from declines caused by the Gateway or Risk Engine.

## Why it matters
Calibration. If your approval rate drops, you need to know *who* is rejecting you.
- If YOU reject (Risk Engine) -> Your rules are too strict.
- If GATEWAY rejects -> Configuration error.
- If ISSUER rejects -> Your traffic quality is poor (or they are having an outage).

## Signals to monitor
- **Approval Rate by BIN**: "Is Capital One declining us?"
- **Decline Reason Codes**: `do_not_honor`, `insufficient_funds`, `transaction_not_allowed`.
- **Global Error Rate**: Sudden spikes in `500` errors from the card network.

## Breakdown modes
- **Bin Attack**: A fraud attack using one specific bank's cards, causing that bank to block your MID completely.
- **MCC Mismatch**: Issuers blocking your specific Merchant Category Code (e.g., Crypto).
- **Protocol Failure**: 3D Secure failures causing issuers to soft-decline transactions.

## Where observability fits
- **Provider Redundancy**: "Stripe is seeing excessively high declines for Amex. Route Amex to Adyen."
- **Health Checks**: Distinguishing "It's a bad day for everyone" vs "It's a bad day for US."
- **Fraud Signal**: A sudden spike in "Insufficient Funds" often indicates a card testing attack (checking limits).

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### What does "Do Not Honor" mean?
"The bank doesn't like this, but won't tell you why." It is a catch-all generic decline.

### Can I retry an Issuer Decline?
Only once, if you suspect a technical error. Never retry repeatedly; you will get velocity banned.

### Why is my approval rate low?
Check your MCC, your formatting (AVS/CVV), and your fraud rate. Issuers block risky merchants.

## See also
- [Understanding Decline Reason Codes](../risk/understanding-decline-reason-codes.md)
- [Detecting Cross-PSP Failures](./detecting-cross-psp-failures.md)
- [Card Network Rule Changes](../how-it-works/how-card-network-rule-changes-affect-merchants.md)
