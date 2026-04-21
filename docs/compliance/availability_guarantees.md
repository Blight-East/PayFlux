# Availability & Reliability Guarantees


Last Updated: 2026-02-17
## 1. Bounded Memory
PayFlux enforces strict memory bounds to prevent OOM crashes.
- **Ring Buffers**: `TraceLog` and `Timeline` use fixed-size circular buffers (e.g., 500 entries).
- **LRU Caches**: `WarningStore` uses standard LRU eviction.
- **Rate Limiting**: Ingest is protected by token-bucket limiters to prevent queue buildup.

## 2. Rate Limiting
- **Mechanism**: Redis-backed atomic token bucket.
- **Granularity**: Per-Merchant and Global.
- **Behavior**: Sheds excess traffic with `429 Too Many Requests`.

## 3. Fail-Closed Behavior
In the event of uncertainty or failure, the system defaults to safety:
- **Entitlements**: Unknown tiers get minimal/zero limits.
- **Errors**: Internal errors result in `500` but do not leak partial state.

## 4. Backpressure
The system monitors Ingest/Outcome queues. If processing lag exceeds thresholds:
1.  **Signal**: Metrics reflect high pressure.
2.  **Action**: Ingest rejects new requests (`503 Service Unavailable`).
3.  **Recovery**: Resumes processing once queue drains.
