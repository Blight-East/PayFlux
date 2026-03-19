export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { validateAndConsumeState } from '@/lib/oauth-state';
import { logOnboardingEvent, logStageTransition } from '@/lib/onboarding-events-server';

export async function GET(req: NextRequest) {
    const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    const sk = process.env.CLERK_SECRET_KEY;
    const ssk = process.env.STRIPE_SECRET_KEY;
    if (!pk?.startsWith("pk_") || !sk?.startsWith("sk_") || !ssk) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        return NextResponse.redirect(new URL("/connect?err=stripe_connect_failed", baseUrl));
    }

    const { auth, clerkClient } = await import("@clerk/nextjs/server");
    const { default: Stripe } = await import("stripe");

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        // @ts-ignore
        apiVersion: '2024-12-18.acacia',
    });

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (error) {
        console.error('Stripe OAuth error:', error, errorDescription);
        return NextResponse.redirect(`${baseUrl}/connect?err=stripe_connect_failed`);
    }

    if (!code || !state) {
        return NextResponse.redirect(`${baseUrl}/connect?err=stripe_connect_failed`);
    }

    // 1) Verify the request is associated with an authenticated Clerk user
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.redirect(`${baseUrl}/login`);
    }

    // 2) Validate state exists, not expired, matches userId, then consume it
    const oauthState = await validateAndConsumeState(state, userId);
    if (!oauthState) {
        console.error('Hardened State Validation Failed');
        return NextResponse.redirect(`${baseUrl}/connect?err=invalid_state`);
    }

    try {
        // Exchange the OAuth code for a stripe_user_id
        const response = await stripe.oauth.token({
            grant_type: 'authorization_code',
            code,
        });

        const stripeAccountId = response.stripe_user_id;
        if (!stripeAccountId) {
            throw new Error('No Stripe account ID returned from token exchange');
        }

        const client = await clerkClient();

        // 3) Use the orgId from the validated state
        const activeOrgId = oauthState.orgId;

        // 4) Update the organization publicMetadata
        await client.organizations.updateOrganizationMetadata(activeOrgId, {
            publicMetadata: {
                stripeAccountId,
                stripeConnectedAt: new Date().toISOString(),
                stripeConnectionStatus: 'CONNECTED',
            },
        });

        console.log(`Successfully persisted Stripe Account: ${stripeAccountId} to Clerk Org: ${activeOrgId}`);

        logOnboardingEvent('connect_completed', {
            userId,
            workspaceId: activeOrgId,
            metadata: { stripeAccountId },
        });

        // Emit stage transition: scanned → connected_free
        logStageTransition('scanned', 'connected_free', { userId, workspaceId: activeOrgId });

        // 5) Check if user is paid — route to activation arming if so, otherwise dashboard
        const org = await client.organizations.getOrganization({ organizationId: activeOrgId });
        const tier = (org.publicMetadata as Record<string, unknown>)?.tier;
        if (tier === 'pro' || tier === 'enterprise') {
            return NextResponse.redirect(`${baseUrl}/activate/arming`);
        }
        return NextResponse.redirect(`${baseUrl}/dashboard`);
    } catch (err: any) {
        console.error('Stripe Connection Failure (Safely Logged):', err.message);
        // 6) On any failure, redirect to /onboarding?err=stripe_connect_failed
        return NextResponse.redirect(`${baseUrl}/connect?err=stripe_connect_failed`);
    }
}
