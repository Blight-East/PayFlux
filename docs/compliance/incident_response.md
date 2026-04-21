# Incident Response Plan


Last Updated: 2026-02-17
## 1. Severity Levels

| Level | Description | Example | Response Time |
|---|---|---|---|
| **SEV1** | Critical System Failure | Data loss, Security breach, Total outage | < 15 min |
| **SEV2** | Major Degradation | High error rates, Latency spikes | < 30 min |
| **SEV3** | Minor Issue | Non-critical bug, Single merchant issue | < 4 hours |
| **SEV4** | Information | Cosmetic issue, Warning noise | < 24 hours |

## 2. Response Process
1.  **Detection**: Automated alert from Prometheus/Guardian or Manual report.
2.  **Triage**: Operator assesses severity and impact.
3.  **Mitigation**:
    - **Rollback**: If caused by recent deploy.
    - **Override**: Disable faulty signal via Admin API.
    - **Shed Load**: Enable stricter rate limiting.
4.  **Resolution**: Fix applied and verified.
5.  **Forensics**: `TraceLog` and `Timeline` analysis to identify root cause.

## 3. Escalation Chain
1.  **On-Call Engineer**: First responder.
2.  **Engineering Manager**: If resolution > 1 hour.
3.  **CTO/VP**: If SEV1 or Security Breach.

## 4. Forensic Process
- **Evidence**: Collect `dump_evidence` output.
- **Trace Replay**: Use `TraceLog` to replay decision sequence.
- **Auditing**: Review `audit.log` for configuration changes.
