# Compliance Timing Gaps

Up: [Payment Risk Events](../pillars/payment-risk-events.md)
See also:
- [Payout Delays](./how-payout-delays-work.md)
- [Merchant Underwriting](./how-merchant-underwriting-works.md)

## Definition
A Compliance Timing Gap is the dangerous window between "Money Moving" and "Risk Checking." It occurs when instant payments outpace asynchronous compliance checks (KYC/AML), leaving the platform exposed to regulatory violations.

## Why it matters
Liability. If a sanctioned entity moves money on your platform, you are liable even if you ban them shortly after. The violation occurred the moment the money moved. Regulators punish the *gap*.

## Signals to monitor
- **Time-to-Review**: Average minutes between User Signup and Compliance Decision.
- **Gap Volume**: Total dollars processed by users in the "Pending Review" state.
- **Enforcement Lag**: Time between clicking "Ban" and the user being blocked in the database.
- **Vendor Latency**: Response times from IDV providers (e.g., Persona, Checkr).
- **Exposure Meter**: Cumulative value flowing through unverified user paths.

## Breakdown modes
- **Instant Payouts**: Releasing funds before KYC signals are finalized.
- **Queue Overload**: Manual review backlogs extending the gap from minutes to days.
- **Fail-Open**: System defaulting to "Allowed" when compliance APIs are unreachable.
- **State Integrity Failures**: Users reaching enabled payout states without verified signals.

## Implementation notes
Observability provides operational clarity to navigate these gaps, but it does not override processor or network controls. Synchronous blocking checks are required for high-velocity or high-value movement.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is a Compliance Timing Gap?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A Compliance Timing Gap is the dangerous window between 'Money Moving' and 'Risk Checking.' It occurs when instant payments outpace asynchronous compliance checks."
      }
    },
    {
      "@type": "Question",
      "name": "Why do Compliance Timing Gaps matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Liability. Regulators punish the gap because a violation occurs the moment money moves, regardless of later account actions."
      }
    },
    {
      "@type": "Question",
      "name": "Can I do checks later?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "For low amounts, sometimes. But for high velocity or payouts, checks must be blocking (synchronous)."
      }
    },
    {
      "@type": "Question",
      "name": "What is 'Fail-Open' vs 'Fail-Closed'?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Fail-Closed means the system denies transactions if verification is unavailable, while Fail-Open allows them, creating potential exposure."
      }
    }
  ]
}
</script>
