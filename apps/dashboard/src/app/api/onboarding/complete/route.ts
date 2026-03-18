import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { logStageTransition } from '@/lib/onboarding-events';

export const runtime = 'nodejs';

/**
 * POST /api/onboarding/complete
 *
 * Marks user's onboarding scan as complete.
 * Persists `onboardingScanCompleted: true` to Clerk org publicMetadata.
 *
 * Body: { mode: 'UI_SCAN' | 'API_FIRST' | 'NO_SITE' }
 */
export async function POST(request: Request) {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { mode } = body;

        if (!mode || !['UI_SCAN', 'API_FIRST', 'NO_SITE'].includes(mode)) {
            return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
        }

        // Persist scan completion to Clerk org publicMetadata
        const client = await clerkClient();
        const memberships = await client.users.getOrganizationMembershipList({ userId });

        if (memberships.data && memberships.data.length > 0) {
            const org = memberships.data.sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )[0].organization;

            await client.organizations.updateOrganizationMetadata(org.id, {
                publicMetadata: {
                    ...((org.publicMetadata as Record<string, unknown>) ?? {}),
                    onboardingScanCompleted: true,
                    onboardingScanCompletedAt: new Date().toISOString(),
                    onboardingScanMode: mode,
                },
            });

            console.log(`[ONBOARDING_EVENT] ${JSON.stringify({
                event: 'scan_completed',
                userId,
                workspaceId: org.id,
                metadata: { mode },
                timestamp: new Date().toISOString(),
            })}`);

            // Emit stage transition: none → scanned
            logStageTransition('none', 'scanned', { userId, workspaceId: org.id });
        }

        return NextResponse.json({
            success: true,
            onboarding: {
                completed: true,
                step: 'VALUE_REALIZED',
                completedAt: new Date().toISOString(),
                mode,
            },
        });
    } catch (error) {
        console.error('[Onboarding] Error completing onboarding:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
