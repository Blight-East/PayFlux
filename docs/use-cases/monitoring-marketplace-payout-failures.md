# Marketplace Payout Failures

## Definition
Payout Failure Monitoring tracks the rejection of outbound transfers from a marketplace to its sellers. Unlike inbound payments (cards), outbound payments (ACH/Connect) fail due to banking errors, compliance blocks, or risk holds.

## Why it matters
Seller Trust. If a seller doesn't get paid, they stop selling. Frequent payout failures churn supply. Additionally, failed payouts often signal that a seller has been flagged by the banking system (AML freeze).

## Signals to monitor
- **Failure Reason Codes**: `invalid_account_number`, `account_closed`, `no_account`.
- **Blocked Transfers**: Payouts with status `blocked` or `canceled` by the platform.
- **Return Rates**: The % of payouts sent that bounce back.
- **Dormancy**: Active sellers with *no* payout method attached.

## Breakdown modes
- **Typo Friction**: Sellers entering the wrong routing number (most common).
- **Sanctions Hit**: Payout blocked because the name matches a OFAC list entry.
- **Platform Insolvency**: Payout failing because the platform's FBO account is empty.

## Where observability fits
- **Error Translation**: Converting cryptographic bank error codes into plain English ("You typed the account number wrong").
- **Proactive Validation**: Alerting sellers to fix info *before* the payout cycle runs.
- **Risk Correlation**: "This seller's payout failed AND they have high disputes. Investigate."

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### What is a "Return?"
When the receiving bank accepts the ACH initially but sends it back 2 days later (e.g., "Account Frozen").

### Why do verified accounts fail?
Accounts can close, freeze, or change limits at any time. Verification is a point-in-time check.

### Who pays the return fee?
Usually the platform. Returns cost money ($2-$15).

## See also
- [Marketplaces](../verticals/payment-risk-observability-for-marketplaces.md)
- [Monitoring Settlement Failures](./monitoring-settlement-failures.md)
- [Compliance Timing Gaps](../risk/how-compliance-timing-gaps-form.md)
