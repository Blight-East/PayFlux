package tier

// ResolveFromEnv maps legacy runtime tier values to CanonicalTier.
// This does NOT replace existing usage yet.
func ResolveFromEnv(env string) CanonicalTier {
	switch env {
	case "tier2":
		return TierPro
	case "enterprise":
		return TierEnterprise
	default:
		return TierFree
	}
}

// CanAccess determines if a CanonicalTier has access to a Feature.
// This is the single future source of truth for capability gating.
func CanAccess(t CanonicalTier, f Feature) bool {
	switch t {
	case TierEnterprise:
		return true
	case TierPro:
		switch f {
		case FeatureSlopeModeling,
			FeatureAcceleration,
			FeatureInstabilityIndex,
			FeatureReserveProjection,
			FeatureConfidenceBands,
			FeatureAlertRouting,
			FeatureEvidenceExport:
			return true
		case FeatureBasicRiskScore:
			return true
		}
		return false
	case TierFree:
		return f == FeatureBasicRiskScore
	}
	return false
}
