# Negative Balance Cascades

Up: [What Is a Payment Reserve](what-is-a-payment-reserve.md)
See also:
- [Payment Reserves & Balances](mechanics-payment-reserves-and-balances.md)
- [How Reserve Release Logic Works](how-reserve-release-logic-works.md)
- [Why Payment Processors Freeze Funds](why-payment-processors-freeze-funds.md)
- [Monitoring Negative Balances](../use-cases/monitoring-negative-balances.md)

## Definition
A Negative Balance Cascade is a financial chain reaction that occurs when returns, disputes, or fees exceed current sales. If a processor fails to debit a merchant's bank account to cover the hole, they often freeze processing entirely. The merchant is then trapped: they need new sales to clear the negative balance, but cannot process new sales *because* of the negative balance.

## Why it matters
Existential Survival. This state can kill a business in days. It converts a temporary operational issue (e.g., a batch of faulty goods) into a permanent infrastructure failure where the merchant loses the ability to transact globally.

## Signals to monitor
- **Daily Net Liquidity**: (Total Sales - Total Outflows). If this is consistently negative, a cascade is imminent.
- **Settlement Availability**: Funds currently "Waiting for Payout" vs "Needed for Refunds."
- **Processor Debit Status**: Monitoring for `debit_failed` (NSF) events from the processor's bank calls.
- **Float Depth**: The amount of collateral or "Reserved" funds held to buffer against sudden refund surges.

## Breakdown modes
- **The Weekend Gap**: Refunds process 24/7, but bank settlements only happen on business days. A merchant can go negative on Saturday and recover on Monday, but the "Low Point" may trigger an automated risk freeze.
- **Fee Shock**: A processor debiting substantial monthly or annual fees from an account with low recent volume, pushing the balance into the red.
- **Collection Trap**: A processor halting all new processing and demanding a wire transfer to clear a balance, while the merchant's only source of capital is new sales.

## Where observability fits
Observability provides "Liquidity Prediction." By projecting refund volume against upcoming sales, the system can alert management to "Top-up" the processor account before the balance hits zero, avoiding an automated infrastructure freeze.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Can I wire money to fix a negative balance?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Most processors provide a 'Wire Top-up' instruction to clear a balance and resume processing."
      }
    },
    {
      "@type": "Question",
      "name": "What is 'The Weekend Gap'?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The disparity between 24/7 refund activity and the Monday-Friday schedule of the banking system that moves settlement funds."
      }
    },
    {
      "@type": "Question",
      "name": "How do I prevent a cascade?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "By maintaining a 'Float' (a buffer of funds) in your processor account rather than paying out 100% of sales daily."
      }
    }
  ]
}
</script>
