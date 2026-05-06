-- Migration 0008: Calibration & Outcome Reconciliation Infrastructure
-- Part of V4: Measurement system for forecast accuracy

-- Extend forecast_snapshots with uncertainty bounds for coverage ratio computation
ALTER TABLE forecast_snapshots
    ADD COLUMN IF NOT EXISTS forecasted_t30_cents_min bigint,
    ADD COLUMN IF NOT EXISTS forecasted_t30_cents_max bigint;

-- Calibration reports: stores aggregate metrics per cohort evaluation run
CREATE TABLE IF NOT EXISTS calibration_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_version text NOT NULL,
    cohort_key text NOT NULL,
    sample_size integer NOT NULL,

    -- Core error metrics
    mae_cents bigint NOT NULL,
    smape_pct numeric(6,2) NOT NULL,
    directional_accuracy_pct numeric(5,2),
    coverage_ratio_pct numeric(5,2) NOT NULL,

    -- Confidence band breakdown
    avg_error_high_confidence numeric(8,2),
    avg_error_medium_confidence numeric(8,2),
    avg_error_low_confidence numeric(8,2),
    coverage_high_confidence numeric(5,2),
    coverage_medium_confidence numeric(5,2),
    coverage_low_confidence numeric(5,2),

    -- Operational health
    normalization_frequency_pct numeric(5,2),

    computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calibration_reports_cohort_idx
    ON calibration_reports (cohort_key, computed_at DESC);
