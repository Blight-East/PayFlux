# Card Network Rule Changes

## Definition
Card Network Rules are the operating regulations published by Visa, Mastercard, and others. They dictate liabilities, acceptable use policies, and technical standards. Rules are updated semi-annually (typically April and October), often introducing new compliance mandates or fee structures.

## Why it matters
A rule change can turn a compliant business into a non-compliant one overnight. They are "force majeure" events in payments—non-negotiable and strictly enforced by fines or declines.

## Signals to monitor
- **Bulletin Alerts**: Publications from networks or processors announcing upcoming changes.
- **Decline Code Shifts**: New errors (e.g., related to 3DS or CVV) appearing suddenly.
- **Fee Line Items**: New "Integrity Fees" or assessments on the settlement statement.
- **Compliance Notifications**: Inbound emails from the acquirer citing specific regulation numbers.

## Breakdown modes
- **Sudden Incompatibility**: Legacy integration code failing because a new field is now mandatory.
- **Threshold Compression**: The allowable dispute rate dropping (e.g., from 1% to 0.9%), trapping previously safe merchants.
- **Category bans**: A specific MCC (e.g., adult, crypto) being reclassified as "Prohibited."

## Where observability fits
- **Impact Analysis**: Correlating a drop in conversion with a known rule update date.
- **Health Checks**: Scanning authorization payloads for missing data required by new mandates.
- **Fee Verification**: Audit-checking that new pass-through fees match the published network rates.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### How do I know about changes?
Your processor should notify you. However, subscribing to industry newsletters or network technical bulletins is safer.

### Do rules apply to everyone?
Yes. From the smallest coffee shop to Amazon, the network rules are the law of the land.

### Can I get an exception?
Extremely rare. Only massive merchants with direct network relationships ever negotiate waivers, and even then, it's temporary.

## See also
- [Network Monitoring Programs](../risk/how-network-monitoring-programs-work.md)
- [Understanding Decline Reason Codes](../risk/understanding-decline-reason-codes.md)
- [Network vs Processor Authority](../risk/how-network-vs-processor-authority-works.md)
