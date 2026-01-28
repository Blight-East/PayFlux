<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Stripe: Understanding Decline Reason Codes",
  "description": "Decoding Stripe's decline codes. Mapping 'generic_decline', 'do_not_honor', and 'insufficient_funds' to actionable recovery strategies.",
  "about": "Stripe Decline Codes",
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
      "name": "What does 'do_not_honor' mean?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "It is the bank's way of saying 'No' without finding a specific reason. It stands for 'Do Not Honor This Request'. It often implies a high-risk score, a restriction on the card, or a temporary fraud hold."
      }
    },
    {
      "@type": "Question",
      "name": "Can I retry a 'generic_decline'?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sparingly. A generic decline is a soft decline, but repeated attempts will likely fail and hurt your reputation. The best strategy is to ask the customer to call their bank, or try a different card."
      }
    },
    {
      "@type": "Question",
      "name": "Why are correct CVCs being declined?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "If the CVC is correct but the transaction fails with 'incorrect_cvc' or similar, it might be due to Issuer Velocity limits or a mismatch in the billing address (AVS) that overrides the CVC match."
      }
    }
  ]
}
</script>

# Stripe: Understanding Decline Reason Codes

## Definition
Decline Reason Codes are the specific messages returned by the Issuer (Bank) explaining why a transaction failed. Stripe normalizes the thousands of raw bank codes into a clean set of strings (e.g., `insufficient_funds`, `lost_card`, `do_not_honor`). Understanding these is the key to optimizing authorization rates.

## Why It Matters
Actionability. You cannot fix "It Failed." You *can* fix "It Failed because the Zip Code matched but the Street Address didn't." Categorizing declines allows you to build "Smart Retry" logic—retrying technical errors while suppressing hard blocks. This boosts revenue (recovering false positives) and protects reputation (stopping abuse).

## Signals to Monitor
*   **Hard vs. Soft Declines**:
    *   **Hard** (`stolen_card`, `lost_card`, `expired_card`): Never retry.
    *   **Soft** (`insufficient_funds`, `generic_decline`, `network_error`): Retry with caution or schedule for later.
*   **The Big Three**:
    1.  `insufficient_funds`: Customer is broke. Strategy: Dunning (email them).
    2.  `do_not_honor`: Bank is suspicious. Strategy: Ask customer to call bank.
    3.  `generic_decline`: Ambiguous failure. Strategy: Mild retry.
*   **AVS/CVC Mismatches**: `incorrect_cvc`, `incorrect_zip`. High rates here indicate user error or bot attacks.
*   **Radar Blocks**: `fraudulent` (Stripe blocked it, not the bank). This is an internal configuration signal.

## How It Breaks Down
1.  **The Transaction**: Customer submits payment.
2.  **The Gate**: Stripe checks basic format (Luhn check).
3.  **The Shield**: Stripe Radar assesses risk. If high, block (Decline: `fraudulent`).
4.  **The Network**: Request goes to Visa/Mastercard.
5.  **The Issuer**: Capital One checks balance.
    *   If $0 balance -> Decline: `insufficient_funds`.
    *   If weird IP -> Decline: `do_not_honor`.
6.  **The Response**: Stripe maps the bank's ISO 8583 code to a string.

## How Risk Infrastructure Surfaces This
Observability decodes the cryptographic silence of banks:

*   **Decline Pareto Chart**: Showing that 80% of your value loss comes from just 2 codes (e.g., `insufficient_funds`).
*   **Smart Dunning**: Triggering different email sequences based on the code.
    *   Code: `insufficient_funds` -> "Please top up your card or use a different one."
    *   Code: `do_not_honor` -> "Your bank blocked this. Please call them to authorize."
*   **Bin-Level Performance**: Identifying that "Chase Sapphire" cards have a higher `do_not_honor` rate on your subscription product than "Wells Fargo" cards.
*   **Gateway Error Monitoring**: Alerting on `processing_error` spikes, which indicate Stripe/Network outages rather than cardholder issues.

> [!NOTE]
> Observability does not override processor or network controls. Providing a reason code does not change the outcome. You cannot "override" a `do_not_honor`. The bank has the final say.

## FAQ

### What does `do_not_honor` mean?
It is the bank's way of saying "No" without finding a specific reason. It stands for "Do Not Honor This Request". It often implies a high-risk score, a restriction on the card, or a temporary fraud hold.

### Can I retry a `generic_decline`?
Sparingly. A generic decline is a soft decline, but repeated attempts will likely fail and hurt your reputation. The best strategy is to ask the customer to call their bank, or try a different card.

### Why are correct CVCs being declined?
If the CVC is correct but the transaction fails with `incorrect_cvc` or similar, it might be due to Issuer Velocity limits or a mismatch in the billing address (AVS) that overrides the CVC match.

Up: [Payment System Observability](../pillars/payment-system-observability.md)
See also: [Understanding Decline Reason Codes (General)](../risk/understanding-decline-reason-codes.md), [Issuer Decline Spikes](./stripe-detecting-issuer-decline-spikes.md), [Card Network Rules](../risk/mechanics-card-network-rules.md)
