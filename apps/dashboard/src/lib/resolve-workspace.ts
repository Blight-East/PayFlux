import { clerkClient } from '@clerk/nextjs/server';

export type WorkspaceRole = 'admin' | 'viewer';
export type WorkspaceTier = 'free' | 'pro' | 'enterprise';

export interface WorkspaceContext {
    workspaceId: string;
    workspaceName: string;
    role: WorkspaceRole;
    tier: WorkspaceTier;
}

/**
 * Given a Clerk userId, resolve the active workspace, role, and tier.
 * This implementation uses Clerk Organizations as the workspace source.
 */
export async function resolveWorkspace(
    userId: string
): Promise<WorkspaceContext | null> {
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
        const tier = (organization.publicMetadata?.tier as WorkspaceTier) || 'free';

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
