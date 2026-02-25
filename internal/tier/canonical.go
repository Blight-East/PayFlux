package tier

// CanonicalTier is the unified tier type for PayFlux.
// All tier gating must resolve to one of these values.
// No business logic may compare raw tier strings directly.
type CanonicalTier string

const (
	TierFree       CanonicalTier = "free"
	TierPro        CanonicalTier = "pro"
	TierEnterprise CanonicalTier = "enterprise"
)
