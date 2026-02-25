import type { CanonicalTier } from "./canonical-tier";
import type { Feature } from "./features";

// resolveTier maps external tier strings (Clerk, billing, etc.)
// into CanonicalTier. This does NOT replace existing usage yet.
export function resolveTier(input: string | undefined): CanonicalTier {
  switch (input) {
    case "pro":
    case "tier2":
    case "GROWTH":
      return "pro";
    case "enterprise":
    case "SCALE":
      return "enterprise";
    default:
      return "free";
  }
}

// canAccess determines if a CanonicalTier has access to a Feature.
// This mirrors Go logic exactly.
export function canAccess(
  tier: CanonicalTier,
  feature: Feature
): boolean {
  switch (tier) {
    case "enterprise":
      return true;
    case "pro":
      return (
        feature === "basic_risk_score" ||
        feature === "slope_modeling" ||
        feature === "acceleration_modeling" ||
        feature === "instability_index" ||
        feature === "reserve_projection" ||
        feature === "confidence_bands" ||
        feature === "alert_routing" ||
        feature === "evidence_export"
      );
    case "free":
      return feature === "basic_risk_score";
  }
}
