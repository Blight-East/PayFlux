<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Stripe: Detecting Issuer Decline Spikes",
  "description": "A guide to detecting and diagnosing sudden drops in authorization rates on Stripe caused by issuer outages or bank-specific blocks.",
  "about": "Stripe Issuer Decline Spikes",
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
      "name": "Why did my Stripe approval rate drop suddenly?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sudden drops are often caused by 'Issuer Outages' (e.g., Chase or Capital One having downtime) rather than your own fraud settings. If the decline code is 'do_not_honor' across many cards from the same bank, it is likely an external infrastructure issue."
      }
    },
    {
      "@type": "Question",
      "name": "Should I retry declined Stripe transactions immediately?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Retrying 'generic_decline' or 'do_not_honor' errors aggressively can trigger velocity blocks from card networks. You should only retry if you have a specific signal that the failure was technical (e.g., 'system_error') and after a backoff period."
      }
    },
    {
      "@type": "Question",
      "name": "How do I filter Stripe declines by bank?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You can monitor the 'issuer' field in the Charge object or use the Issuing Balance Transaction API if you are on Stripe Issuing. For standard payments, you must aggregate declines by the 'payment_method_details.card.issuer' field in your own observability layer."
      }
    }
  ]
}
</script>

# Stripe: Detecting Issuer Decline Spikes

## Definition
Issuer Decline Spikes are sudden, distinct increases in transaction failures originating from the cardholder's bank (the Issuer) rather than Stripe itself (the Gateway) or your fraud rules (Radar). Unlike broad outages, these spikes are often targeted at specific BINs (Bank Identification Numbers) or regions, masking themselves as general conversion drops.

## Why It Matters
Misdiagnosis leads to revenue loss. If you assume a decline spike is due to your fraud setting, you might loosen your rules, letting actual fraudsters in. If you assume it's a technical error and retry aggressively, you might get your merchant account flagged for "excessive retries" (a fineable offense). Distinguishing between "The Bank is Down" and "My Traffic is Bad" is critical for operational response.

## Signals to Monitor
*   **Approval Rate by BIN**: Grouping `charge.failed` events by `payment_method_details.card.brand` and `issuer`. A healthy issuer typically approves 85-95% of valid traffic. A drop to 20% indicates an outage.
*   **`do_not_honor` Velocity**: A spike in this specific code is the primary signature of an issuer-level block or outage.
*   **Geographic Concentration**: Declines spiking specifically for `US` cards or `GB` cards while other regions remain stable.
*   **Retry Success Rate**: If retries for a specific bank are failing 100% of the time, the issue is structural/technical.
*   **3DS Failure Rate**: A spike in `3d_secure_not_supported` or authentication timeouts often precedes authorization decline spikes.
*   **Latency Spikes**: Issuer systems often slow down (high TTI) before they start failing requests outright.
*   **Webhook Delays**: While not a direct decline signal, a lag in receiving `charge.failed` webhooks from Stripe can indicate upstream congestion.

## How It Breaks Down
1.  **The Silent Fail**: An issuer (e.g., a large regional bank) undergoes maintenance. Their system starts rejecting all foreign transactions with `do_not_honor`.
2.  **The Merchant Panic**: Your dashboard shows conversion dropping from 80% to 60%. You check Stripe Status, which says "All Systems Operational" (because Stripe is working fine).
3.  **The False Fix**: You disable "Block High Risk Payments" in Radar, thinking you are blocking good customers. This does nothing to fix the bank error but exposes you to card testing.
4.  **The Retry Storm**: Your automated billing engine sees the failures and retries all of them 3 times in 10 minutes.
5.  **The Network Block**: Visa/Mastercard notice the retry volume and flag your merchant ID for "Excessive Retries," potentially lowering your reputation score for *all* banks.

## How Risk Infrastructure Surfaces This
An observability layer sits on top of the raw payment stream to contextualize these failures:

*   **Pattern Recognition**: Alerting when *one specific BIN* deviates from its 30-day moving average, even if the global approval rate is stable.
*   **Error Code Histogram**: Visualizing the breakdown of `code` and `decline_code` to differentiate `insufficient_funds` (User Error) from `issuer_not_available` (System Error).
*   **State-Aware Retrying**: A "Circuit Breaker" state that prevents the billing engine from retrying cards belonging to a known-down issuer until the error rate normalizes.
*   **Stripe Radar Correlation**: distinguishing between declines where `outcome.type == 'blocked'` (Radar blocked it) vs `outcome.type == 'issuer_declined'` (Bank blocked it).

> [!NOTE]
> Observability does not override processor or network controls. If Stripe returns a hard decline, no amount of observability can force the transaction through. The goal is to stop *asking* for bad transactions, not to force them.

## FAQ

### Why did my Stripe approval rate drop suddenly?
Sudden drops are often caused by "Issuer Outages" (e.g., Chase or Capital One having downtime) rather than your own fraud settings. If the decline code is `do_not_honor` across many cards from the same bank, it is likely an external infrastructure issue.

### Should I retry declined Stripe transactions immediately?
No. Retrying `generic_decline` or `do_not_honor` errors aggressively can trigger velocity blocks from card networks. You should only retry if you have a specific signal that the failure was technical (e.g., `system_error`) and after a backoff period.

### How do I filter Stripe declines by bank?
You can monitor the `issuer` field in the Charge object or use the Issuing Balance Transaction API if you are on Stripe Issuing. For standard payments, you must aggregate declines by the `payment_method_details.card.issuer` field in your own observability layer.

Up: [Payment System Observability](../pillars/payment-system-observability.md)
See also: [Understanding Decline Reason Codes](./stripe-understanding-decline-reason-codes.md), [Retry Logic & Storms](../risk/mechanics-retry-logic-and-storms.md), [Card Network Rules](../risk/mechanics-card-network-rules.md)
