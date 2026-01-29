# Payment Reserves & Balances

## Definition
Payment reserves are funds withheld from merchant balances to offset projected future liability.  
Reserves transform probabilistic risk into immediate liquidity restriction.

## Why it matters
Reserves cause delayed business failure by limiting access to earned revenue after exposure has already occurred.

## Signals to monitor
- Reserve percentage applied to balance  
- Dispute ratio over rolling 30-day windows  
- Fraud score distribution shift  
- Refund velocity change  
- Negative balance frequency  

## Breakdown modes
- Step-function reserve increases  
- Portfolio-wide reserve application  
- Delayed reserve trigger after incident  
- Reserve stacking with payout holds  
- Indefinite reserve extensions  

## Implementation notes
Reserves must be modeled as balance transformations, not transaction flags.  
Exposure windows determine reserve size and duration.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is a payment reserve?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A payment reserve is money withheld by a processor to cover expected future losses."
      }
    },
    {
      "@type": "Question",
      "name": "What triggers reserve formation?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Rising disputes, fraud risk, refund velocity, and payout instability."
      }
    },
    {
      "@type": "Question",
      "name": "Are reserves tied to individual transactions?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. They are calculated at account or portfolio level."
      }
    },
    {
      "@type": "Question",
      "name": "Why do reserves appear after revenue is earned?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Because liability is assessed on historical activity using rolling exposure windows."
      }
    }
  ]
}
</script>
