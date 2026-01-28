<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Stripe: Risk Observability for Marketplaces",
  "description": "Managing multi-party risk on Stripe Connect. Monitoring seller performance, liable dispute rates, and platform account health.",
  "about": "Stripe Marketplace Observability",
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
      "name": "Who is liable for disputes in Stripe Connect?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "It depends on the charge type. With 'Destination Charges' (Standard/Express), the Connected Account is liable. With 'Direct Charges' (Standard), the Connected Account is liable. But with 'Separate Charges and Transfers', the Platform (You) is liable."
      }
    },
    {
      "@type": "Question",
      "name": "What is the 'Platform Limit' for disputes?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Stripe monitors the aggregate dispute rate of your entire platform. Even if individual sellers are small, if your *total* platform volume has a 1% dispute rate, Stripe may shut down the platform account itself."
      }
    },
    {
      "@type": "Question",
      "name": "How do I handle a fraudulent seller?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You must use the 'Reject' endpoint to ban the connected account immediately. You should also reverse their payouts if possible and refund the buyers to prevent chargebacks."
      }
    }
  ]
}
</script>

# Stripe: Risk Observability for Marketplaces

## Definition
Marketplace Observability (using Stripe Connect) tracks risk across a **Graph** of sub-accounts (`connected_accounts`). Unlike a single merchant, a marketplace has "Seller Risk" (Will the seller deliver?) and "Buyer Risk" (Will the buyer pay?). The Platform sits in the middle, creating liability for both.

## Why It Matters
Contagion. One "Toxic Seller" running a scam can spike the dispute rate for the entire platform. If the platform's aggregate dispute rate breaches 1%, the entire platform (and all good sellers) can lose processing abilities. Additionally, "Negative Balance Liability" means if a seller scams users and withdraws the cash, the Platform is often responsible for covering the refunds.

## Signals to Monitor
*   **Platform-Wide Dispute Rate**: The weighted average of disputes across all connected accounts.
*   **Top Offender list**: Ranking sellers by dispute count. (e.g., "Seller A has 50% of our total disputes").
*   **Negative Balance Exposure**: Total amount of money owed by sellers to the platform (due to chargebacks exceeding their balance).
*   **Onboarding Velocity**: Spikes in new seller signups (often bot-driven seller fraud loops).
*   **Payout Failures**: High rates of payout failures to sellers can indicate money laundering blocks or fake bank accounts.
*   **Cross-Linkages**: Sellers sharing IP addresses, bank accounts, or device fingerprints (Collusion).

## How It Breaks Down
1.  **The Setup**: A fraudster creates a Seller Account and lists fake iPhones for $500.
2.  **The Bait**: They buy their own items using stolen credit cards (or lure real victims).
3.  **The Cash Out**: The sales process. The fraudster requests an "Instant Payout" to a debit card.
4.  **The Escape**: They vanish with the cash.
5.  **The Aftermath**: Real cardholders dispute the charges.
6.  **The Bag**: The seller account goes negative (-$50,000). The Platform is liable. Stripe debits the Platform's bank account to cover the loss.

## How Risk Infrastructure Surfaces This
Observability maps the "Network":

*   **Graph Visualization**: Linking sellers by shared attributes (IP, Device, Bank).
*   **De-Risking Triggers**: Alerting when a new seller processes >$5k in their first week (Velocity Anomaly).
*   **Hold Logic**: Implementing "Payout Delays" dynamically for new sellers based on risk score.
*   **Liability Forecasting**: Predicting the "Value at Risk" based on pending disputes vs. seller balances.

> [!NOTE]
> Observability does not override processor or network controls. If a seller steals the money and runs, improved observability just tells you exactly how much you lost. Controls (Delaying Payouts) are required to prevent the loss.

## FAQ

### Who is liable for disputes in Stripe Connect?
It depends on the charge type. With "Destination Charges" (Standard/Express), the Connected Account is liable. With "Direct Charges" (Standard), the Connected Account is liable. But with "Separate Charges and Transfers", the Platform (You) is liable.

### What is the "Platform Limit" for disputes?
Stripe monitors the aggregate dispute rate of your entire platform. Even if individual sellers are small, if your *total* platform volume has a 1% dispute rate, Stripe may shut down the platform account itself.

### How do I handle a fraudulent seller?
You must use the "Reject" endpoint to ban the connected account immediately. You should also reverse their payouts if possible and refund the buyers to prevent chargebacks.

Up: [Payment System Observability](../pillars/payment-system-observability.md)
See also: [Marketplaces (General)](../verticals/payment-risk-observability-for-marketplaces.md), [Marketplaces with Escrow](../verticals/payment-risk-observability-for-marketplaces-with-escrow.md), [Monitoring Payout Delays](../use-cases/stripe-monitoring-payout-delays.md)
