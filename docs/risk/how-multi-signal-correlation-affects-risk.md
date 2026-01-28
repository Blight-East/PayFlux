<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Multi-Signal Correlation",
  "description": "Multi-Signal Correlation is the risk technique of combining multiple \"Weak\" signals to form one \"Strong\" conviction. (Foreign IP) + (High Value) + (New Device) = 99% Fraud.",
  "about": "Multi-Signal Correlation",
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
      "name": "What is Multi-Signal Correlation?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Multi-Signal Correlation is the risk technique of combining multiple \"Weak\" signals to form one \"Strong\" conviction.\n(Foreign IP) + (High Value) + (New Device) = 99% Fraud.\nAny one of these alone might be valid; together, they are damning."
      }
    },
    {
      "@type": "Question",
      "name": "Why does Multi-Signal Correlation matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "False Positive Reduction. Blocking all \"Foreign IPs\" kills valid travel sales. Blocking all \"High Value\" kills your best customers. Blocking only the *intersection* of Foreign + High Value allows you to accept more revenue safely."
      }
    }
  ]
}
</script>

Up: [Payment Risk Scoring](./how-payment-risk-scoring-works.md)
See also: [Risk Detection Infrastructure](./mechanics-risk-detection-infrastructure.md)

# Multi-Signal Correlation

## Definition
Multi-Signal Correlation is the risk technique of combining multiple "Weak" signals to form one "Strong" conviction.
(Foreign IP) + (High Value) + (New Device) = 99% Fraud.
Any one of these alone might be valid; together, they are damning.

## Why it matters
False Positive Reduction. Blocking all "Foreign IPs" kills valid travel sales. Blocking all "High Value" kills your best customers. Blocking only the *intersection* of Foreign + High Value allows you to accept more revenue safely.

## Signals to monitor
- **Device + Velocity**: New Device + High Velocity.
- **Bin + IP**: UK Card + Russian IP.
- **Email + Name**: "John Smith" + "xy837@protonmail.com".

## Breakdown modes
- **The Perfect Storm**: A legitimate user doing something weird (Buying a gift while traveling on a VPN) triggering all flags at once.
- **Blind Spots**: Having great IP data but no Device data, breaking the correlation link.
- **Signal Decay**: Relying on an old "Bad IP" list that has since been reassigned to a legitimate ISP.

## Where observability fits
- **Correlation Matrix**: Visualizing which signals appear together most often in chargebacks.
- **Rule Tuning**: "Signal A predicted fraud 50% of the time. Signal A+B predicted it 90% of the time."
- **Explainability**: Helping support agents explain *why* a customer was blocked. "It wasn't just the amount; it was the amount plus the location."

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### How many signals do I need?
Standard models use 100-200 features. Simple rules might use 3-5.

### Is correlation causation?
In fraud, usually yes. In credit risk, maybe not.

### Can I verify signals?
Yes. Use 3D Secure to challenge the user. If they pass, the "Risk Signals" were wrong.

## See also
- [Payment Risk Scoring](./how-payment-risk-scoring-works.md)
- [Geo Velocity](./how-geo-velocity-affects-risk.md)
- [BIN/Country Mismatch](./how-bin-country-mismatch-affects-risk.md)
