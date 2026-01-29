# How Retry Logic Affects Risk

Up: [Retry Amplification](mechanics-retry-amplification.md)
See also:
- [How Retry Amplification Increases Exposure](./how-retry-amplification-increases-exposure.md)
- [What is a Retry Storm?](./what-is-a-retry-storm.md)

## Definition
Retry Logic Risk is the danger inherent in automated payment recovery systems. While retrying failed payments is a standard revenue recovery tactic (Smart Dunning), doing it incorrectly violates network rules regarding "Excessive Retries" and provides valuable data to sophisticated card testers.

## Why it matters
Compliance vs. Revenue. Merchants must recover the small percentage of failed payments that are salvageable (e.g., Insufficient Funds) without triggering the security alarms designed to catch the majority that are fraud or hard declines. It is a game of precision balancing.

## Signals to monitor
- **Recovery Rate**: The percentage of retry attempts that actually result in a successful authorization.
- **Retry Interval**: The specific time wait between consecutive attempts (e.g., 1 day vs. 3 days).
- **Decline Code Mix**: Monitoring whether retries are occurring on "Soft" codes (allowable) vs. "Hard" codes (prohibited).
- **Issuer Reputation**: Tracking changes in approval rates for new customers that might be linked to noisy retry traffic.

## Breakdown modes
- **Network Rule Violation**: Retrying a single card more than 15 times in a 30-day window (exceeding standard Visa/MC limits).
- **Information Leakage**: Allowing fraudsters to "ping" cards repeatedly to determine if they are active, effectively turning the retry engine into a testing tool.
- **Reputation Damage**: Issuers lowering a merchant's overall approval rate because their total traffic is dominated by failing retry attempts.

## Where observability fits
Observability provides safety audits and schedule optimization. By scanning logs for illegal retry patterns and identifying the optimal "Payday" timing for retries, merchants can maximize recovered revenue while staying within strict network compliance boundaries.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "When should I retry a failed payment?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Only on 'Soft Declines' such as Insufficient Funds or temporary Network Errors. Never retry a 'Stolen Card' or 'Closed Account' signal."
      }
    },
    {
      "@type": "Question",
      "name": "What is a standard retry schedule?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A typical 'Smart Dunning' schedule involves attempts on Day 1, Day 3, Day 7, and Day 14."
      }
    },
    {
      "@type": "Question",
      "name": "Does Stripe handle this automatically?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Stripe 'Smart Retries' uses machine learning to optimize timing, but merchants are still liable for compliance if they implement their own custom logic on top."
      }
    }
  ]
}
</script>
