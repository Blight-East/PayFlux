/**
 * PayFlux Tier Enforcement System
 * 
 * Single source of truth for tier → capability resolution.
 * 
 * Core Principle: Pricing ≠ Capability
 * - billingTier = what the customer pays for
 * - effectiveConfig = what the system can do
 */

// ─────────────────────────────────────────────────────────────────────────────
// Core Types
// ─────────────────────────────────────────────────────────────────────────────

export type PricingTier = "PILOT" | "GROWTH" | "SCALE";
export type IntelligenceTier = "tier1" | "tier2";

export interface Account {
    id: string;
    billingTier: PricingTier;

    tierHistory: Array<{
        billingTier: PricingTier;
        changedAt: string; // RFC3339
        reason: string;
    }>;

    overrides?: Partial<Omit<AccountTierConfig, "pricingTier">>;

    /**
     * Onboarding state for forced first-value flow.
     * 
     * Optional field for backward compatibility:
     * - Existing accounts without this field are grandfathered (treated as completed)
     * - New accounts default to { completed: false, step: 'IDENTIFIED' }
     */
    onboarding?: {
        completed: boolean;
        step: 'IDENTIFIED' | 'ACTION_SELECTED' | 'VALUE_REALIZED';
        completedAt?: string; // RFC3339
        mode?: 'UI_SCAN' | 'API_FIRST' | 'NO_SITE';
    };
}

export interface AccountTierConfig {
    pricingTier: PricingTier;
    intelligenceTier: IntelligenceTier;
    retentionDays: number;

    evidence: {
        exportEnabled: boolean;
        requireSignature: boolean;
        bulkExport: boolean;
    };

    rateLimits: {
        ingestRPS: number;
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical Tier Matrix (Single Source of Truth)
// ─────────────────────────────────────────────────────────────────────────────

type TierDefaults = Omit<AccountTierConfig, "pricingTier">;

export const CANONICAL_TIER_MATRIX: Record<PricingTier, TierDefaults> = {
    PILOT: {
        intelligenceTier: "tier1",
        retentionDays: 7,
        evidence: {
            exportEnabled: false,
            requireSignature: false,
            bulkExport: false,
        },
        rateLimits: {
            ingestRPS: 10,
        },
    },
    GROWTH: {
        intelligenceTier: "tier2",
        retentionDays: 30,
        evidence: {
            exportEnabled: true,
            requireSignature: true,
            bulkExport: false,
        },
        rateLimits: {
            ingestRPS: 100,
        },
    },
    SCALE: {
        intelligenceTier: "tier2",
        retentionDays: 90,
        evidence: {
            exportEnabled: true,
            requireSignature: true,
            bulkExport: true,
        },
        rateLimits: {
            ingestRPS: 1000,
        },
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Resolution Logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the effective tier configuration for an account.
 * 
 * Rules:
 * 1. Start from canonical tier config based on billingTier
 * 2. Apply overrides only if present
 * 3. pricingTier is immutable (always from account.billingTier)
 * 4. Final output is the only config used for enforcement
 * 
 * @param account - Account with billing tier and optional overrides
 * @returns Resolved tier configuration
 */
export async function resolveAccountTierConfig(account: Account): Promise<AccountTierConfig> {
    // Step 1: Get canonical tier config based on billingTier
    const baseConfig = CANONICAL_TIER_MATRIX[account.billingTier];

    // Step 2: Apply overrides (if present)
    if (account.overrides) {
        const resolvedConfig = {
            pricingTier: account.billingTier, // NEVER from overrides (immutable)
            intelligenceTier: account.overrides.intelligenceTier ?? baseConfig.intelligenceTier,
            retentionDays: account.overrides.retentionDays ?? baseConfig.retentionDays,
            evidence: {
                exportEnabled: account.overrides.evidence?.exportEnabled ?? baseConfig.evidence.exportEnabled,
                requireSignature: account.overrides.evidence?.requireSignature ?? baseConfig.evidence.requireSignature,
                bulkExport: account.overrides.evidence?.bulkExport ?? baseConfig.evidence.bulkExport,
            },
            rateLimits: {
                ingestRPS: account.overrides.rateLimits?.ingestRPS ?? baseConfig.rateLimits.ingestRPS,
            },
        };

        // Audit: Override applied
        const { logTierEvent, createOverrideAppliedEvent } = await import('./tier-audit');
        await logTierEvent(
            createOverrideAppliedEvent(
                account.id,
                resolvedConfig,
                Object.keys(account.overrides)
            )
        );

        return resolvedConfig;
    }

    // Step 3: Return base config with pricingTier attached
    return {
        pricingTier: account.billingTier,
        ...baseConfig,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Enforcement Helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface TierError {
    error: "E_TIER_FORBIDDEN" | "E_RATE_LIMIT_EXCEEDED" | "E_EXPORT_DEGRADED";
    reason: string;
    currentTier?: PricingTier;
    requiredTier?: PricingTier;
    limit?: number;
}

/**
 * Checks if evidence export is allowed for the given tier config.
 * 
 * @param config - Resolved tier configuration
 * @returns null if allowed, TierError if forbidden
 */
export function checkEvidenceExportAllowed(config: AccountTierConfig): TierError | null {
    if (!config.evidence.exportEnabled) {
        return {
            error: "E_TIER_FORBIDDEN",
            reason: "EVIDENCE_EXPORT_DISABLED_TIER",
            currentTier: config.pricingTier,
            requiredTier: "GROWTH",
        };
    }
    return null;
}

/**
 * Checks if bulk export is allowed for the given tier config.
 * 
 * @param config - Resolved tier configuration
 * @returns null if allowed, TierError if forbidden
 */
export function checkBulkExportAllowed(config: AccountTierConfig): TierError | null {
    if (!config.evidence.bulkExport) {
        return {
            error: "E_TIER_FORBIDDEN",
            reason: "BULK_EXPORT_DISABLED_TIER",
            currentTier: config.pricingTier,
            requiredTier: "SCALE",
        };
    }
    return null;
}

/**
 * Gets the intelligence tier for the given tier config.
 * 
 * @param config - Resolved tier configuration
 * @returns Intelligence tier (tier1 or tier2)
 */
export function getIntelligenceTier(config: AccountTierConfig): IntelligenceTier {
    return config.intelligenceTier;
}

/**
 * Gets the rate limit configuration for the given tier config.
 * 
 * @param config - Resolved tier configuration
 * @returns Rate limit configuration
 */
export function getRateLimitConfig(config: AccountTierConfig): { ingestRPS: number } {
    return config.rateLimits;
}

/**
 * Checks if the signature requirement is met.
 * 
 * @param config - Resolved tier configuration
 * @param hasSigningKey - Whether a signing key is available
 * @returns null if OK, TierError if degraded
 */
export function checkSignatureRequirement(
    config: AccountTierConfig,
    hasSigningKey: boolean
): TierError | null {
    if (config.evidence.requireSignature && !hasSigningKey) {
        return {
            error: "E_EXPORT_DEGRADED",
            reason: "SIGNING_KEY_MISSING",
        };
    }
    return null;
}
