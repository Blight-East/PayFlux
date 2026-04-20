import { clerkClient } from '@clerk/nextjs/server';

import { resolveOrCreateWorkspaceRecord } from './db/workspaces';
import type { WorkspaceContext, WorkspaceRole, WorkspaceTier } from './resolve-workspace';

export interface ActiveOrganizationSnapshot {
    id: string;
    name: string;
    slug: string | null;
    imageUrl: string | null;
    hasImage: boolean;
    publicMetadata: Record<string, unknown>;
}

export interface ActiveWorkspaceContext extends WorkspaceContext {
    organization: ActiveOrganizationSnapshot;
}

function resolveTier(rawTier: unknown): WorkspaceTier {
    return rawTier === 'pro' || rawTier === 'enterprise' ? rawTier : 'free';
}

function resolveRole(role: string | undefined): WorkspaceRole {
    return role === 'org:admin' ? 'admin' : 'viewer';
}

function toOrganizationSnapshot(organization: any): ActiveOrganizationSnapshot {
    return {
        id: String(organization.id),
        name: String(organization.name ?? ''),
        slug: typeof organization.slug === 'string' ? organization.slug : null,
        imageUrl: typeof organization.imageUrl === 'string' ? organization.imageUrl : null,
        hasImage: Boolean(organization.hasImage),
        publicMetadata:
            organization.publicMetadata &&
            typeof organization.publicMetadata === 'object' &&
            !Array.isArray(organization.publicMetadata)
                ? { ...organization.publicMetadata }
                : {},
    };
}

async function toWorkspaceContext(
    organization: any,
    role: WorkspaceRole,
    userId: string
): Promise<ActiveWorkspaceContext> {
    const snapshot = toOrganizationSnapshot(organization);

    // The DB workspace record is the canonical join key for billing,
    // processor connections, and activation. Provision it lazily so the
    // first interactive request after sign-up still gets a valid id.
    const workspaceRecord = await resolveOrCreateWorkspaceRecord({
        clerkOrgId: snapshot.id,
        name: snapshot.name,
        ownerClerkUserId: userId,
    });

    return {
        workspaceId: snapshot.id,
        workspaceRecordId: workspaceRecord.id,
        workspaceName: snapshot.name,
        role,
        tier: resolveTier(snapshot.publicMetadata?.tier),
        organization: snapshot,
    };
}

export async function resolveOrCreateActiveWorkspace(
    userId: string,
    activeOrgId?: string | null
): Promise<ActiveWorkspaceContext> {
    const client = await clerkClient();
    const memberships = await client.users.getOrganizationMembershipList({ userId });

    const sortedMemberships = [...(memberships?.data ?? [])].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    if (activeOrgId) {
        const activeMembership = sortedMemberships.find(
            (membership) => membership.organization.id === activeOrgId
        );
        if (activeMembership) {
            return toWorkspaceContext(
                activeMembership.organization,
                resolveRole(activeMembership.role),
                userId
            );
        }

        const organization = await client.organizations.getOrganization({
            organizationId: activeOrgId,
        });
        return toWorkspaceContext(organization, 'admin', userId);
    }

    if (sortedMemberships.length > 0) {
        const membership = sortedMemberships[0];
        return toWorkspaceContext(
            membership.organization,
            resolveRole(membership.role),
            userId
        );
    }

    const organization = await client.organizations.createOrganization({
        name: 'Default PayFlux Org',
        createdBy: userId,
        publicMetadata: {
            tier: 'free',
        },
    });

    return toWorkspaceContext(organization, 'admin', userId);
}
