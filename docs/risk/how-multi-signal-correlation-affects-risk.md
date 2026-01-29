# Multi-Signal Correlation

Up: [Payment Risk Scoring](./how-payment-risk-scoring-works.md)
See also: [Risk Detection Infrastructure](./mechanics-risk-detection-infrastructure.md), [Geo Velocity](./how-geo-velocity-affects-risk.md), [BIN/Country Mismatch](./how-bin-country-mismatch-affects-risk.md)

## Definition
Multi-Signal Correlation is the risk technique of combining multiple "Weak Signals" to form one "Strong Conviction." For example: (Foreign IP) + (High Value) + (New Device) = 99% Fraud. Any one of these alone might be a valid transaction; together, they indicate highly probable malicious intent.

## Why it matters
False Positive Reduction. Blocking all "Foreign IPs" or all "High Value" transactions kills valid sales and alienates your best customers. Blocking only the *intersection* of these signals (e.g., Foreign + High Value) allows you to accept more revenue safely while accurately targeting fraud.

## Signals to monitor
- **Device + Velocity**: A new device combined with high transaction frequency.
- **Bin + IP**: A UK-issued card being used from a Russian IP Address.
- **Email + Name**: Discrepancies between user identity and email reputation (e.g., "John Smith" using a burner email).
- **Correlation Matrix**: Frequency of specific signal combinations appearing in chargebacks.

## Breakdown modes
- **The Perfect Storm**: A legitimate user doing something unusual (e.g., buying a gift while traveling on a VPN) triggering all flags at once and resulting in an unfair block.
- **Blind Spots**: Having incomplete data (e.g., missing Device ID) that breaks the correlation link and allows fraud to pass.
- **Signal Decay**: Relying on outdated "Bad IP" or "Bad Email" lists that no longer reflect current fraud reality.

## Where observability fits
Observability provides rule tuning and explainability. By visualizing which signal combinations predict fraud most accurately, merchants can tune rules to maximize conversion and help support agents explain *why* a customer was blocked.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Multi-Signal Correlation?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "It is the technique of combining multiple 'weak' signals (like IP, location, and device) to create a high-confidence fraud conviction."
      }
    },
    {
      "@type": "Question",
      "name": "Why does Multi-Signal Correlation matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "It reduces false positives by only blocking transactions where multiple risk factors intersect, rather than blocking based on a single factor."
      }
    },
    {
      "@type": "Question",
      "name": "How many signals do I need?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Standard machine learning models use 100-200 features, while simple manual rules might use 3-5 key signals."
      }
    },
    {
      "@type": "Question",
      "name": "Can I verify suspicious signals?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. You can use 3D Secure or SMS verification to challenge the user. If they pass, the risk signals were likely a false positive."
      }
    }
  ]
}
</script>
