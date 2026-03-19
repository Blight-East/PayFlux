/**
 * Activation State Model — Phase A
 *
 * Post-purchase state machine for PayFlux Core.
 * Determines where a paid user is in the activation pipeline:
 *
 *   paid_unconnected     → has paid tier, no processor connected
 *   connected_generating → processor connected, baseline/projection not yet complete
 *   live_monitored       → all conditions met: paid + connected + baseline + projection + alerts armed
 *
 * State is derived from Clerk org publicMetadata. No separate DB.
 * Every field is server-side queryable and refresh-safe.
 */

import { clerkClient } from '@clerk/nextjs/server';
import { resolveWorkspace, type WorkspaceContext } from './resolve-workspace';

export type ActivationState = 'paid_unconnected' | 'connected_generating' | 'live_monitored';

export interface ActivationStatus {
    state: ActivationState;
    workspace: WorkspaceContext;
    /** Individual conditions for the binary "live monitored" check */
    conditions: {
        paidTier: boolean;
        processorConnected: boolean;
        baselineGenerated: boolean;
        projectionExists: boolean;
        alertsArmed: boolean;
    };
    /** Raw metadata for the arming page progress display */
    meta: {
        stripeAccountId?: string;
        baselineGeneratedAt?: string;
        firstProjectionAt?: string;
        alertPolicyArmedAt?: string;
        activationCompletedAt?: string;
    };
}

/**
 * Resolve activation status for a paid user.
 * Returns null if the user is not paid (this flow is post-purchase only).
 */
export async function resolveActivationStatus(userId: string): Promise<ActivationStatus | null> {
    const workspace = await resolveWorkspace(userId);
    if (!workspace) return null;

    // Only applies to paid users
    if (workspace.tier !== 'pro' && workspace.tier !== 'enterprise') {
        return null;
    }

    // Fetch org metadata for activation conditions.
    // IMPORTANT: Fetch the org directly via getOrganization() — do NOT rely on the
    // embedded organization object from getOrganizationMembershipList(). The embedded
    // copy can be stale immediately after a metadata update (e.g., callback just wrote
    // stripeAccountId), causing the state to resolve as paid_unconnected and loop the
    // user back to the Connect Stripe page.
    let orgMeta: Record<string, unknown> = {};
    try {
        const client = await clerkClient();
        const memberships = await client.users.getOrganizationMembershipList({ userId });
        if (memberships.data && memberships.data.length > 0) {
            const oldestMembership = memberships.data.sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )[0];
            // Direct fetch — always returns fresh metadata
            const org = await client.organizations.getOrganization({
                organizationId: oldestMembership.organization.id,
            });
            orgMeta = (org.publicMetadata as Record<string, unknown>) || {};
        }
    } catch {
        // Fall through with empty metadata — will resolve as paid_unconnected
    }

    const conditions = {
        paidTier: true,
        processorConnected: typeof orgMeta.stripeAccountId === 'string' && orgMeta.stripeAccountId.length > 0,
        baselineGenerated: typeof orgMeta.baselineGeneratedAt === 'string' && orgMeta.baselineGeneratedAt.length > 0,
        projectionExists: typeof orgMeta.firstProjectionAt === 'string' && orgMeta.firstProjectionAt.length > 0,
        alertsArmed: orgMeta.alertPolicyArmed === true,
    };

    const meta = {
        stripeAccountId: orgMeta.stripeAccountId as string | undefined,
        baselineGeneratedAt: orgMeta.baselineGeneratedAt as string | undefined,
        firstProjectionAt: orgMeta.firstProjectionAt as string | undefined,
        alertPolicyArmedAt: orgMeta.alertPolicyArmedAt as string | undefined,
        activationCompletedAt: orgMeta.activationCompletedAt as string | undefined,
    };

    // Derive state
    let state: ActivationState;
    if (conditions.processorConnected && conditions.baselineGenerated && conditions.projectionExists && conditions.alertsArmed) {
        state = 'live_monitored';
    } else if (conditions.processorConnected) {
        state = 'connected_generating';
    } else {
        state = 'paid_unconnected';
    }

    return { state, workspace, conditions, meta };
}

/**
 * Binary check: is this workspace fully live monitored?
 */
export function isLiveMonitored(conditions: ActivationStatus['conditions']): boolean {
    return (
        conditions.paidTier &&
        conditions.processorConnected &&
        conditions.baselineGenerated &&
        conditions.projectionExists &&
        conditions.alertsArmed
    );
}
