# Monitoring Payment Reserves

## Definition
A Reserve is a portion of funds withheld by the processor to collateralize risk. It acts as a security deposit. Common types include **Rolling Reserves** (10% held for 180 days) and **Fixed Reserves** ($50k flat hold).

## Why it matters
Reserves are "Dead Capital." They reduce working capital efficiency. Sudden increases in reserve requirements (e.g., from 0% to 25%) can cause a liquidity crisis for the merchant.

## Signals to monitor
- **Reserve Rate**: The % currently being withheld (e.g., 10%).
- **Release Schedule**: The volume of funds maturing and becoming available today.
- **Total Held**: The absolute dollar amount trapped in the reserve.
- **Trigger Events**: Correlation between a dispute spike and a reserve hike.

## Breakdown modes
- **Cash Crunch**: Inability to pay suppliers because 50% of revenue is held.
- **Indefinite Hold**: Processor holding funds for 180+ days after account closure.
- **Reserve Creep**: Gradual increases in the reserve rate without notification.

## Where observability fits
- **Liquidity Forecasting**: "We have $100k in sales, but only $90k will settle. Plan accordingly."
- **Release Auditing**: Verifying that the processor actually released the funds on day 181.
- **Rate Negotiation**: Using data to prove metric stability and petition for a lower reserve.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Why do they hold my money?
To cover potential chargebacks. If you go out of business, the processor uses the reserve to refund customers.

### When do I get it back?
Usually after the "exposure window" closes (typically 180 days from the transaction date).

### Is it negotiable?
Yes, but only with data. You must prove your risk metrics (disputes/refunds) are low and stable.

## See also
- [Payment Risk Events](../pillars/payment-risk-events.md)
- [Payout Delays](../risk/how-payout-delays-work.md)
- [Monitoring Payout Delays](./monitoring-payout-delays.md)
