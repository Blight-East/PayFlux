/**
 * Account Resolution for Tier Enforcement
 * 
 * TEMPORARY: This is a placeholder implementation.
 * In production, this should:
 * - Query a database for account data
 * - Validate account ID from auth context
 * - Handle account not found errors
 */

import { type Account, type PricingTier } from './tier-enforcement';

/**
 * Resolve account information for a given user ID.
 * 
 * NOTE: This is a MOCK implementation for development.
 * 
 * PRODUCTION BLOCKER:
 * - No database client configured
 * - No ORM/query builder available
 * - Onboarding completion is enforced at UI/middleware level only
 * - Persistence will be added once database infrastructure exists
 * 
 * Current behavior:
 * - All users are grandfathered (no onboarding field)
 * - Onboarding state does NOT persist across sessions
 * - Middleware enforcement relies on this resolver returning null onboarding
 * 
 * @param userId - Clerk user ID
 * @returns Account object or null if not found
 */
export async function resolveAccount(userId: string | null): Promise<Account | null> {
    if (!userId) {
        return null;
    }

    // TEMPORARY: Mock account for development
    // TODO: Replace with database query
    const mockAccount: Account = {
        id: `acc_${userId}`,
        billingTier: 'GROWTH', // Default to GROWTH for development
        tierHistory: [
            {
                billingTier: 'GROWTH',
                changedAt: new Date().toISOString(),
                reason: 'initial',
            },
        ],
        // Phase 4: Existing users are grandfathered (no onboarding field)
        // New users in production will have onboarding: { completed: false, step: 'IDENTIFIED' }
        // For now, all mock users are treated as existing (grandfathered)
    };

    return mockAccount;
}

/**
 * Resolves an account from an API key.
 * 
 * TEMPORARY IMPLEMENTATION:
 * - Returns a mock PILOT account for API key auth
 * - In production, this should query a database
 * 
 * @param apiKey - API key from Authorization header
 * @returns Account object or null if not found
 */
export async function resolveAccountFromAPIKey(apiKey: string): Promise<Account | null> {
    // TEMPORARY: Mock account for development
    // TODO: Replace with database query (API key -> account mapping)
    const mockAccount: Account = {
        id: `acc_api_${apiKey.slice(0, 8)}`,
        billingTier: 'PILOT', // Default to PILOT for API key auth
        tierHistory: [
            {
                billingTier: 'PILOT',
                changedAt: new Date().toISOString(),
                reason: 'initial',
            },
        ],
    };

    return mockAccount;
}

/**
 * Environment variable fallback for tier resolution.
 * 
 * This provides backward compatibility with the old PAYFLUX_TIER env var.
 * 
 * @deprecated Use account-based tier resolution instead
 * @returns PricingTier based on PAYFLUX_TIER env var
 */
export function getEnvTierFallback(): PricingTier {
    const envTier = process.env.PAYFLUX_TIER;

    // Map old tier1/tier2 to new pricing tiers
    if (envTier === 'tier1') {
        return 'PILOT';
    }
    if (envTier === 'tier2') {
        return 'GROWTH';
    }

    // Default to PILOT if not set
    return 'PILOT';
}
