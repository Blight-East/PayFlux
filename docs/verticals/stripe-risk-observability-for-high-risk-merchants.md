<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Stripe: Risk Observability for High-Risk Merchants",
  "description": "Navigating Stripe's prohibited businesses list and monitoring requirements for high-risk verticals (Travel, Ticking, Crypto).",
  "about": "Stripe High-Risk Observability",
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
      "name": "Why is my business considered 'High Risk'?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "High Risk usually means 'High Chargeback Probability' or 'Regulatory Complexity'. Industries like Travel (future delivery), Events (cancellation risk), and Dropshipping (quality control) are structurally prone to disputes."
      }
    },
    {
      "@type": "Question",
      "name": "Does Stripe allow crypto?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Stripe has specific support for Crypto Onramps/Offramps but strictly prohibits 'Unregulated' exchanges or Initial Coin Offerings (ICOs). You must have explicit approval and use specific APIs."
      }
    },
    {
      "@type": "Question",
      "name": "What triggers a TMF (MATCH) listing?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The TMF (Terminated Merchant File) or MATCH list is a blacklist used by Mastercard. You are added if you are terminated for excessive chargebacks (>1%) or illegal activity (money laundering). Being on this list makes it nearly impossible to get a merchant account anywhere."
      }
    }
  ]
}
</script>

# Stripe: Risk Observability for High-Risk Merchants

## Definition
High-Risk Observability is for merchants in "Grey Zone" industries—Travel, Ticketing, Nutraceuticals, Adult, or Crypto. These industries are allowed (sometimes restricted) but operate under a microscope. The goal is **Compliance Survival**. You must prove to Stripe (and the banks) that you are controlling the inherent risks of your model.

## Why It Matters
Sudden Death. For a high-risk merchant, a single spike in disputes or a single report of illegal activity results in immediate account closure with no appeal. Unlike low-risk merchants who get warnings ("Please fix this"), high-risk merchants get termination notices ("We are ending our relationship"). Observability is the only way to see the cliff before you fall off.

## Signals to Monitor
*   **Chargeback-to-Transaction Ratio**: Must be monitored Daily (not Monthly).
*   **Fulfillment Latency**: The gap between `charge.succeeded` and "Product Delivered". Long gaps (e.g., Pre-orders) increase risk.
*   **Refund Volume**: High refunds are often a precursor to high chargebacks.
*   **3DS Utilization**: Ensuring 3D Secure is active on 100% of high-value transactions to shift liability.
*   **Average Ticket Size (ATS)**: Detecting sudden jumps. A specific alert for any transaction > 2x the average.

## How It Breaks Down
1.  **The Pivot**: A ticketing platform (High Risk) launches a new "Festival" event.
2.  **The Hype**: They sell $1M in tickets in 24 hours.
3.  **The Flag**: Stripe's velocity algorithms see a massive spike in volume vs. history.
4.  **The Hold**: Stripe pauses payouts to ensure the Festival actually happens (Delivery Risk).
5.  **The Cancel**: The Festival is cancelled due to weather.
6.  **The Rush**: 10,000 customers demand refunds.
7.  **The Collapse**: If funds are held/missing, these turn into chargebacks. Stripe closes the account and holds the reserve for 120 days.

## How Risk Infrastructure Surfaces This
Observability builds the "Defense Case":

*   **Proof of Fulfillment**: Programmatically uploading tracking numbers to Stripe to prove delivery.
*   **Reserve Modeling**: Calculating the "Worst Case" refund liability to ensure enough cash is on hand.
*   **Velocity Throttling**: Intentionally slowing down sales velocity to stay within approved limits.
*   **Dispute Early Warning**: Integrating with services (like Ethoca/Verifi) to intercept disputes at the bank level before they reach Stripe.

> [!NOTE]
> Observability does not override processor or network controls. Being "High Risk" is a classification, not a punishment. It means you must be *better* at operations than a low-risk merchant. Transparency with the processor is key.

## FAQ

### Why is my business considered "High Risk"?
High Risk usually means "High Chargeback Probability" or "Regulatory Complexity". Industries like Travel (future delivery), Events (cancellation risk), and Dropshipping (quality control) are structurally prone to disputes.

### Does Stripe allow crypto?
Stripe has specific support for Crypto Onramps/Offramps but strictly prohibits "Unregulated" exchanges or Initial Coin Offerings (ICOs). You must have explicit approval and use specific APIs.

### What triggers a TMF (MATCH) listing?
The TMF (Terminated Merchant File) or MATCH list is a blacklist used by Mastercard. You are added if you are terminated for excessive chargebacks (>1%) or illegal activity (money laundering). Being on this list makes it nearly impossible to get a merchant account anywhere.

Up: [Payment System Observability](../pillars/payment-system-observability.md)
See also: [High-Risk Merchants (General)](../verticals/payment-risk-observability-for-high-risk-merchants.md), [Settlement Batching](../risk/mechanics-settlement-batching.md), [Account Freezes & Holds](../risk/mechanics-account-freezes-and-holds.md)
