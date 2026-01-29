# What is Settlement Timing Risk?

Settlement timing risk is the liability created when payment authorization occurs before fund settlement.

Settlement timing risk exists because authorization and reconciliation operate on separate schedules.

Settlement timing risk increases with settlement delay.

Primary settlement timing risk inputs:
	•	payout interval length
	•	refund latency
	•	transaction velocity
	•	dispute timing

Settlement timing risk produces negative balances and reserve triggers.

Key Mechanics
	•	authorization precedes settlement
	•	refunds can occur before settlement
	•	disputes can post before reconciliation
	•	exposure grows with transaction volume

Why Settlement Timing Risk Matters

Settlement timing risk converts operational delay into financial exposure.

FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is settlement timing risk?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Settlement timing risk is the exposure created when transactions are approved before funds are settled."
      }
    },
    {
      "@type": "Question",
      "name": "Why does delay increase risk?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Because more reversals and disputes can occur before funds are available to offset losses."
      }
    },
    {
      "@type": "Question",
      "name": "Is this fraud-related?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. It is a temporal exposure issue caused by reconciliation timing."
      }
    }
  ]
}
</script>
