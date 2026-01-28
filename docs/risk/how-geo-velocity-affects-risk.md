<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Geographic Velocity",
  "description": "Geographic Velocity tracks the \"Speed of Travel\" of a card or identity. Identifying \"Impossible Travel\" (a card used in New York at 9am and London at 10am) is a primary method for detecting stolen credentials.",
  "about": "Geographic Velocity",
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
      "name": "What is Geographic Velocity?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Geographic Velocity tracks the \"Speed of Travel\" of a card or identity. Identifying \"Impossible Travel\" (a card used in New York at 9am and London at 10am) is a primary method for detecting stolen credentials."
      }
    },
    {
      "@type": "Question",
      "name": "Why does Geographic Velocity matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Botnets. Attackers use residential proxies to make it look like attacks are coming from 10,000 different houses. However, they often reuse the *same* card across these locations. Geo Velocity catches the card moving too fast."
      }
    }
  ]
}
</script>

Up: [Payment Risk Scoring](./how-payment-risk-scoring-works.md)
See also: [BIN/Country Mismatch](./how-bin-country-mismatch-affects-risk.md)

# Geographic Velocity

## Definition
Geographic Velocity tracks the "Speed of Travel" of a card or identity. Identifying "Impossible Travel" (a card used in New York at 9am and London at 10am) is a primary method for detecting stolen credentials.

## Why it matters
Botnets. Attackers use residential proxies to make it look like attacks are coming from 10,000 different houses. However, they often reuse the *same* card across these locations. Geo Velocity catches the card moving too fast.

## Signals to monitor
- **Locations per Card**: Count of distinct countries associated with a single PAN in the last hour.
- **Hopping Rate**: The calculated speed (mph) required to move between two transaction points.
- **IP Diversity**: The number of unique IPs used by a single User ID.

## Breakdown modes
- **VPN Jumping**: A user toggling their VPN server causes them to "teleport" across the globe.
- **Shared Credentials**: A Netflix account shared by a family in 3 different states triggers velocity alarms.
- **Tor Exit Nodes**: Traffic exiting from random global points.

## Where observability fits
- **Identity Graphing**: Linking disparate IPs to a single "Actor" based on device fingerprint.
- **Speed Limits**: Setting rules like "Max 2 countries per hour."
- **Allowlisting**: Exempting known corporate IPs or VPN gateways.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### How accurate is IP Geolocation?
Country-level is 99% accurate. City-level is ~80%. Street-level is unreliable.

### What about legitimate travel?
Legitimate travel takes time (hours). Fraud travel is instant (seconds).

### Can I block by Country?
Yes (Geo-Fencing). Many merchants block high-risk countries entirely to reduce noise.

## See also
- [BIN/Country Mismatch](./how-bin-country-mismatch-affects-risk.md)
- [Card Testing Attacks](../use-cases/detecting-card-testing-attacks.md)
- [Payment Risk Events](../pillars/payment-risk-events.md)
