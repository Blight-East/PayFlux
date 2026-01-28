<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Stripe: Risk Observability for Aggregators",
  "description": "Risk management for PayFacs and Aggregators on Stripe. Monitoring sub-merchant underwriting, MCC drift, and shadow risk.",
  "about": "Stripe Aggregator Observability",
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
      "name": "What is Shadow Risk?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Shadow Risk is the accumulation of sub-merchant risk that is invisible to the master account until it explodes. For example, a sub-merchant changing their business model from 'T-Shirts' (Low Risk) to 'Tech Support' (High Risk) without notifying the platform."
      }
    },
    {
      "@type": "Question",
      "name": "How does 'MCC Drift' happen?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "MCC Drift occurs when a merchant's actual processing behavior (average ticket size, chargeback rate) deviates from the norms of their assigned Merchant Category Code. It signals either fraud or a pivot to a prohibited line of business."
      }
    },
    {
      "@type": "Question",
      "name": "Can I be fined for my sub-merchants' actions?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. As an Aggregator/Platform, you are principally liable for the compliance of your sub-merchants. Card networks will assess BMAP (Business Monitoring Assessment Program) fines against YOU, not the sub-merchant."
      }
    }
  ]
}
</script>

# Stripe: Risk Observability for Aggregators

## Definition
Aggregator (or PayFac) Observability deals with the risk of **Portfolio Management**. You are not just processing payments; you are underwriting other businesses. The core challenge is "Know Your Customer's Customer" (KYCC) and detecting when a harmless-looking sub-merchant turns into a liability.

## Why It Matters
Existential Compliance. Aggregators operate under strict "Sponsored Merchant" agreements with Stripe. If you allow prohibited businesses (e.g., adult content, gambling, illegal pharma) to onboard, you violate the Terms of Service. Stripe will shut down your *entire* platform to protect their license. You are the first line of defense.

## Signals to Monitor
*   **MCC Consistency**: Does the merchant's website match their `mcc` code? (e.g., MCC 5732 "Electronics Store" vs. a website selling Consulting Services).
*   **Volume Anomalies**: A sub-merchant suddenly processing 10x their self-reported "Expected Monthly Volume".
*   **Ticket Size Drift**: A "Coffee Shop" processing $500 transactions.
*   **Geo-Mismatch**: A US-based merchant processing 90% of cards from Nigeria or Vietnam.
*   **Descriptor Randomness**: Sub-merchants constantly changing their `statement_descriptor` to evade detection.

## How It Breaks Down
1.  **The Onboarding**: A bad actor signs up as a "Web Design Agency" (Low Risk).
2.  **The Sleeper**: They process small, legitimate transactions for 3 months to build trust.
3.  **The Pivot**: They switch the backend to process payments for a tech support scam.
4.  **The Bust-Out**: They process $100k in 48 hours.
5.  **The Withdrawal**: They payout the funds via Instant Payouts.
6.  **The Crash**: The disputes roll in. The merchant account is empty. The Platform is liable for the $100k.

## How Risk Infrastructure Surfaces This
Observability automates "Continuous Underwriting":

*   **Drift Detection**: Alerting when the "Actual" behavior deviates from the "Underwritten" profile by > 2 sigma.
*   **Website Crawling**: Periodically re-scanning the merchant's URL to check for keywords associated with prohibited items.
*   **Velocity Caps**: Enforcing dynamic limits that grow with account age (e.g., "New accounts capped at $1k/day").
*   **Cross-Portfolio Matching**: Checking if a banned merchant is trying to sign up again with a different email but same device fingerprint.

> [!NOTE]
> Observability does not override processor or network controls. Detection allows you to freeze the account *before* the money leaves. Once the payout is sent, observability is just a post-mortem tool.

## FAQ

### What is Shadow Risk?
Shadow Risk is the accumulation of sub-merchant risk that is invisible to the master account until it explodes. For example, a sub-merchant changing their business model from "T-Shirts" (Low Risk) to "Tech Support" (High Risk) without notifying the platform.

### How does "MCC Drift" happen?
MCC Drift occurs when a merchant's actual processing behavior (average ticket size, chargeback rate) deviates from the norms of their assigned Merchant Category Code. It signals either fraud or a pivot to a prohibited line of business.

### Can I be fined for my sub-merchants' actions?
Yes. As an Aggregator/Platform, you are principally liable for the compliance of your sub-merchants. Card networks will assess BMAP (Business Monitoring Assessment Program) fines against YOU, not the sub-merchant.

Up: [Payment System Observability](../pillars/payment-system-observability.md)
See also: [Aggregators (General)](../verticals/payment-risk-observability-for-aggregators.md), [MCC Drift](../risk/how-mcc-drift-affects-underwriting.md), [Shadow Risk Accumulation](../risk/how-shadow-risk-accumulates.md)
