<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Risk Growth Correlation",
  "description": "The \"Growth Risk Paradox\" is the strong causal link between rapid revenue scaling and payment risk incidents. To an algorithmic risk model, a sudden spike in sales looks identical to fraud.",
  "about": "Risk Growth Correlation",
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
      "name": "What is Risk Growth Correlation?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The \"Growth Risk Paradox\" is the strong causal link between rapid revenue scaling and payment risk incidents. To an algorithmic risk model, a sudden spike in sales (Success) looks identical to a \"Bust-Out\" fraud attack (Crime)."
      }
    },
    {
      "@type": "Question",
      "name": "Why does Risk Growth Correlation matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Success is dangerous. Merchants are often shocked to find their funds frozen *because* they had their best sales month ever. The processor sees new volume as \"Untested Risk\" or uncollateralized exposure."
      }
    }
  ]
}
</script>

This page is part of the Payment Risk Mechanics series and serves as the primary reference for this topic.

Up: [Payment Risk Events](../pillars/payment-risk-events.md)
See also: [Risk Detection Infrastructure](./mechanics-risk-detection-infrastructure.md), [Merchant Underwriting](./how-merchant-underwriting-works.md)

# Risk Growth Correlation

## Definition
The "Growth Risk Paradox" is the strong causal link between rapid revenue scaling and payment risk incidents. To an algorithmic risk model, a sudden spike in sales (Success) looks identical to a "Bust-Out" fraud attack (Crime).

## Why It Matters
Success is dangerous.
- **Punishment for Growth**: Merchants are often shocked to find their funds frozen *because* they had their best sales month ever.
- **Uncollateralized Exposure**: The processor sees the new volume as "Untested Risk." They do not know if you are shipping the product or running a Ponzi scheme.
- **Velocity Traps**: Scaling from $10k/mo to $100k/mo triggers hard velocity limits set during onboarding.

## Signals to Monitor
- **Velocity Limit Usage**: "Percent of Monthly Cap Used." (Danger zone: >80%).
- **Average Ticket Drift**: Sudden changes in AOV (e.g., selling $500 items when history shows $50).
- **Geo Expansion**: New volume coming from a "High Risk" country unexpected by the underwriter.
- **Acceleration**: The derivative of growth (how *fast* the curve is rising).

## How It Breaks Down
- **Velocity Freeze**: Hitting the hard processing cap, causing all subsequent transactions to fail (Technical Downtime).
- **Protective Reserve**: Processor imposing a 25% hold to cover the "New, Risky" volume.
- **Verification Loop**: Processing paused while the risk team requests invoices to prove the sales are legitimate.

## How Risk Infrastructure Surfaces This
An observability system would surface these mechanics by:
- **Capacity Planning**: Predicting when the velocity cap will be hit to request increases *in advance*.
- **Cohort Analysis**: Proving that the "New Traffic" performs just as well (low disputes) as the "Old Traffic."
- **Exposure Modeling**: Calculating the processor's "Funds at Risk" perspective to anticipate their anxiety.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Why do they freeze my money just because I sold more?
Because if those new sales turn out to be fraud/non-delivery, the processor is liable for the refunds. They hold the collateral until the operational risk is proven low.

### How do I prevent this?
Communication. Tell your account manager *before* you launch a viral campaign or big promo.

### Is it personal?
No. It is a math equation calculating "Potential Loss."
