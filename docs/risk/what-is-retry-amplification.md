# What is Retry Amplification?

Up: [Retry Amplification](mechanics-retry-amplification.md)
See also:
- [How Retry Amplification Increases Exposure](how-retry-amplification-increases-exposure.md)
- [What is a Retry Storm?](./what-is-a-retry-storm.md)

## Definition
Retry amplification occurs when a payment failure causes multiple follow-on attempts that multiply system exposure rather than resolving the original error. It is a state of exponential growth in transaction volume caused by decentralized or incorrectly configured retry logic across clients and servers.

## Why it matters
The Multiplier Effect. Each retry represents a new transaction attempt that must be processed, risk-scored, and potentially disputed. If retries cluster in a narrow time window, they resemble "Card Testing" or a Brute-Force attack, triggering automatic upstream blocks that can shut down processing for a whole Merchant ID (MID).

## Signals to monitor
- **Unique-to-Total Attempt Ratio**: Calculating how many attempts are generated per unique customer order.
- **Retry Clustering**: Identifying high-density authorization attempts appearing in sub-second time windows.
- **Duplicate Authorization IDs**: Tracking whether multiple approvals are being generated for the same intent.
- **Dispute Exposure Expansion**: Measuring the potential financial loss if every retry in a cluster were to be disputed.

## Breakdown modes
- **Distributed Amplification**: Emergent behavior where the Client App, the Server SDK, and the Database Worker all retry a failure independently, turning 1 error into 3, 9, or 27 attempts.
- **Latent Failure Retrying**: Retrying transactions that have already failed due to a fundamental, non-recoverable error (e.g., Account Closed).
- **Infinite Loop SDKs**: Third-party libraries that continue to retry "Network Errors" without an exponential back-off or a maximum attempt count.

## Where observability fits
Observability provides visibility into the "Lifecycle of an Intent." By linking multiple transaction attempts to a single original User Intent, the system can identify exactly where in the stack amplification is occurring and flag specific code modules for emergency remediation.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Are all retries bad?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Controlled retries can recover 'Soft Declines' and improve revenue. Amplification occurs when those retries outpace the system's ability to recover."
      }
    },
    {
      "@type": "Question",
      "name": "Can retry amplification look like fraud?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. High-frequency retries for the same customer or card are a primary signature of card testing and enumeration attacks."
      }
    },
    {
      "@type": "Question",
      "name": "Is retry amplification always a software bug?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Often it is emergent behavior from distributed systems retrying independently, rather than a single 'buggy' line of code."
      }
    }
  ]
}
</script>
