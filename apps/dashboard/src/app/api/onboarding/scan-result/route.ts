import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET /api/onboarding/scan-result
 *
 * Returns the persisted scan summary from Clerk org publicMetadata.
 * Used as a durable fallback when sessionStorage is empty
 * (e.g., page refresh, bookmark, return visit).
 */
export async function GET() {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const client = await clerkClient();
        const memberships = await client.users.getOrganizationMembershipList({ userId });

        if (!memberships.data || memberships.data.length === 0) {
            return NextResponse.json({ scanResult: null });
        }

        const org = memberships.data.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )[0].organization;

        const meta = org.publicMetadata as Record<string, unknown> | undefined;
        const scanResult = meta?.onboardingScanResult ?? null;

        return NextResponse.json({ scanResult });
    } catch (error) {
        console.error('[Onboarding] Error fetching scan result:', error);
        return NextResponse.json({ scanResult: null });
    }
}
