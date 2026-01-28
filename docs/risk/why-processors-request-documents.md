# Document Requests

## Definition
Document Requests (RFI - Request for Information) are the mechanism processors use to verify a merchant's continued compliance. They are "Spot Checks" on the validity of the business entity, its owners, and its fulfillment model.

## Why it matters
Friction. A failure to respond to an RFI typically leads to a Freeze. Treating these emails as "Spam" is a fatal error. They are regulatory mandates (KYC/AML).

## Signals to monitor
- **Inbound Tickets**: Support tickets with keywords "Compliance," "Verification," "Upload."
- **Dashboard Notifications**: Banners requiring immediate action.
- **Payout State**: Payouts often pause *during* the request period.

## Breakdown modes
- **The "Blurry ID" Loop**: Processors rejecting photos of IDs for low quality (OCR failure).
- **The Address Mismatch**: Utility bill address not matching the Bank Account address exactly.
- **The "Beneficial Owner" gap**: Failing to list a 25% shareholder because they are a "Silent Partner" (Violation of FinCEN rules).

## Where observability fits
- **Response Timer**: "Request received 2 days ago. Deadline is tomorrow."
- **Doc Repository**: Centralized storage of current, high-res corporate docs.
- **Status Tracking**: "Doc submitted. Status: Pending Review."

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Why do they ask again?
Docs expire (Drivers Licenses). Regulations change. Risk models trigger new reviews.

### Can I redact info?
Usually no. Banking partners need full, unredacted copies.

### security?
Upload via secure dashboard only. Never email sensitive docs.

## See also
- [KYC Reviews](./how-kyc-and-underwriting-reviews-work.md)
- [Merchant Underwriting](./how-merchant-underwriting-works.md)
- [Compliance Timing Gaps](./how-compliance-timing-gaps-form.md)
