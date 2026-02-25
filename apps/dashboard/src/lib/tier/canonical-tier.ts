/**
 * CanonicalTier is the unified tier type for PayFlux.
 * All tier gating must resolve to one of these values.
 * No business logic may compare raw tier strings directly.
 */
export type CanonicalTier = "free" | "pro" | "enterprise";
