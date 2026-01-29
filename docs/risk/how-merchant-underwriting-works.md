# Merchant Underwriting

Up: [Payment Risk Events](../pillars/payment-risk-events.md)
See also: [KYC and Underwriting](./how-kyc-and-underwriting-reviews-work.md)
Up: [Why Processors Request Documents](why-processors-request-documents.md)
See also:
- [KYC and Underwriting Reviews](how-kyc-and-underwriting-reviews-work.md)
- [MCC Drift](how-mcc-drift-affects-underwriting.md)
- [Network Monitoring Programs](how-network-monitoring-programs-work.md)
Up: [How AML Screening Works](how-aml-screening-works.md)
See also:
- [KYC and Underwriting Reviews](how-kyc-and-underwriting-reviews-work.md)

## Definition
Merchant Underwriting is the risk assessment process performed by processors and acquiring banks to evaluate a business's eligibility for payment accounts. It analyzes creditworthiness, business model risk, and fraud exposure both at onboarding and continuously throughout the relationship.

## Why it matters
Underwriting defines the "terms of service" for a merchant: how fast they get paid, how much they can process, and what fees they pay. It is not a one-time gate; "Periodic Review" means underwriting can intervene years into a relationship if risk factors change. Risk Prevention is the goal—stopping bad actors before the processor becomes liable for their losses.

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
Observability provides status monitoring and limit tracking. By alerting when an account enters a review state or approaches approved underwriting caps, merchants can proactively manage their standing and document trails.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Merchant Underwriting?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Merchant Underwriting is the process of evaluating a business's creditworthiness and fraud risk *before* allowing them to process payments."
      }
    },
    {
      "@type": "Question",
      "name": "Why does Merchant Underwriting matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Risk Prevention. The goal is to stop bad actors at the door. Once a merchant is live, the processor is liable for their losses."
      }
    },
    {
      "@type": "Question",
      "name": "Why are they reviewing me again?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Underwriting is continuous. Triggers include sudden growth, dispute spikes, or even routine annual compliance checks."
      }
    },
    {
      "@type": "Question",
      "name": "Can I speed up the review?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Only by providing exactly the documents requested as fast as possible. Support tickets rarely expedite the queue."
      }
    },
    {
      "@type": "Question",
      "name": "What is a 'Match' list?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The TMF (Terminated Merchant File) or MATCH list is a shared database of blacklisted high-risk merchants."
      }
    }
  ]
}
</script>
