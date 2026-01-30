export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { generateStateToken } from '@/lib/oauth-state';
import { STRIPE_OAUTH_URL } from '@/lib/urls';

export async function GET() {
    // 1) Require authenticated Clerk user
    const { currentUser } = await import('@clerk/nextjs/server');
    const { userId, orgId } = await auth();
    if (!userId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const client = await clerkClient();

    // 2) Resolve active orgId (create if needed)
    let activeOrgId = orgId;
    if (!activeOrgId) {
        // Try to find an existing org
        const memberships = await client.users.getOrganizationMembershipList({ userId });
        if (memberships.data.length > 0) {
            activeOrgId = memberships.data[0].organization.id;
        } else {
            // No org exists, create one
            const user = await currentUser();
            const orgName = user?.emailAddresses[0]?.emailAddress
                ? `Payflux: ${user.emailAddresses[0].emailAddress.split('@')[0]}`
                : 'My Payflux Org';

            const org = await client.organizations.createOrganization({
                name: orgName,
                createdBy: userId,
            });
            activeOrgId = org.id;
        }
    }

    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const stateSecret = process.env.OAUTH_STATE_SECRET;

    if (!clientId || !stateSecret) {
        console.error('Missing required environment variables for Stripe Connect');
        return NextResponse.redirect(new URL('/onboarding?err=stripe_connect_failed', baseUrl));
    }

    // 3) Generate state as a signed token and persist it
    const state = generateStateToken(activeOrgId, userId);

    // Redirect to Stripe OAuth
    const redirectUri = `${baseUrl}/api/stripe/callback`;

    const stripeUrl = new URL(STRIPE_OAUTH_URL);
    stripeUrl.searchParams.append('response_type', 'code');
    stripeUrl.searchParams.append('client_id', clientId);
    stripeUrl.searchParams.append('scope', 'read_only');
    stripeUrl.searchParams.append('redirect_uri', redirectUri);
    stripeUrl.searchParams.append('state', state);

    return NextResponse.redirect(stripeUrl.toString());
}
