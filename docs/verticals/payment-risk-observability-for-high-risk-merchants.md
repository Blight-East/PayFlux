# High-Risk Merchants

## Definition
High-Risk Observability focuses on merchants in regulated or volatile industries (Travel, Gaming, Crypto, Adult). These merchants operate under the constant threat of account closure and aggressive monitoring programs.

## Why it matters
Survival. For high-risk merchants, "Risk Management" is not a back-office function; it is the core constraint on revenue. Breaching a threshold doesn't mean a fee; it means "Termination" (TMF), which can permanent kill the business.

## Signals to monitor
- **Reserve Percentage**: Sudden increases in the "Hold Rate" applied to daily batches.
- **Manual Review Queue**: The backlog of transactions held by the processor for human eyes.
- **Volume Caps**: Proximity to the monthly processing limit (e.g., "85% of $500k Used").
- **Gateway Redundancy**: The health of backup merchant accounts (Load Balancing).

## Breakdown modes
- **Sudden Termination**: Receiving a "Closure Notice" effective in 24 hours.
- **Reserve Trap**: Processor holding 100% of funds for 180 days upon potential closure.
- **Volume Choke**: Hitting the monthly cap on the 20th, unable to process for 10 days.

## Where observability fits
- **Load Balancing**: Routing traffic to different MIDs to keep each one within safe velocity/volume limits.
- **Cash Forecasting**: Modeling "Real Cash" (Post-Reserve) vs "Theoretical Cash" (Sales).
- **Incident Documentation**: Keeping perfect records to fight "unjustified" closures or reviews.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Am I High Risk?
If you sell future delivery (Travel), age-restricted goods (Vape/Alcohol), or huge tickets ($2000+), likely yes.

### Can I get off the high-risk list?
Rarely. It's usually inherent to the business model. You manage it, you don't cure it.

### Why do they need so many documents?
Because the banks are terrified of Money Laundering (AML) fines. They need proof you are a real business shipping real goods.

## See also
- [Payment Risk Events](../pillars/payment-risk-events.md)
- [Monitoring Payment Reserves](../use-cases/monitoring-payment-reserves.md)
- [Rolling Risk Windows](../risk/how-rolling-risk-windows-work.md)
