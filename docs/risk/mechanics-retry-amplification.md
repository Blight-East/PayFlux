# Retry Amplification

Retry amplification occurs when automated payment retries increase risk faster than they recover revenue.

## How Retry Amplification Forms

Retry amplification emerges when:
- Declines trigger immediate retries
- Retries are not rate-limited
- Issuer behavior is ignored
- Failure reasons are not segmented

Instead of improving success rates, retries multiply network load and fraud scoring.

## Risk Effects

Retry amplification increases:
- Issuer suspicion
- Fraud scores
- Network flags
- Dispute probability
- Infrastructure costs

It can convert transient declines into structural risk.

## Observable Signals

Indicators include:
- Rising retry-to-success ratio
- Increasing soft declines
- Elevated network error codes
- Correlated dispute spikes

## Example

A subscription platform retries cards every 15 minutes after failure. Issuers detect velocity and downgrade trust, causing even valid cards to fail.

## Key Insight

Retries change system behavior. They are not neutral actions.
