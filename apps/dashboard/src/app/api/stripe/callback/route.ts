export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { mirrorWorkspaceStateToClerk } from '@/lib/clerk-mirror';
import { ensurePendingActivationRun } from '@/lib/db/activation-runs';
import { upsertMonitoredEntityForStripeConnection } from '@/lib/db/monitored-entities';
import { upsertStripeProcessorConnection } from '@/lib/db/processor-connections';
import { resolveOrCreateWorkspaceRecord, updateWorkspaceState } from '@/lib/db/workspaces';
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

        // 3) Use the orgId from the validated state
        const activeOrgId = oauthState.orgId;
        const client = await clerkClient();
        const org = await client.organizations.getOrganization({ organizationId: activeOrgId });
        const workspace = await resolveOrCreateWorkspaceRecord({
            clerkOrgId: activeOrgId,
            name: org.name,
            ownerClerkUserId: userId,
        });
        const oauthScope = String((response as any).scope ?? 'unknown');

        const processorConnection = await upsertStripeProcessorConnection({
            workspaceId: workspace.id,
            stripeAccountId,
            oauthScope,
            status: 'connected',
            connectionMetadata: {
                livemode: Boolean((response as any).livemode ?? false),
                scope: oauthScope,
            },
        });

        const monitoredEntity = await upsertMonitoredEntityForStripeConnection({
            workspaceId: workspace.id,
            processorConnectionId: processorConnection.id,
            primaryHost: workspace.primary_host_candidate,
            primaryHostSource: workspace.primary_host_candidate ? 'scan' : 'unknown',
            status: 'pending',
        });

        if (workspace.entitlement_tier === 'pro' || workspace.entitlement_tier === 'enterprise') {
            await updateWorkspaceState({
                workspaceId: workspace.id,
                activationState: 'ready_for_activation',
            });

            await ensurePendingActivationRun({
                workspaceId: workspace.id,
                processorConnectionId: processorConnection.id,
                monitoredEntityId: monitoredEntity.id,
                trigger: 'post_connect',
                triggeredBy: 'user',
            });
        }

        await mirrorWorkspaceStateToClerk(activeOrgId, {
            stripeAccountId,
            stripeConnectedAt: new Date().toISOString(),
            stripeConnectionStatus: 'CONNECTED',
            ...(workspace.entitlement_tier === 'pro' || workspace.entitlement_tier === 'enterprise'
                ? { activationState: 'ready_for_activation' }
                : {}),
        });

        console.log(`Successfully persisted Stripe Account: ${stripeAccountId} to Workspace: ${workspace.id} (Clerk Org: ${activeOrgId})`);

        logOnboardingEvent('stripe_connect_completed', {
            userId,
            workspaceId: workspace.id,
            metadata: { stripeAccountId, clerkOrgId: activeOrgId, oauthScope },
        });

        // Emit stage transition: scanned -> connected_free
        logStageTransition('scanned', 'connected_free', { userId, workspaceId: workspace.id });

        // 5) Check if user is paid — route to activation arming if so, otherwise dashboard
        if (workspace.entitlement_tier === 'pro' || workspace.entitlement_tier === 'enterprise') {
            return NextResponse.redirect(`${baseUrl}/activate/arming`);
        }
        return NextResponse.redirect(`${baseUrl}/dashboard`);
    } catch (err: any) {
        console.error('Stripe Connection Failure (Safely Logged):', err.message);
        // 6) On any failure, redirect to /onboarding?err=stripe_connect_failed
        return NextResponse.redirect(`${baseUrl}/connect?err=stripe_connect_failed`);
    }
}
