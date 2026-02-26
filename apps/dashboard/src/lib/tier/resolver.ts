import type { CanonicalTier } from "./canonical-tier";
import type { Feature } from "./features";

// resolveTier maps external tier strings (Clerk, billing, env vars)
// into CanonicalTier. Accepts "tier2" for backward-compatible env config.
export function resolveTier(input: string | undefined): CanonicalTier {
  switch (input) {
    case "pro":
    case "tier2":
      return "pro";
    case "enterprise":
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
