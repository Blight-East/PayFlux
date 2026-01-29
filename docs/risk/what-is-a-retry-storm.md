# What is a Retry Storm?

Up: [Retry Logic & Storms](mechanics-retry-logic-and-storms.md)
See also:
- [How Retry Storms Form](../how-it-works/how-retry-storms-form.md)
- [What is Retry Amplification?](what-is-retry-amplification.md)

## Definition
A Retry Storm is a feedback failure in which automated transaction retries amplify system load and risk instead of resolving the underlying error. It occurs when a persistent failure condition (e.g., a gateway outage) triggers a flood of retries that encounter the same failure, creating an exponential growth in volume.

## Why it matters
System-Wide Incidents. Retry storms convert localized failures into systemic outages. They can overload gateways, crash fraud models, and flood dispute systems. Furthermore, the massive volume of failing transactions can trigger automated network enforcement actions or reserve increases.

## Signals to monitor
- **Exponential Volume Growth**: A rapid, non-linear increase in transaction attempts during a known failure window.
- **Fail-to-Retry Ratio**: A high percentage of failures that immediately trigger one or more follow-on attempts.
- **Non-Idempotent Request Spikes**: Duplicated requests for the same order ID that risk double-charging customers.
- **Upstream Latency Correlation**: Increased response times from processors that are caused by the volume of retries.

## Breakdown modes
- **Non-Idempotent Storms**: Multiple retries for the same purchase resulting in multiple authorizations on a cardholder's account.
- **Cascading Failures**: A small outage in one component (e.g., an address verification tool) triggering a retry storm that then crashes the primary payment gateway.
- **Latent Failure Persistence**: Systems continuing to retry transactions for hours after a "Hard Failure" has been confirmed by the issuer.

## Where observability fits
Observability detects the "Storm Signature" before it reaches the network. By identifying the characteristic exponential growth in retry attempts, system administrators can manually pause automated workflows or trigger an infrastructure-wide "Circuit Breaker" to save the Merchant ID.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is a retry storm?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A retry storm is a feedback failure where automated retries multiply failed transactions, increasing risk and load instead of resolving errors."
      }
    },
    {
      "@type": "Question",
      "name": "Why do retry storms happen?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "They happen when systems are programmed to retry without a 'Back-off' period or without checking if the underlying failure condition has changed."
      }
    },
    {
      "@type": "Question",
      "name": "Are retry storms dangerous?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. They can result in account freezes, heavy fines for 'Excessive Retries,' and a total collapse of the payment infrastructure."
      }
    }
  ]
}
</script>
