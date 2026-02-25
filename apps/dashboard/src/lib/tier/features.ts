/**
 * Feature identifies a gatable capability in PayFlux.
 * All access checks must use canAccess(feature), not inline tier comparisons.
 */
export type Feature =
  | "basic_risk_score"
  | "slope_modeling"
  | "acceleration_modeling"
  | "instability_index"
  | "reserve_projection"
  | "confidence_bands"
  | "system_shock_blend"
  | "alert_routing"
  | "evidence_export"
  | "bulk_export"
  | "extended_retention"
  | "high_concurrency";
