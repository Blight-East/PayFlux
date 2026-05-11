-- Operational view: drift resolution latency.
--
-- For each drift detection row, find the resolution row (if any) that
-- references it via resolves_id. Compute the time-to-resolution. Aggregate
-- by hour bucket / event_type / severity, returning detection counts,
-- resolution counts, and the median/p95/max resolution time.
--
-- Open drifts (resolves_id pointing at them is NULL) count as unresolved
-- — that's the operational signal that disagreement is surviving longer
-- than expected.
--
-- The view is the metric surface for "drift half-life" as the operational
-- concept: institutional systems tolerate temporary inconsistency; what
-- matters is bounded, explainable, observable convergence. A transient
-- 90-second disagreement is operational noise. A 4-day unresolved
-- disagreement is systemic failure.
--
-- Today implemented as a regular view; promote to MATERIALIZED VIEW with
-- scheduled REFRESH if the underlying table grows past the threshold
-- where this aggregation becomes expensive.

CREATE OR REPLACE VIEW subscription_drift_resolution_latency AS
SELECT
    date_trunc('hour', d.detected_at) AS hour_bucket,
    d.event_type,
    d.severity,
    count(*) AS detection_count,
    count(r.id) AS resolution_count,
    count(*) FILTER (WHERE r.id IS NULL) AS unresolved_count,
    -- Resolution latency stats (in seconds), computed only over resolved drifts.
    -- percentile_disc gives a real observation value rather than interpolation.
    percentile_disc(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (r.detected_at - d.detected_at))
    ) FILTER (WHERE r.id IS NOT NULL) AS median_resolution_seconds,
    percentile_disc(0.95) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM (r.detected_at - d.detected_at))
    ) FILTER (WHERE r.id IS NOT NULL) AS p95_resolution_seconds,
    max(EXTRACT(EPOCH FROM (r.detected_at - d.detected_at)))
        FILTER (WHERE r.id IS NOT NULL) AS max_resolution_seconds
FROM subscription_reconciliation_events d
LEFT JOIN subscription_reconciliation_events r
    ON r.resolves_id = d.id
WHERE d.event_type IN ('drift_minor', 'drift_major', 'projection_impossible')
  AND d.detected_at > now() - interval '24 hours'
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 3 DESC, 2;

COMMENT ON VIEW subscription_drift_resolution_latency IS
    'Drift detection→resolution latency, bucketed by hour, event_type, severity. Trailing 24h. Promote to materialized view when underlying table volume warrants it; the column shape is the stable contract.';

-- Open drift gauge: how many detections per severity are currently
-- unresolved (no resolution row points at them). Used by alerting.
CREATE OR REPLACE VIEW subscription_drift_open AS
SELECT
    d.severity,
    d.event_type,
    count(*) AS open_count,
    min(d.detected_at) AS oldest_detected_at,
    max(now() - d.detected_at) AS longest_age
FROM subscription_reconciliation_events d
WHERE d.event_type IN ('drift_minor', 'drift_major', 'projection_impossible')
  AND NOT EXISTS (
    SELECT 1 FROM subscription_reconciliation_events r
    WHERE r.resolves_id = d.id
  )
GROUP BY 1, 2
ORDER BY
    CASE d.severity
        WHEN 'regulatory' THEN 1
        WHEN 'critical' THEN 2
        WHEN 'warning' THEN 3
        WHEN 'informational' THEN 4
    END,
    d.event_type;

COMMENT ON VIEW subscription_drift_open IS
    'Currently-unresolved drift detections grouped by severity and event_type. The oldest_detected_at column is the operational signal for "this drift has been outstanding for hours/days."';
