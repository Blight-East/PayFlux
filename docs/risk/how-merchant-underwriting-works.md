# Merchant Underwriting

## Definition
Merchant Underwriting is the risk assessment process performed by processors and acquiring banks to evaluate a business's eligibility for payment accounts. It analyzes creditworthiness, business model risk, and fraud exposure both at onboarding and continuously throughout the relationship.

## Why it matters
Underwriting defines the "terms of service" for a merchant: how fast they get paid, how much they can process, and what fees they pay. It is not a one-time gate; "Periodic Review" means underwriting can intervene years into a relationship if risk factors change.

## Signals to monitor
- **Account Status**: Flags like `pending_review`, `active`, or `rejected`.
- **Information Requests**: Urgent demands for invoices, tracking numbers, or identity documents.
- **Processing Limits**: Errors indicating "Volume Limit Exceeded" or "Ticket Size Limit Exceeded."
- **Category Codes**: The assigned MCC (Merchant Category Code) which dictates network rules.

## Breakdown modes
- **MCC Drift**: A merchant changing what they sell (e.g., T-shirts to Crypto) without notifying the processor, triggering a violation.
- **Volume Shock**: Processing significantly more than the "Estimated Monthly Volume" declared at onboarding.
- **Document Rejection**: Automated systems failing to parse a valid PDF invoice.

## Where observability fits
- **Status Monitoring**: Alerting immediately when an account enters a review state.
- **Limit Tracking**: Visualizing current volume against approved underwriting caps.
- **Change Detection**: Audit logging modification to business details that might trigger re-underwriting.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Why are they reviewing me again?
Underwriting is continuous. Triggers include sudden growth, dispute spikes, or even routine annual compliance checks.

### Can I speed up the review?
Only by providing exactly the documents requested as fast as possible. Support tickets rarely expedite the queue.

### What is a "Match" list?
The TMF (Terminated Merchant File) or MATCH list is a shared database where processors blacklist merchants who were terminated for high risk. Being on this list makes getting a new account nearly impossible.

## See also
- [KYC and Underwriting Reviews](./how-kyc-and-underwriting-reviews-work.md)
- [MCC Drift](./how-mcc-drift-affects-underwriting.md)
- [Compliance Timing Gaps](./how-compliance-timing-gaps-form.md)
