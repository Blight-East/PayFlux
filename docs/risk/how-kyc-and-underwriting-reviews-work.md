<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "KYC and Underwriting Reviews",
  "description": "KYC (Know Your Customer) and Underwriting are the \"Gatekeepers.\" KYC verifies *Identity* (Who are you?), while Underwriting verifies *Business Risk* (What do you sell?).",
  "about": "KYC and Underwriting Reviews",
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
      "name": "What are KYC and Underwriting Reviews?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "KYC (Know Your Customer) and Underwriting are the \"Gatekeepers.\" KYC verifies *Identity* (Who are you?), while Underwriting verifies *Business Risk* (What do you sell?)."
      }
    },
    {
      "@type": "Question",
      "name": "Why do KYC and Underwriting Reviews matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Regulatory requirement. You physically cannot process money without knowing who you are processing for. Failures here lead to immediate shutdowns by banking partners."
      }
    }
  ]
}
</script>

Up: [Merchant Underwriting](./how-merchant-underwriting-works.md)
See also: [Document Requests](./why-processors-request-documents.md)

# KYC and Underwriting Reviews

Up: [How AML Screening Works](how-aml-screening-works.md)
See also:
- [Merchant Underwriting](how-merchant-underwriting-works.md)


## Definition
KYC (Know Your Customer) Reviews are operational checkpoints where a human or system audits a user's identity and business model. Unlike the initial *Underwriting Model*, this refers to the ongoing *Recertification* or *Audit* process triggered by risk alerts.

## Why it matters
Friction. A review usually pauses payouts or processing. It is the primary cause of "Sudden" account freezes. Understanding the trigger allows merchants to prepare documentation in advance.

## Signals to monitor
- **Document Requests**: Inbound tickets asking for ID, Bank Statements, or Invoices.
- **Review Status**: API flags like `verification.status: pending`.
- **Payout State**: Funds moving to `on_hold` during the review.

## Breakdown modes
- **Doc Loop**: Submitting a document, waiting 3 days, getting a rejection for "blurriness," repeating.
- **Silent Hold**: Payouts pausing without a clear notification/ticket from the support team.
- **False Positive Freeze**: Freezing a celebrity or high-profile user because their volume spiked.

## Where observability fits
- **Ticket Aging**: Tracking how long a review has been open.
- **Hold Volume**: The total amount of funds trapped in the review process.
- **Document Trail**: Logging exactly when documents were uploaded to dispute latency claims.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Why do they need my ID again?
Expired documents, new beneficial owners, or a change in regulatory requirements.

### How long does it take?
Standard is 1-3 business days. Complex cases (high risk) can take weeks.

### Can I speed it up?
Provide clear, high-resolution PDFs. Match the name on the doc *exactly* to the name on the account.

## See also
- [Merchant Underwriting](./how-merchant-underwriting-works.md)
- [Compliance Timing Gaps](./how-compliance-timing-gaps-form.md)
- [Monitoring Review Backlogs](../use-cases/monitoring-manual-review-backlogs.md)
