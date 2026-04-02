import { clerkClient } from '@clerk/nextjs/server';
import { resolveOrCreateWorkspaceRecord } from './db/workspaces';
import type { WorkspaceActivationState, WorkspacePaymentStatus } from './db/types';

export type WorkspaceRole = 'admin' | 'viewer';
export type WorkspaceTier = 'free' | 'pro' | 'enterprise';

export interface WorkspaceContext {
    workspaceId: string;
    workspaceRecordId: string;
    workspaceName: string;
    role: WorkspaceRole;
    tier: WorkspaceTier;
    paymentStatus?: WorkspacePaymentStatus;
    activationState?: WorkspaceActivationState;
}

export interface ResolvedOrganizationContext {
    organizationId: string;
    organizationName: string;
    role: WorkspaceRole;
    publicMetadata: Record<string, unknown>;
}

export interface ResolveWorkspaceOptions {
    allowAdminBypass?: boolean;
}

// ── Founder/operator bypass ─────────────────────────────────────
// Two layers — user ID is immutable and checked first; email is
// a fallback for accounts where the ID isn't known yet.
// Both are evaluated once at module load from environment.

const ADMIN_USER_IDS: Set<string> = new Set(
    (process.env.ADMIN_USER_IDS ?? '')
        .split(',')
        .map(id => id.trim())
        .filter(Boolean)
);

const ADMIN_EMAILS: Set<string> = new Set(
    (process.env.ADMIN_EMAILS ?? '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean)
);

const FOUNDER_WORKSPACE: WorkspaceContext = {
    workspaceId: 'payflux-internal',
    workspaceRecordId: 'payflux-internal',
    workspaceName: 'PayFlux Internal',
    role: 'admin',
    tier: 'enterprise',
    paymentStatus: 'current',
    activationState: 'active',
};

/**
 * Check if a Clerk userId is a founder/operator.
 *
 * Order:
 *   1. Match userId against ADMIN_USER_IDS (immutable, no API call)
 *   2. Match primary email against ADMIN_EMAILS (requires one Clerk API call)
 *
 * Returns the bypass reason ('user_id' | 'email') or null.
 * Returns null on any error — callers fall through to normal logic.
 */
async function checkAdminBypass(userId: string): Promise<'user_id' | 'email' | null> {
    // Layer 1: immutable user ID — no network call needed
    if (ADMIN_USER_IDS.has(userId)) {
        return 'user_id';
    }

    // Layer 2: email fallback — requires Clerk lookup
    if (ADMIN_EMAILS.size === 0) return null;
    try {
        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const primary = user.emailAddresses?.find(
            e => e.id === user.primaryEmailAddressId
        );
        if (primary && ADMIN_EMAILS.has(primary.emailAddress.toLowerCase())) {
            return 'email';
        }
    } catch {
        // Clerk lookup failed — do not block, fall through
    }

    return null;
}

export async function isInternalOperatorUser(userId: string): Promise<boolean> {
    return (await checkAdminBypass(userId)) !== null;
}

/**
 * Resolve the user's canonical Clerk organization for product routing.
 *
 * The oldest membership is treated as the canonical workspace and the organization
 * is refetched directly to avoid stale embedded metadata from membership listings.
 */
export async function resolveOrganizationContext(
    userId: string
): Promise<ResolvedOrganizationContext | null> {
    try {
        const client = await clerkClient();
        const memberships = await client.users.getOrganizationMembershipList({ userId });

        if (!memberships.data || memberships.data.length === 0) {
            return null;
        }

        const activeMembership = memberships.data.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )[0];

        const organization = await client.organizations.getOrganization({
            organizationId: activeMembership.organization.id,
        });
        const role: WorkspaceRole = activeMembership.role === 'org:admin' ? 'admin' : 'viewer';

        return {
            organizationId: organization.id,
            organizationName: organization.name,
            role,
            publicMetadata: (organization.publicMetadata as Record<string, unknown>) ?? {},
        };
    } catch (error) {
        console.error('[RESOLVE_ORGANIZATION_ERROR]', error);
        return null;
    }
}

/**
 * Resolve the canonical organization for a user, creating one when the account
 * does not yet belong to any Clerk org. This is used by the onboarding funnel,
 * where a brand-new signed-in user may reach /scan before a workspace exists.
 */
export async function resolveOrCreateOrganizationContext(
    userId: string
): Promise<ResolvedOrganizationContext | null> {
    const existing = await resolveOrganizationContext(userId);
    if (existing) return existing;

    try {
        const client = await clerkClient();
        const organization = await client.organizations.createOrganization({
            name: 'Default PayFlux Org',
            createdBy: userId,
        });

        return {
            organizationId: organization.id,
            organizationName: organization.name,
            role: 'admin',
            publicMetadata: (organization.publicMetadata as Record<string, unknown>) ?? {},
        };
    } catch (error) {
        console.error('[CREATE_ORGANIZATION_ERROR]', error);
        return null;
    }
}

/**
 * Given a Clerk userId, resolve the active workspace, role, and tier.
 *
 * Founder bypass runs first:
 *   1. If userId is in ADMIN_USER_IDS → enterprise admin (no API call)
 *   2. If primary email is in ADMIN_EMAILS → enterprise admin
 *   3. Otherwise → normal Clerk org membership + tier logic
 */
export async function resolveWorkspace(
    userId: string,
    options: ResolveWorkspaceOptions = {}
): Promise<WorkspaceContext | null> {
    const { allowAdminBypass = true } = options;

    // ── Founder bypass — before any org/tier/Stripe logic ────────
    if (allowAdminBypass) {
        const bypassReason = await checkAdminBypass(userId);
        if (bypassReason) {
            console.info(`[WORKSPACE] Founder bypass applied via ${bypassReason}`, { userId });
            return FOUNDER_WORKSPACE;
        }
    }

    const org = await resolveOrganizationContext(userId);
    if (!org) return null;

    const workspaceRecord = await resolveOrCreateWorkspaceRecord({
        clerkOrgId: org.organizationId,
        name: org.organizationName,
        ownerClerkUserId: userId,
    });

    return {
        workspaceId: org.organizationId,
        workspaceRecordId: workspaceRecord.id,
        workspaceName: workspaceRecord.name,
        role: org.role,
        tier: workspaceRecord.entitlement_tier,
        paymentStatus: workspaceRecord.payment_status,
        activationState: workspaceRecord.activation_state,
    };
}
