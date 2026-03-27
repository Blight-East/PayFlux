import { clerkClient } from '@clerk/nextjs/server';

export interface ClerkWorkspaceMirrorPatch {
    tier?: 'free' | 'pro' | 'enterprise';
    paymentStatus?: string;
    activationState?: string;
    stripeAccountId?: string;
    stripeConnectionStatus?: string;
    stripeConnectedAt?: string;
    onboardingScanCompleted?: boolean;
    onboardingScanCompletedAt?: string;
    onboardingScanMode?: string;
    onboardingScanResult?: Record<string, unknown>;
}

export async function mirrorWorkspaceStateToClerk(
    clerkOrgId: string,
    patch: ClerkWorkspaceMirrorPatch
): Promise<void> {
    if (!clerkOrgId) return;
    const client = await clerkClient();
    await client.organizations.updateOrganizationMetadata(clerkOrgId, {
        publicMetadata: patch as Record<string, unknown>,
    });
}
