<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Stripe: Detecting Card Testing Attacks",
  "description": "How to identify and mitigate high-velocity card testing (carding) attacks on Stripe integration points.",
  "about": "Stripe Card Testing",
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
      "name": "Does Stripe block card testing automatically?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Stripe Radar blocks many obvious attacks, but sophisticated 'low-and-slow' attacks or attacks on valid donation pages often get through. You are responsible for monitoring your own integration endpoints."
      }
    },
    {
      "@type": "Question",
      "name": "Do I pay fees for declined card testing transactions?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Stripe typically does not charge a processing fee for declined transactions, BUT authorization requests still cost resources and can damage your reputation with the card networks (Visa/Mastercard)."
      }
    },
    {
      "@type": "Question",
      "name": "What is the best defense against card testing?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "CAPTCHA. Adding a challenge (like Turnstile or reCAPTCHA) to your checkout flow is the single most effective way to stop bot-driven card testing."
      }
    }
  ]
}
</script>

# Stripe: Detecting Card Testing Attacks

## Definition
Card Testing (or "Carding") on Stripe occurs when fraudsters use your payment form programmatically to test thousands of stolen credit card numbers. They are not trying to buy your product; they are trying to determine which cards are valid ("live") so they can sell them on the dark web or use them for high-value purchases elsewhere.

## Why It Matters
Reputation and Cost. Even if the transactions fail, a sudden spike of 10,000 declines in an hour ruins your standing with the card networks. It signals that your merchant integration is insecure. Extreme cases lead to the "Excessive Decline Program" fines ($25,000+) or immediate termination of your Stripe account.

## Signals to Monitor
*   **Auth Velocity**: A sudden exponential increase in `payment_intent.created` events.
*   **Low-Value Clustering**: A high volume of transactions for very small amounts ($1.00, $0.50) or "Donation" amounts.
*   **Decline Rate Spike**: A shift from a 5% decline rate to a 90%+ decline rate.
*   **CVC Errors**: A disproportionate number of `incorrect_cvc` decline codes (bots guessing variability).
*   **IP Diversity (or Lack thereof)**: Thousands of requests coming from a single ASN (e.g., a VPN provider) or a rotating residential proxy network.
*   **Guest Checkout**: Attacks almost always target unauthenticated "Guest" flows rather than logged-in user flows.
*   **Zip Code Mismatches**: A high rate of `address_zip_check: fail` signals data that is being guessed.

## How It Breaks Down
1.  **The Recon**: A botprobes your donation page or $1 trial signup to see if it requires CAPTCHA.
2.  **The Flood**: The script activates, sending 50 requests per second.
3.  **The Smoke**: Your Stripe dashboard lights up with "High Risk" blocked payments (if Radar is on) or success/fail noise.
4.  **The Damage**: Even if blocked, your decline rate skyrockets. If *succeeded*, you now have 500 small charges that will ALL turn into chargebacks when the real cardholders notice.
5.  **The Dispute Bomb**: 2 weeks later, the 500 "proven live" cards generate 500 disputes. Even if the amount is $1, the dispute fee is $15. Total loss: $7,500.

## How Risk Infrastructure Surfaces This
Observability moves defense from "Manual Refresh" to "Automated Shield":

*   **Velocity Governors**: Middleware that tracks `requests_per_ip_per_minute` and imposes hard limits (e.g., 5 attempts / 10 mins).
*   **Fingerprinting**: Identifying distinct devices independent of IP address to catch distributed botnets.
*   **Bin Attack Detection**: Alerting when a single BIN (e.g., a specific Bank in Brazil) accounts for >80% of traffic suddenly.
*   **Session Analysis**: Flagging checkout sessions that complete in < 500ms (too fast for humans).

> [!NOTE]
> Observability does not override processor or network controls. Detection is not Prevention. You must implement CAPTCHA or rate limiting at your application edge (Cloudflare/WAF) to actually stop the traffic.

## FAQ

### Does Stripe block card testing automatically?
Stripe Radar blocks many obvious attacks, but sophisticated "low-and-slow" attacks or attacks on valid donation pages often get through. You are responsible for monitoring your own integration endpoints.

### Do I pay fees for declined card testing transactions?
Stripe typically does not charge a processing fee for declined transactions, BUT authorization requests still cost resources and can damage your reputation with the card networks (Visa/Mastercard).

### What is the best defense against card testing?
CAPTCHA. Adding a challenge (like Turnstile or reCAPTCHA) to your checkout flow is the single most effective way to stop bot-driven card testing.

Up: [Payment Risk Events](../pillars/payment-risk-events.md)
See also: [Detecting Card Testing (General)](../use-cases/detecting-card-testing-attacks.md), [Transaction Monitoring](../risk/how-transaction-monitoring-works.md), [Card Testing vs. Velocity Fraud](../use-cases/differentiating-card-testing-from-velocity-fraud.md)
