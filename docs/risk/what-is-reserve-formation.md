# What is Reserve Formation?

Up: [Payment Reserves & Balances](mechanics-payment-reserves-and-balances.md)
See also:
- [How Reserve Release Logic Works](how-reserve-release-logic-works.md)
- [What is a Payment Reserve?](what-is-a-payment-reserve.md)

## Definition
Reserve formation is the process by which a payment processor withholds a portion of merchant funds to cover anticipated future losses. It is not triggered by a single event but forms when accumulated risk indicators exceed internal tolerances.

## Why it matters
Reserve formation creates sudden liquidity constraints. Merchants experience it as abrupt fund withholding, often without clear warning, because the causal signals (disputes, refunds) formed over long periods.

## Signals to monitor
- Risk accumulation (dispute ratios, refund velocity)  
- Policy thresholds (internal processor limits)  
- Liquidity protection triggers  
- Loss projection deltas  
- Rolling exposure estimates  

## Breakdown modes
- Step-function increases  
- Delayed visibility to merchants  
- Triggering on false positives  
- Portfolio-wide application  
- Reserve stacking  

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is reserve formation?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Reserve formation is when a payment processor withholds funds from a merchant account to cover projected future losses from disputes or fraud."
      }
    },
    {
      "@type": "Question",
      "name": "What causes a reserve to be applied?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Reserves are triggered when accumulated risk metrics such as dispute rates or refund volumes exceed internal thresholds."
      }
    },
    {
      "@type": "Question",
      "name": "Are reserves applied instantly?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. They result from cumulative risk signals evaluated over time."
      }
    }
  ]
}
</script>
