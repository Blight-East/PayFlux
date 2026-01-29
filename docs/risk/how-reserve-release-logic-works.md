# How Reserve Release Logic Works

Up: [Payment Reserves & Balances](mechanics-payment-reserves-and-balances.md)
See also:
- [What is Reserve Formation?](what-is-reserve-formation.md)
- [What is a Payment Reserve?](what-is-a-payment-reserve.md)

## Definition
Reserve Release Logic dictates the schedule on which collateral funds are returned to the merchant. It typically follows a "Rolling" model (funds captured on Day 1 release on Day 181) or a "Fixed" model (entire block releases when the account is closed).

## Why it matters
Financial Planning. Merchants often treat reserves as "lost money," but they are forced savings. Knowing *exactly* when capital unlocks allows for strategic reinvestment or debt repayment.

## Signals to monitor
- Vintage Buckets (Volume by processing date)  
- Net Release Flow (Released Funds vs New Withholding)  
- Release Failures (Funds overdue for release)  
- Release Date Projections  

## Breakdown modes
- "The Extension" (Holding funds longer due to refund upticks)  
- "The Offset" (Using released reserves to cover current negative balances)  
- "The Forever Hold" (Indefinite hold due to failed KYB at closure)  
- Calculation errors in rolling windows  

## Implementation notes
Observability should track a "Release Calendar" and audit that payouts match expected release amounts. Future releases should be modeled as an asset class.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is the release date guaranteed?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. If risk increases, the processor can extend the hold duration."
      }
    },
    {
      "@type": "Question",
      "name": "Do I earn interest on reserves?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Almost never. The processor typically keeps the float interest."
      }
    },
    {
      "@type": "Question",
      "name": "Can I request early release?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Rarely. Only if you can prove the risk has disappeared (e.g., all goods delivered and confirmed)."
      }
    }
  ]
}
</script>
