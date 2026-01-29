# What is a Liability Horizon for Aggregators?

A liability horizon is the maximum time window during which a transaction can still generate financial loss after initial settlement.

For aggregators, liability persists beyond payout because:
• Disputes post late  
• Refunds reverse balances  
• Seller defaults occur  
• Fraud is retroactive  

## Mechanical effect

Liability horizons define:
• Capital buffers  
• Reserve sizing  
• Risk windows  
• Settlement pacing  

They are not accounting artifacts — they are temporal risk boundaries.

## Structural cause

Aggregators intermediate between merchants and processors. This makes them temporal shock absorbers for delayed losses.

---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "What is a liability horizon?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "A liability horizon is the time period during which a settled transaction can still produce financial loss."
    }
  },{
    "@type": "Question",
    "name": "Why do aggregators have long liability horizons?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Because disputes, refunds, and fraud are delayed relative to settlement."
    }
  }]
}
</script>
