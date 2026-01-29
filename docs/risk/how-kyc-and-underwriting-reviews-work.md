# KYC and Underwriting Reviews

Up: [Merchant Underwriting](./how-merchant-underwriting-works.md)
See also: [Document Requests](./why-processors-request-documents.md), [AML Screening](./how-aml-screening-works.md)

## Definition
KYC (Know Your Customer) and Underwriting Reviews are operational checkpoints where a human or automated system audits a merchant's identity and business model. Unlike the initial onboarding gate, these refer to the *ongoing* recertification or audits triggered by risk alerts, volume spikes, or routine compliance cycles.

## Why it matters
Friction and Stability. A review usually pauses payouts (and sometimes processing) immediately. This is the primary cause of "Sudden" account freezes. Understanding the triggers allows a merchant to prepare documentation in advance and minimize the "Hold Time" during a review.

## Signals to monitor
- **Document Request Tickets**: Inbound requests for ID, Bank Statements, or Invoices.
- **Verification Status**: API flags like `verification.status: pending` or `due_by`.
- **Payout State**: Funds moving to an `on_hold` or `pending_review` state despite successful processing.
- **Ticket Aging**: Tracking how many days a review has been open relative to the processor's SLA.

## Breakdown modes
- **The Doc Loop**: Submitting a document, waiting days, and getting a rejection for "blurriness" or "address mismatch," then repeating.
- **The Silent Hold**: Payouts pausing without a clear dashboard notification or support ticket explaining the hold.
- **False Positive Freezes**: Freezing a high-profile user or celebrity because their sudden volume spike "tripped" a generic fraud model intended for small merchants.

## Where observability fits
Observability creates an "Audit Trail." By logging exactly when documents were uploaded and tracking "Hold Volume" (the total funds trapped), merchants can prove compliance and pressure processors to adhere to their review timelines.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Why do they need my ID again?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Expired documents, new beneficial owners, or changes in global regulatory requirements."
      }
    },
    {
      "@type": "Question",
      "name": "How long does a review take?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Standard reviews take 1-3 business days. Complex high-risk cases can take weeks."
      }
    },
    {
      "@type": "Question",
      "name": "How can I speed up the process?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Provide clear, high-resolution PDFs where names match the account profile exactly."
      }
    }
  ]
}
</script>
