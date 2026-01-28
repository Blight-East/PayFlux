# AML Screening

## Definition
AML (Anti-Money Laundering) Screening is the mandatory process of checking customer identities against government watchlists (OFAC, UN Sanctions). It is a "Gateway Check" that must pass before any money can move.

## Why it matters
Jail Time. Unlike fraud (where you lose money), AML violations result in criminal liability for executives and massive fines for the platform. It is the one area where "Reasonable Effort" is not enough; strict compliance is required.

## Signals to monitor
- **Hit Rate**: The % of users flagged as potential matches. (Should be < 1% for normal traffic).
- **False Positive Rate**: The % of flags that are cleared after manual review.
- **Review Queue Age**: How long flagged users wait for a human decision.

## Breakdown modes
- **Name Collisions**: "John Smith" matches a sanctioned individual. Without secondary data (DOB, Address), this blocks a valid user.
- **Transliteration Errors**: Arabic/Cyrillic names translated to English differently by the user vs the watchlist.
- **Pep Spikes**: A sudden influx of "Politically Exposed Persons" (e.g., during an election) swamping the compliance team.

## Where observability fits
- **Vendor Latency**: "The IDV provider is taking 45 seconds to respond, timing out the signup flow."
- **Audit Trails**: Logging the exact timestamp and watchlist version used for every screen.
- **Status Sync**: Ensuring that a user blocked in the AML tool is actually blocked in the Payment Ledger.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Can I automate clearing hits?
Only for obvious mismatches (e.g., different Country). True name matches usually require human eyes.

### What is a PEP?
Politically Exposed Person (Politician, Diplomat). They are not banned, but require "Enhanced Due Diligence" (EDD) to prevent bribery/corruption.

### How often should I rescreen?
Continuously. A user might be clean today but sanctioned tomorrow. Most firms rescreen daily/weekly.

## See also
- [Compliance Timing Gaps](./how-compliance-timing-gaps-form.md)
- [KYC Reviews](./how-kyc-and-underwriting-reviews-work.md)
- [Merchant Underwriting](./how-merchant-underwriting-works.md)
