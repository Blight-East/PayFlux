# Reserve Release Logic

## Definition
Reserve Release Logic dictates the schedule on which collateral funds are returned to the merchant. It typically follows a "Rolling" model (funds captured on Day 1 release on Day 181) or a "Fixed" model (entire block releases when the account is closed).

## Why it matters
Financial Planning. Merchants often treat reserves as "Lost Money." In reality, it is a forced savings account. Knowing *exactly* when that capital unlocks allows for strategic reinvestment or debt repayment.

## Signals to monitor
- **Vintage Buckets**: Tracking volume by "Processing Date" to predict "Release Date."
- **Net Release**: The daily flow of (Released Funds - New Reserves Withheld).
- **Release Failures**: Funds that *should* have released but didn't (System error or extended hold).

## Breakdown modes
- **The Extension**: Processor extending the hold from 120 days to 180 days silently because of a slight uptick in refunds.
- **The Offset**: Processor using the releasing reserve to pay off a negative balance in the *current* processing account.
- **The Forever Hold**: Funds held indefinitely because the merchant cannot pass a closing KYB check.

## Where observability fits
- **Release Calendar**: "You have $10k releasing on Friday."
- **Audit**: Verifying that the processor actually paid out the correct amount.
- **Liquidity Modeling**: Including "Future Reserve Releases" as an asset class in financial reporting.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Is the release date guaranteed?
No. If risk increases, the processor can extend the hold.

### Do I earn interest?
Almost never. The processor keeps the float interest.

### Can I request early release?
Rarely. Only if you can prove the risk has disappeared (e.g., delivered all goods).

## See also
- [Payment Reserves](./what-is-a-payment-reserve.md)
- [Rolling Risk Windows](./how-rolling-risk-windows-work.md)
- [Liability Horizons](./how-liability-horizons-affect-payouts.md)
