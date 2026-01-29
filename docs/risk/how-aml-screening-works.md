# How AML Screening Works

Up: [Payment Risk Events](../pillars/payment-risk-events.md)
See also: [KYC and Underwriting](./how-kyc-and-underwriting-reviews-work.md)

## Definition
AML (Anti-Money Laundering) Screening is the automated process of checking transactions and account holders against global sanctioned lists (OFAC, UN, SDNs) and Politically Exposed Persons (PEPs). It identifies "Bad Actors" before they can use the financial system to move illicit funds.

## Why it matters
Legal Survival. Violating AML laws is a criminal offense, not just a contractual one. If you process a transaction for a sanctioned entity, you are liable for massive fines and loss of your processing license. It is the "Hard Gate" of the financial world.

## Signals to monitor
- **Name Match Probability**: The % similarity between a user's name and a sanctioned entity.
- **Geographic Proximity**: Transactions originating from or destined for high-risk/sanctioned regions.
- **Velocity Spikes**: Sudden, unexplained jumps in transaction frequency or volume that mimic laundering patterns.
- **Structural Anomaly**: Small, repetitive transactions designed to stay under reporting thresholds (Structuring).

## Breakdown modes
- **The False Match**: A legitimate user sharing a name with a criminal (e.g., "John Smith"), triggering a manual review.
- **Outdated Lists**: Using a screening vendor that lags behind OFAC updates.
- **Parsing Failures**: Automated systems missing a match due to special characters or transliteration errors (e.g., "Cyrano" vs "Kyrano").

## Where observability fits
Observability provides an audit trail of "When" and "Why" someone was screened, allowing you to prove compliance to regulators and track the "Review Queue" length to prevent operational bottlenecks.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is AML Screening?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "AML Screening is the process of checking users and transactions against global watchlists to prevent illicit money movement."
      }
    },
    {
      "@type": "Question",
      "name": "Is screening mandatory?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. It is a legal requirement for any entity that moves or handles money."
      }
    },
    {
      "@type": "Question",
      "name": "What happens if there is a match?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The transaction is usually paused or frozen, and a manual review (SAR filing) may be required."
      }
    }
  ]
}
</script>
