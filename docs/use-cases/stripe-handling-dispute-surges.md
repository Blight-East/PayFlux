<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Stripe: Handling Dispute Surges",
  "description": "Managing rapid increases in chargebacks on Stripe. Navigating the Dispute Monitoring Programs (VFMP) and evidence submission strategies.",
  "about": "Stripe Dispute Surges",
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
      "name": "What is the Stripe dispute threshold?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Use 0.75% as your 'Red Alert' line. Visa's Standard Monitoring Program starts at 0.9%, and the Excessive program starts at 1.8%. Stripe may take action on your account well before 0.9% to protect their own standing."
      }
    },
    {
      "@type": "Question",
      "name": "Does refunding a charge prevent a dispute?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Only if done BEFORE the dispute is filed. Once a cardholder initiates a chargeback, refunding the charge does not count as a 'win' and does not remove the stain from your dispute ratio. It effectively admits guilt."
      }
    },
    {
      "@type": "Question",
      "name": "How long do I have to respond to a Stripe dispute?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Typically 7-21 days, depending on the card network. However, you should respond as fast as possible. Missing the deadline results in an automatic loss (Default Judgment)."
      }
    }
  ]
}
</script>

# Stripe: Handling Dispute Surges

## Definition
A Dispute Surge is a rapid acceleration in the volume or ratio of incoming chargebacks. On Stripe, this tracks the `dispute.created` webhook. Surges are often delayed consequences of events that happened 30-60 days ago (e.g., a bad marketing campaign, a shipping failure, or a fraud attack).

## Why It Matters
Existential Threat. Card networks (Visa/Mastercard) hold payment processors (like Stripe) liable for merchant behavior. If your dispute rate exceeds 1% (1 dispute per 100 transactions), you enter the "Monitoring Programs" (VFMP/ECP). These come with fines ($25,000/month), unable-to-fight disputes, and usually result in Stripe closing your account to protect themselves.

## Signals to Monitor
*   **Dispute Count & Ratio**: The absolute number of disputes vs. total sales count. (Risk is measured by Count, not Dollar Volume).
*   **Early Fraud Warnings (EFW)**: Exploring `radar.early_fraud_warning` events. These are notifications from the bank that a charge is *likely* to be disputed. They are the "Smoke" before the fire.
*   **Reason Code Mix**: A surge in `fraudulent` vs. `product_not_received`. The defense strategy differs completely.
*   **Vintage Analysis**: Tracking which *month of sales* the disputes are coming from. Is this an old issue (July sales) surfacing now, or a new issue (October sales)?
*   **Win Rate**: The % of disputes you are successfully overturning. A drop in win rate implies your evidence strategy is failing or the disputes are legitimate.

## How It Breaks Down
1.  **The Event**: You ship a batch of defective products in November.
2.  **The Lag**: Customers try to return them, but support is overwhelmed. They call their banks.
3.  **The EFW**: In December, you see a spice in Early Fraud Warnings.
4.  **The Surge**: In January, 50 chargebacks arrive in a single week.
5.  **The Threshold**: Your dispute rate hits 1.2%. Stripe places 100% of your funds in reserve.
6.  **The Termination**: If the rate doesn't drop in 30 days, the account is closed.

## How Risk Infrastructure Surfaces This
Observability fights the "Lag":

*   **Cohort Tracking**: visualizing dispute rates by *Transacted Month* rather than *Reported Month*. This highlights "Toxic Batches" immediately.
*   **EFW-to-Dispute Conversion**: Measuring how many warnings turn into real chargebacks. If high, it justifies auto-refunding EFWs.
*   **Auto-Response Logic**: Programmatically assembling evidence (Tracking Logs, IP logs, TOS signatures) to submit responses instantly, maximizing the win chance.
*   **Refund-to-Avoid**: A circuit breaker that auto-refunds "High Risk" transactions or EFWs to prevent them from becoming official disputes (preserving the ratio).

> [!NOTE]
> Observability does not override processor or network controls. Once a dispute is filed, the damage to the ratio is done. You cannot "un-file" a dispute. The only cure is Prevention (refunding before it happens) or Dilution (increasing good sales volume).

## FAQ

### What is the Stripe dispute threshold?
Use 0.75% as your "Red Alert" line. Visa's Standard Monitoring Program starts at 0.9%, and the Excessive program starts at 1.8%. Stripe may take action on your account well before 0.9% to protect their own standing.

### Does refunding a charge prevent a dispute?
Only if done **BEFORE** the dispute is filed. Once a cardholder initiates a chargeback, refunding the charge does not count as a "win" and does not remove the stain from your dispute ratio. It effectively admits guilt.

### How long do I have to respond to a Stripe dispute?
Typically 7-21 days, depending on the card network. However, you should respond as fast as possible. Missing the deadline results in an automatic loss (Default Judgment).

Up: [Dispute Infrastructure](../pillars/dispute-infrastructure.md)
See also: [Handling Dispute Surges (General)](../use-cases/handling-dispute-surges.md), [Monitoring Dispute Ratios](../use-cases/monitoring-dispute-ratios.md), [How Chargebacks Propagate](../risk/how-chargebacks-propagate.md)
