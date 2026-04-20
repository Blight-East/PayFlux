/**
 * Onboarding Guard Helpers
 * 
 * Phase 4: Forced first-value onboarding guardrail.
 * 
 * These helpers determine whether a user needs to complete onboarding
 * before accessing protected dashboard routes.
 * 
 * NOTE: Onboarding completion persists in the account store and
 * the primary dashboard surfaces now enforce setup for new accounts.
 * 
 * Current behavior:
 * - Existing accounts without onboarding field are grandfathered
 * - New persisted onboarding completions survive refreshes and follow-up requests
 * - Dashboard routes redirect incomplete accounts into setup
 */

import { type Account } from './tier-enforcement';

/**
 * Determines if an account requires onboarding completion.
 * 
 * Rules:
 * - Unauthenticated users (null account) don't require onboarding
 * - Existing accounts without onboarding field are grandfathered (return false)
 * - New accounts with onboarding.completed = false require onboarding
 * 
 * @param account - Account object or null if unauthenticated
 * @returns true if user must complete onboarding before accessing dashboard
 */
export function requiresOnboarding(account: Account | null): boolean {
    if (!account) return false;

    // Existing accounts without onboarding field are grandfathered
    if (!account.onboarding) return false;

    return !account.onboarding.completed;
}

/**
 * Determines if a route path is protected by the onboarding guard.
 * 
 * Protected routes require onboarding completion before access.
 * 
 * @param pathname - Request pathname (e.g., '/dashboard', '/evidence')
 * @returns true if route requires onboarding completion
 */
export function isProtectedRoute(pathname: string): boolean {
    const protectedPrefixes = [
        '/dashboard',
        '/dashboard-v2',
        '/evidence',
        '/risk',
        '/settings',
        '/api-keys',
        '/connectors',
    ];

    return protectedPrefixes.some(prefix => pathname.startsWith(prefix));
}

/**
 * Determines if a route path is part of the onboarding flow.
 * 
 * Onboarding routes should be accessible even when onboarding is incomplete.
 * 
 * @param pathname - Request pathname (e.g., '/setup', '/setup/scan')
 * @returns true if route is part of onboarding flow
 */
export function isOnboardingRoute(pathname: string): boolean {
    return pathname.startsWith('/setup') || pathname === '/onboarding';
}
