# How Geo-Velocity Affects Risk

Up: [Payment Risk Events](../pillars/payment-risk-events.md)
See also: [BIN/Country Mismatch](./how-bin-country-mismatch-affects-risk.md), [Transaction Monitoring](./how-transaction-monitoring-works.md)

## Definition
Geo-Velocity (or "Impossible Travel") is a risk metric that calculates the physical distance between two consecutive transactions using a single card or account. If the distance divided by the time elapsed exceeds the speed of a commercial aircraft (roughly 500mph), the second transaction is flagged as high-risk.

## Why it matters
High-Confidence Signal. Unlike IP reputation, which can be manipulated, physical math is harder to fake. A card swipe in New York followed 10 minutes later by a card swipe in London is 100% indicative of card data theft or a shared account. It is the gold standard for "Real-Time Block" rules.

## Signals to monitor
- **Delta-T**: The time elapsed between transactions.
- **Delta-D**: The Great Circle distance between the Two IP/Merchant locations.
- **Velocity Ratio**: Miles per Hour (MPH) or Km per Hour (KPH) of the "Traveler."

## Breakdown modes
- **The VPN Jump**: A legitimate user using a load-balanced VPN that switches from a US node to a European node in the middle of a session.
- **Family Sharing**: A parent in California and a student in Boston both using a shared family account simultaneously.
- **IP Inaccuracy**: Low-quality Geo-IP databases mislocating a user by hundreds of miles.

## Where observability fits
Observability visualizes the "Impossible Travel" trail. By mapping the velocity of your user base, you can set "Safety Buffers" (allowing for VPNs) while maintaining hard stops at the "Supersonic" threshold.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How accurate is Geo-IP?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Country-level is 99% accurate; City-level is roughly 80%. Street-level is unreliable for velocity math."
      }
    },
    {
      "@type": "Question",
      "name": "What about legitimate travel?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Legitimate travel takes hours. Fraud travel (Impossible Travel) happens in seconds or minutes."
      }
    },
    {
      "@type": "Question",
      "name": "Can I block by country entirely?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes (Geo-Fencing). Many merchants block high-risk countries to reduce the noise on their velocity rules."
      }
    }
  ]
}
</script>
