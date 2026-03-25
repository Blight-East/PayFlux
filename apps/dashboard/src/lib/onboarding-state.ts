/**
 * Onboarding State Model
 *
 * Single source of truth for where a user is in the onboarding funnel.
 * Derived from Clerk org publicMetadata + workspace tier.
 *
 * Stages (ordered):
 *   "none"            — signed up, no scan completed
 *   "scanned"         — risk scan completed, Stripe not connected
 *   "connected_free"  — Stripe connected, free tier
 *   "upgraded"        — paid tier (pro or enterprise)
 */

import { resolveOrganizationContext, resolveWorkspace, type WorkspaceContext } from './resolve-workspace';

export type OnboardingStage = 'none' | 'scanned' | 'connected_free' | 'upgraded';

export interface OnboardingState {
    stage: OnboardingStage;
    workspace: WorkspaceContext | null;
    hasStripeConnection: boolean;
    hasScanCompleted: boolean;
}

/**
 * Resolve the current onboarding stage for a user.
 *
 * Decision tree:
 *   1. tier is pro or enterprise → "upgraded"
 *   2. stripeAccountId present   → "connected_free"
 *   3. onboardingScanCompleted   → "scanned"
 *   4. otherwise                 → "none"
 */
export async function resolveOnboardingState(userId: string): Promise<OnboardingState> {
    const workspace = await resolveWorkspace(userId, { allowAdminBypass: false });

    // No workspace yet — user just signed up, no org
    if (!workspace) {
        return {
            stage: 'none',
            workspace: null,
            hasStripeConnection: false,
            hasScanCompleted: false,
        };
    }

    // Check tier first
    if (workspace.tier === 'pro' || workspace.tier === 'enterprise') {
        return {
            stage: 'upgraded',
            workspace,
            hasStripeConnection: true,
            hasScanCompleted: true,
        };
    }

    // Check Stripe connection from org metadata.
    // IMPORTANT: Fetch the org directly via getOrganization() to avoid stale embedded
    // data from getOrganizationMembershipList(). Same fix as activation-state.ts.
    let hasStripeConnection = false;
    let hasScanCompleted = false;

    try {
        const org = await resolveOrganizationContext(userId);
        if (org) {
            const meta = org.publicMetadata;
            hasStripeConnection = typeof meta.stripeAccountId === 'string' && meta.stripeAccountId.length > 0;
            hasScanCompleted = meta.onboardingScanCompleted === true;
        }
    } catch {
        // Fall through with defaults
    }

    let stage: OnboardingStage = 'none';
    if (hasStripeConnection) {
        stage = 'connected_free';
    } else if (hasScanCompleted) {
        stage = 'scanned';
    }

    return { stage, workspace, hasStripeConnection, hasScanCompleted };
}
