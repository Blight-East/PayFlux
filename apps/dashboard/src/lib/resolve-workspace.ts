import { clerkClient } from '@clerk/nextjs/server';

export type WorkspaceRole = 'admin' | 'viewer';
export type WorkspaceTier = 'free' | 'pro' | 'enterprise';

export interface WorkspaceContext {
    workspaceId: string;
    workspaceName: string;
    role: WorkspaceRole;
    tier: WorkspaceTier;
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
    workspaceName: 'PayFlux Internal',
    role: 'admin',
    tier: 'enterprise',
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

/**
 * Given a Clerk userId, resolve the active workspace, role, and tier.
 *
 * Founder bypass runs first:
 *   1. If userId is in ADMIN_USER_IDS → enterprise admin (no API call)
 *   2. If primary email is in ADMIN_EMAILS → enterprise admin
 *   3. Otherwise → normal Clerk org membership + tier logic
 */
export async function resolveWorkspace(
    userId: string
): Promise<WorkspaceContext | null> {
    // ── Founder bypass — before any org/tier/Stripe logic ────────
    const bypassReason = await checkAdminBypass(userId);
    if (bypassReason) {
        console.info(`[WORKSPACE] Founder bypass applied via ${bypassReason}`, { userId });
        return FOUNDER_WORKSPACE;
    }

    try {
        const client = await clerkClient();

        // Fetch user organization memberships
        const memberships = await client.users.getOrganizationMembershipList({
            userId,
        });

        if (!memberships.data || memberships.data.length === 0) {
            return null;
        }

        // Pick the oldest membership deterministically if multiple exist
        const activeMembership = memberships.data.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )[0];

        const organization = activeMembership.organization;
        const role: WorkspaceRole = activeMembership.role === 'org:admin' ? 'admin' : 'viewer';

        // Extract tier from public metadata, defaulting to 'free'
        const rawTier = organization.publicMetadata?.tier;
        const tier: WorkspaceTier = (rawTier === 'pro' || rawTier === 'enterprise') ? rawTier : 'free';

        return {
            workspaceId: organization.id,
            workspaceName: organization.name,
            role,
            tier,
        };
    } catch (error) {
        console.error('[RESOLVE_WORKSPACE_ERROR]', error);
        return null;
    }
}
