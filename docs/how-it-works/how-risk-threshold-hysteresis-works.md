# Risk Threshold Hysteresis

## Definition
Hysteresis describes a system where the state depends on its history. In payments, it means the **Exit Threshold** (to leave a penalty program) is lower/stricter than the **Entry Threshold** (to enter it). Once you break a rule, you must "over-correct" to return to normal.

## Why it matters
It creates a "trap." If the monitoring program limit is 0.9% disputes, you might enter at 0.91%. But to *exit*, the rule often requires you to be under 0.6% for 3 consecutive months. Merely returning to 0.8% (which was safe before) is no longer enough.

## Signals to monitor
- **Current Metric**: Real-time dispute or fraud rate.
- **Target Threshold**: The specific number needed to exit the penalty state.
- **Probation Counter**: "Month 1 of 3" clean months.
- **Cohort Performance**: The risk score of new traffic vs legacy traffic.

## Breakdown modes
- **The "Almost" Reset**: Hitting 0.5% for two months, then spiking to 0.65% in month 3, resetting the entire counter to zero.
- **Permanent Flagging**: Getting stuck in a loop of entry/exit until the processor manually terminates the relationship.

## Where observability fits
- **Burn-Down Tracking**: Visualizing the path to the exit threshold.
- **Gap Analysis**: Showing the delta between "Current Reality" and "Required Performance."
- **Program Management**: Keeping the team focused on the *stricter* recovery goal, not the standard goal.

> Note: observability does not override processor or network controls; it provides operational clarity to navigate them.

## FAQ

### Why is it unfair?
It's designed to be conservative. The processor was burned once; they need extra assurance ("over-performance") to trust the volume again.

### How long does it last?
Typically 3 to 12 months, depending on the severity of the program (VFMP/ECP).

### Can I switch processors to escape?
Technically yes, but Match/TMF lists often prevent this. You structurally need to fix the risk metrics.

## See also
- [Risk Threshold Events](../risk/how-risk-threshold-events-work.md)
- [Network Monitoring Programs](../risk/how-network-monitoring-programs-work.md)
- [Rolling Risk Windows](../risk/how-rolling-risk-windows-work.md)
