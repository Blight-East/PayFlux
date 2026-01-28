<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Card Network Dispute Handling",
  "description": "Network Dispute Handling is the \"Court System\" operated by Visa/Mastercard. It defines the rules of engagement for a chargeback: what evidence is admissible, who has the burden of proof, and who wins in a tie.",
  "about": "Card Network Dispute Handling",
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
      "name": "What is Card Network Dispute Handling?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Network Dispute Handling is the \"Court System\" operated by Visa/Mastercard. It defines the rules of engagement for a chargeback: what evidence is admissible, who has the burden of proof, and who wins in a tie."
      }
    },
    {
      "@type": "Question",
      "name": "Why does Card Network Dispute Handling matter?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Liability Shift. Understanding the rules tells you when you have already lost. For example, in a \"Cardholder Does Not Recognize\" dispute, if you didn't use 3D Secure, the Network rules say you lose automatically. No amount of evidence will save you."
      }
    }
  ]
}
</script>

Up: [Dispute Infrastructure](../pillars/dispute-infrastructure.md)
See also: [Network Monitoring Programs](./how-network-monitoring-programs-work.md)

# Card Network Dispute Handling

## Definition
Network Dispute Handling is the "Court System" operated by Visa/Mastercard. It defines the rules of engagement for a chargeback: what evidence is admissible, who has the burden of proof, and who wins in a tie.

## Why it matters
Liability Shift. Understanding the rules tells you when you have already lost. For example, in a "Cardholder Does Not Recognize" dispute, if you didn't use 3D Secure, the Network rules say you lose automatically. No amount of evidence will save you.

## Signals to monitor
- **Reason Code Mix**: "Fraud" vs "Service" disputes have completely different rulebooks.
- **Win Rates**: Your success rate in overturning disputes. (Average is 20-30%).
- **Pre-Arb Volume**: The number of cases where the issuer rejects your evidence and demands a second round (with fees).

## Breakdown modes
- **Compelling Evidence Failure**: Submitting a text receipt when the rules require a signature.
- **Time Bar**: Submitting evidence 1 hour after the network deadline.
- **Currency Mismatch**: Winning the dispute but losing money on FX conversion during the reversal.

## Where observability fits
- **Deadline Tracking**: "3 days remaining to respond to Case #123."
- **Rule Updates**: Tracking when Visa changes the definition of "Compelling Evidence" (e.g., CE 3.0).
- **Cost/Benefit**: "It costs $15 to fight this $10 dispute. Auto-accept it."

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Can I email Visa?
No. You talk to your Acquirer. Your Acquirer talks to Visa.

### What is Arbitration?
The "Supreme Court." If you and the Issuer can't agree, Visa decides. The loser pays a ~$500 fine.

### What is 3D Secure?
A protocol that shifts liability for fraud disputes from You to the Issuer.

## See also
- [How Chargebacks Propagate](./how-chargebacks-propagate.md)
- [Dispute Evidence](./how-dispute-evidence-works.md)
- [Network vs Processor Authority](./how-network-vs-processor-authority-works.md)
