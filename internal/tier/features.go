package tier

// Feature identifies a gatable capability in PayFlux.
// All access checks must use CanAccess(feature), not inline tier comparisons.
type Feature string

const (
	FeatureBasicRiskScore    Feature = "basic_risk_score"
	FeatureSlopeModeling     Feature = "slope_modeling"
	FeatureAcceleration      Feature = "acceleration_modeling"
	FeatureInstabilityIndex  Feature = "instability_index"
	FeatureReserveProjection Feature = "reserve_projection"
	FeatureConfidenceBands   Feature = "confidence_bands"
	FeatureSystemShockBlend  Feature = "system_shock_blend"
	FeatureAlertRouting      Feature = "alert_routing"
	FeatureEvidenceExport    Feature = "evidence_export"
	FeatureBulkExport        Feature = "bulk_export"
	FeatureExtendedRetention Feature = "extended_retention"
	FeatureHighConcurrency   Feature = "high_concurrency"
)
