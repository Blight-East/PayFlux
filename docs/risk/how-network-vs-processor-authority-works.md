# Network vs Processor Authority

## Definition
The Authority Hierarchy defines who has the final say in a risk decision.
Level 1: **Card Network** (Visa/MC) - The Lawmakers.
Level 2: **Issuing Bank** (Chase/Citi) - The Judges (Decide disputes).
Level 3: **Acquirer/Processor** (Stripe/Adyen) - The Enforcers (Manage the merchant).

## Why it matters
Appeals. You can appeal a Processor decision (e.g., a Reserve). You typically *cannot* appeal a Network decision (e.g., MATCH list placement) without a lawyer. Knowing who made the call tells you if it's worth fighting.

## Signals to monitor
- **Source of Action**: Did the email cite "Network Compliance" or "Terms of Service"?
- **Program Name**: "VFMP" = Visa (Network). "High Risk Monitoring" = Processor.
- **Scope**: Is the action specific to one card brand (Network) or the whole account (Processor)?

## Breakdown modes
- **The Squeeze**: The Network fines the Processor for your behavior. The Processor passes the fine to you + adds a markup.
- **The Firewall**: The Processor suspends you preemptively to *prevent* the Network from noticing you.
- **The Conflict**: Processor wants to keep you (Revenue), Network wants to ban you (Risk). Network wins.

## Where observability fits
- **Policy Tracing**: Tagging every incident with its Source Authority.
- **Rule alignment**: Ensuring your internal controls match the *strictest* authority (usually the Network).
- **Communication**: "This 25% reserve is a Processor decision, not a Visa one. We can negotiate."

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Can a processor ignore Visa?
No. They will lose their license to process.

### Who is "The Scheme?"
"The Scheme" is European terminology for "Card Network" (Visa/Mastercard schemes).

### Why is the processor so strict?
They are liable. If you go bust, they pay your fines. They are protecting their own balance sheet.

## See also
- [Card Network Rules](../how-it-works/how-card-network-rule-changes-affect-merchants.md)
- [Network Monitoring Programs](./how-network-monitoring-programs-work.md)
- [Merchant Underwriting](./how-merchant-underwriting-works.md)
