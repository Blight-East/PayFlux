<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Retry Logic and Storms",
  "description": "The automated mechanics of recovering failed payments. Includes Smart Retries (legitimate recovery), Retry Amplification (multiplier effect), and Retry Storms (self-reinforcing failure loops).",
  "about": "Retry Logic and Storms",
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
      "name": "What is Retry Logic?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The automated mechanics of recovering failed payments. It ranges from Smart Retries (algorithmic scheduling) to Retry Storms (self-reinforcing failure loops)."
      }
    },
    {
      "@type": "Question",
      "name": "Why does Retry Logic matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Network Compliance and Infrastructure Health. Visa/Mastercard equate \"High Retry Rates\" with \"Brute Force Attacks.\" A buggy retry loop looks like a fraud ring, leading to instant blocking."
      }
    }
  ]
}
</script>

This page is part of the Payment Risk Mechanics series and serves as the primary reference for this topic.

Up: [Payment System Observability](../pillars/payment-system-observability.md)
See also: [Risk Thresholds and Hysteresis](./mechanics-risk-thresholds-and-hysteresis.md), [Transaction Monitoring](./how-transaction-monitoring-works.md)

# Retry Logic and Storms

## Definition
The automated mechanics of recovering failed payments.
- **Smart Retries**: The legitimate algorithmic scheduling of attempts to recover "Soft Declines" (e.g., Insufficient Funds).
- **Retry Amplification**: The multiplier effect where a single legitimate transaction spawns multiple failed retries, inflating the error rate seen by the network.
- **Retry Storm**: A self-reinforcing failure loop where system outages trigger aggressive retries, causing a DoS effect and massive fee accumulation.

## Why It Matters
Network Compliance and Infrastructure Health.
- **The "Velocity" Trap**: Visa/Mastercard equate "High Retry Rates" with "Brute Force Attacks." A buggy retry loop looks exactly like a fraud ring, leading to instant Merchant ID (MID) blocking.
- **Self-Inflicted Wounds**: Aggressive retries during an outage can crash your own services (Self-DoS) and rack up thousands of dollars in "Auth Fees" for failed attempts.

## Signals to Monitor
- **Amplification Factor**: `Total Attempts / Unique Orders`. (Target: ~1.1. Danger: > 2.0).
- **Recovery Rate**: The % of retries that actually succeed. (If < 5%, the logic is too aggressive/useless).
- **Error Consistency**: Seeing the same error code (e.g., `503 Service Unavailable`) repeating rapidly (Signature of a storm).
- **Decline Code Mix**: Retrying `Lost/Stolen` (Hard Decline = Illegal) vs `Insufficient Funds` (Soft Decline = Legal).

## How It Breaks Down
- **Rule Violation**: Retrying a card >15 times in 30 days, triggering fines.
- **The Hammer**: A buggy loop retrying 100 times in 1 second.
- **Cross-PSP Leak**: Retrying a blocked card on Stripe, then Adyen, then PayPal, maximizing exposure across the ecosystem.
- **Timeout Mismatch**: Client times out at 5s, Gateway takes 6s. Client retries. Gateway processes 2 requests for 1 result.

## How Risk Infrastructure Surfaces This
An observability system would surface these mechanics by:
- **Circuit Breakers**: Detecting when the Amplification Factor spikes and auto-killing the retry worker ("Stop the line").
- **Cost Estimation**: Real-time ticker of "Wasted Fees" ($0.05 per fail) to quantify the financial bleed of a storm.
- **Shape Detection**: Alerting on the "slope" of retry volume to differentiate organic traffic from a bot/storm.
- **Safe Recovery**: enforcing "Exponential Backoff" (waiting 1s, 2s, 4s, 8s) to let downstream systems recover.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### When is it safe to retry?
Only on "Soft Declines" (Insufficient Funds, Network Error). NEVER on "Hard Declines" (Lost/Stolen, Account Closed).

### Does Stripe/Adyen handle this?
They offer "Smart Retries," but if you build your own retry layer *on top* of theirs, you can easily trigger a ban.

### What is a Retry Storm?
A feedback loop: Failure -> Retry -> More Load -> More Failure.

### Can I retry a "Do Not Honor" code?
Generally no. It is a catch-all rejection that usually implies a Hard Decline.
