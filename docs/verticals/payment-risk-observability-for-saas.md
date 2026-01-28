# SaaS Platforms

## Definition
SaaS Risk Observability focuses on the health of recurring revenue streams. It deals less with "Fraud" (stolen cards) and more with "Churn" (expired cards, insufficiency funds, and friendly fraud).

## Why it matters
The "Silent Churn" killer. A 5% failure rate on renewals compounds monthly, destroying LTV. Additionally, aggressive retrying of these failures can trigger network blocks.

## Signals to monitor
- **Renewal Success Rate**: The % of subscriptions that charge successfully on the first attempt.
- **Auth Decline Mix**: The ratio of "Soft Declines" (Insufficient Funds) vs "Hard Declines" (Lost/Stolen).
- **Dunning Recovery**: The % of failed payments recovered via email prompts or retry logic.
- **Vintage Retention**: How newer cohorts perform compared to older ones.

## Breakdown modes
- **Auth Rot**: Card tokens ("saved cards") expiring because they haven't been used in 12+ months.
- **Retry Storms**: Internal billing logic retrying a failed card every hour, triggering velocity bans.
- **Chargeback Lag**: Users cancelling by calling their bank instead of clicking "Unsubscribe."

## Where observability fits
- **Decline Classification**: differentiating between "Customer broke" vs "System broke."
- **Win-Back Tracking**: Measuring the effectiveness of dunning emails.
- **Forecasting**: Predicting cash flow based on the expiration dates of saved cards.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Why do renewals fail?
Over 15% of cards change every year (expire, lost, reissued). SaaS models must constantly update payment details.

### What is Friendly Fraud in SaaS?
"I forgot to cancel." The user subscribed, used the service, forgot about it, and then disputed the renewal charge as "Unauthorized."

### Should I auto-update cards?
Yes. Use "Account Updater" services (via Stripe/Adyen) to automatically refresh expired card numbers.

## See also
- [Subscription Businesses](./payment-risk-observability-for-subscription-businesses.md)
- [Retry Logic](../risk/how-retry-logic-affects-risk.md)
- [Refund Abuse Patterns](../risk/how-refund-abuse-patterns-work.md)
