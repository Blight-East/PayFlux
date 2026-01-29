# BIN/Country Mismatch

Up: [Payment Risk scoring](./how-payment-risk-scoring-works.md)
See also: [Geo Velocity](./how-geo-velocity-affects-risk.md)

## Definition
A BIN/Country Mismatch occurs when the country of the issuing bank (identified by the first 6-8 digits of the card, the BIN) does not match the country where the transaction is originating (identified by the user's IP address). It is one of the highest-confidence "Weak Signals" in fraud detection.

## Why it matters
Fraud Correlation. Most people use cards issued in the country where they live. A "UK Card" being used on a "Russian IP" is statistically 10x more likely to be fraud than a local match. Blocking this intersection prevents massive losses while allowing local traffic to flow freely.

## Signals to monitor
- **IP Country**: The location associated with the user's internet connection.
- **BIN Country**: The home country of the bank that issued the credit card.
- **VPN/Proxy Bit**: Whether the user is attempting to hide their true IP location.

## Breakdown modes
- **The Expat/Traveler**: A legitimate user living abroad or on vacation being blocked because they are using their "Home" card on a "Foreign" IP.
- **VPN Mis-Routing**: A user's work VPN or privacy tool making it appear as though they are in a high-risk country.
- **Corporate Cards**: Employees of global companies using cards from a different regional headquarters than their physical location.

## Where observability fits
Observability allows you to visualize the "Distance" between BIN and IP. By mapping successful vs. fraudulent "Mismatches," you can tune thresholds to allow low-risk mismatches (e.g., US/Canada) while hard-blocking high-risk ones.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is a BIN/Country Mismatch?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "It is a discrepancy between the country where a card was issued and the country where the user is physical located during a purchase."
      }
    },
    {
      "@type": "Question",
      "name": "Should I block all mismatches?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. This would block legitimate travelers. You should use it as a signal to trigger secondary verification (like 3DS)."
      }
    },
    {
      "@type": "Question",
      "name": "How accurate is BIN data?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Very. BIN databases are maintained by the networks (Visa/MC) and are the source of truth for card origin."
      }
    }
  ]
}
</script>
