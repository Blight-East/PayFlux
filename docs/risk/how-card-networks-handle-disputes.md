# How Card Networks Handle Disputes

Up: [Dispute Infrastructure](../pillars/dispute-infrastructure.md)
See also: [How Chargebacks Propagate](./how-chargebacks-propagate.md)

## Definition
Card Networks (Visa, Mastercard, Amex) act as the "Supreme Court" of payments. They do not hold money or talk to customers; instead, they define the rules (Reason Codes) and the legal process (Arbitration) that banks must follow when a cardholder disputes a charge. 

## Why it matters
The Network is the final authority. If a merchant and an issuer cannot agree on a dispute, the Network decides. Their rules are binding and often change twice a year in "Mandate Updates." Successfully navigating a dispute requires speaking the specific "Language" of the Network's Reason Codes.

## Signals to monitor
- **Reason Code**: The specific 4-digit ID (e.g., Visa 10.4) that defines the accusation.
- **Cycle Status**: Where the dispute is in the chain (Retrieval, Chargeback, Representment, Arbitration).
- **Mandate Updates**: Biannual changes to trial rules and evidence requirements.

## Breakdown modes
- **Reason Code Mismatch**: Proving delivery to fight a "Card Not Present Fraud" dispute is valid. Proving delivery to fight a "Credit Not Processed" dispute is a waste of time.
- **Arbitration Fees**: If you lose an appeal at the Network level, they charge a ~$500 "Arbitration Fee"—often more than the transaction itself.
- **Mandate Lag**: Failing to update your evidence engine to match new Network rules for 3D Secure or recurring billing.

## Where observability fits
Observability tracks the source of the dispute rules. By monitoring Network "Mandates" and automated "Reponse Engines," you can ensure that the evidence you submit always matches the absolute latest Network requirements.

## FAQ
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Can I email Visa to fight a dispute?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. You talk to your Acquirer/Processor. They represent you to the Card Network."
      }
    },
    {
      "@type": "Question",
      "name": "What is Arbitration?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The final stage of a dispute where the Card Network acts as a judge. The loser pays a heavy fine (~$500)."
      }
    },
    {
      "@type": "Question",
      "name": "What is 3D Secure?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A network protocol that shifts liability for fraud disputes from the merchant to the issuing bank."
      }
    }
  ]
}
</script>
