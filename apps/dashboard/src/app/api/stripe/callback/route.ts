export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from "next/server";
import { mirrorWorkspaceStateToClerk } from '@/lib/clerk-mirror';
import { ensurePendingActivationRun } from '@/lib/db/activation-runs';
import { upsertMonitoredEntityForStripeConnection } from '@/lib/db/monitored-entities';
import { upsertStripeProcessorConnection } from '@/lib/db/processor-connections';
import { resolveOrCreateWorkspaceRecord, updateWorkspaceState } from '@/lib/db/workspaces';
import { validateAndConsumeStateDetailed } from '@/lib/oauth-state';
import { logOnboardingEvent, logStageTransition } from '@/lib/onboarding-events-server';

type CallbackStage =
    | 'entry'
    | 'auth_ok'
    | 'auth_missing'
    | 'state_ok'
    | 'state_fail'
    | 'token_exchange_start'
    | 'token_exchange_fail'
    | 'org_fetch_ok'
    | 'org_fetch_fail'
    | 'workspace_resolved'
    | 'workspace_resolve_fail'
    | 'processor_upsert_ok'
    | 'processor_upsert_fail'
    | 'monitored_entity_upsert_ok'
    | 'monitored_entity_upsert_fail'
    | 'activation_enqueued'
    | 'activation_enqueue_fail'
    | 'post_persist_fail'
    | 'success_redirect';

function logCallbackStage(requestId: string, stage: CallbackStage, data: Record<string, unknown> = {}) {
    console.info('[STRIPE_CALLBACK]', JSON.stringify({ requestId, stage, ...data }));
}

function getStripeErrorPayload(err: unknown): Record<string, unknown> {
    if (!err || typeof err !== 'object') {
        return { message: String(err) };
    }

    const stripeErr = err as {
        type?: string;
        code?: string;
        statusCode?: number;
        message?: string;
    };

    return {
        type: stripeErr.type ?? 'unknown',
        code: stripeErr.code ?? null,
        statusCode: stripeErr.statusCode ?? null,
        message: stripeErr.message ?? 'Unknown Stripe error',
    };
}

export async function GET(req: NextRequest) {
    const requestId = randomUUID();
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
    const redirectUri = process.env.STRIPE_CONNECT_REDIRECT_URI
        || `${baseUrl.replace(/\/$/, '')}/api/stripe/callback`;

    logCallbackStage(requestId, 'entry', {
        hasCode: Boolean(code),
        hasState: Boolean(state),
        hasError: Boolean(error),
    });

    if (error) {
        console.error('Stripe OAuth error:', error, errorDescription);
        return NextResponse.redirect(`${baseUrl}/connect?err=stripe_connect_failed`);
    }

    if (!code || !state) {
        return NextResponse.redirect(`${baseUrl}/connect?err=stripe_connect_failed`);
    }

    // 1) Verify the request is associated with an authenticated Clerk user
    const { userId, orgId } = await auth();
    if (!userId) {
        logCallbackStage(requestId, 'auth_missing', { authOrgId: orgId ?? null });
        return NextResponse.redirect(`${baseUrl}/login`);
    }
    logCallbackStage(requestId, 'auth_ok', { userId, authOrgId: orgId ?? null });

    // 2) Validate state exists, not expired, matches userId, then consume it
    const stateResult = await validateAndConsumeStateDetailed(state, userId);
    if (!stateResult.ok) {
        logCallbackStage(requestId, 'state_fail', {
            userId,
            authOrgId: orgId ?? null,
            reason: stateResult.reason,
        });
        return NextResponse.redirect(`${baseUrl}/connect?err=invalid_state`);
    }
    const oauthState = stateResult.state;
    logCallbackStage(requestId, 'state_ok', {
        userId,
        authOrgId: orgId ?? null,
        stateOrgId: oauthState.orgId,
    });

    logCallbackStage(requestId, 'token_exchange_start', {
        userId,
        stateOrgId: oauthState.orgId,
    });

    let response;
    try {
        response = await stripe.oauth.token({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
        } as any);
    } catch (err) {
        logCallbackStage(requestId, 'token_exchange_fail', {
        userId,
        authOrgId: orgId ?? null,
        stateOrgId: oauthState.orgId,
        ...getStripeErrorPayload(err),
    });
    return NextResponse.redirect(`${baseUrl}/dashboard?err=stripe_connect_failed&reason=token_exchange_fail&msg=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`);
    }

    const stripeAccountId = response.stripe_user_id;
    if (!stripeAccountId) {
        logCallbackStage(requestId, 'token_exchange_fail', {
        userId,
        authOrgId: orgId ?? null,
        stateOrgId: oauthState.orgId,
        ...getStripeErrorPayload(err),
    });
    return NextResponse.redirect(`${baseUrl}/dashboard?err=stripe_connect_failed&reason=token_exchange_fail&msg=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`);
    }

    // 3) Use the orgId from the validated state
    const activeOrgId = oauthState.orgId;
    const client = await clerkClient();

    let org;
    try {
        org = await client.organizations.getOrganization({ organizationId: activeOrgId });
        logCallbackStage(requestId, 'org_fetch_ok', {
            userId,
            authOrgId: orgId ?? null,
            stateOrgId: activeOrgId,
        });
    } catch (err) {
        logCallbackStage(requestId, 'org_fetch_fail', {
        userId, authOrgId: orgId ?? null, stateOrgId: activeOrgId, message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.redirect(`${baseUrl}/dashboard?err=stripe_connect_failed&reason=org_fetch_fail&msg=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`);
    }

    let workspace;
    try {
        workspace = await resolveOrCreateWorkspaceRecord({
            clerkOrgId: activeOrgId,
            name: org.name,
            ownerClerkUserId: userId,
        });
        logCallbackStage(requestId, 'workspace_resolved', {
            userId,
            authOrgId: orgId ?? null,
            stateOrgId: activeOrgId,
            workspaceId: workspace.id,
            workspaceTier: workspace.entitlement_tier,
        });
    } catch (err) {
        logCallbackStage(requestId, 'workspace_resolve_fail', {
        userId, authOrgId: orgId ?? null, stateOrgId: activeOrgId, message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.redirect(`${baseUrl}/dashboard?err=stripe_connect_failed&reason=workspace_resolve_fail&msg=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`);
    }

    const oauthScope = String((response as any).scope ?? 'unknown');

    let processorConnection;
    try {
        const expiresIn = (response as any).expires_in;
        const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;
        processorConnection = await upsertStripeProcessorConnection({
            workspaceId: workspace.id,
            stripeAccountId,
            oauthScope,
            accessToken: (response as any).access_token,
            refreshToken: (response as any).refresh_token,
            tokenExpiresAt,
            status: 'connected',
            connectionMetadata: {
                livemode: Boolean((response as any).livemode ?? false),
                scope: oauthScope,
            },
        });
        logCallbackStage(requestId, 'processor_upsert_ok', {
            userId,
            authOrgId: orgId ?? null,
            stateOrgId: activeOrgId,
            workspaceId: workspace.id,
            workspaceTier: workspace.entitlement_tier,
        });
    } catch (err) {
        logCallbackStage(requestId, 'processor_upsert_fail', {
        userId, authOrgId: orgId ?? null, stateOrgId: activeOrgId, workspaceId: workspace.id, workspaceTier: workspace.entitlement_tier, message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.redirect(`${baseUrl}/dashboard?err=stripe_connect_failed&reason=processor_upsert_fail&msg=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`);
    }

    let monitoredEntity;
    try {
        monitoredEntity = await upsertMonitoredEntityForStripeConnection({
            workspaceId: workspace.id,
            processorConnectionId: processorConnection.id,
            primaryHost: workspace.primary_host_candidate,
            primaryHostSource: workspace.primary_host_candidate ? 'scan' : 'unknown',
            status: 'pending',
        });
        logCallbackStage(requestId, 'monitored_entity_upsert_ok', {
            userId,
            authOrgId: orgId ?? null,
            stateOrgId: activeOrgId,
            workspaceId: workspace.id,
            workspaceTier: workspace.entitlement_tier,
        });
    } catch (err) {
        logCallbackStage(requestId, 'monitored_entity_upsert_fail', {
        userId, authOrgId: orgId ?? null, stateOrgId: activeOrgId, workspaceId: workspace.id, workspaceTier: workspace.entitlement_tier, message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.redirect(`${baseUrl}/dashboard?err=stripe_connect_failed&reason=monitored_entity_upsert_fail&msg=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`);
    }

    if (workspace.entitlement_tier === 'pro' || workspace.entitlement_tier === 'enterprise') {
        try {
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
            logCallbackStage(requestId, 'activation_enqueued', {
                userId,
                authOrgId: orgId ?? null,
                stateOrgId: activeOrgId,
                workspaceId: workspace.id,
                workspaceTier: workspace.entitlement_tier,
            });
        } catch (err) {
            logCallbackStage(requestId, 'activation_enqueue_fail', {
        userId, authOrgId: orgId ?? null, stateOrgId: activeOrgId, workspaceId: workspace.id, workspaceTier: workspace.entitlement_tier, message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.redirect(`${baseUrl}/dashboard?err=stripe_connect_failed&reason=activation_enqueue_fail&msg=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`);
        }
    }

    try {
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

        logStageTransition('scanned', 'connected_free', { userId, workspaceId: workspace.id });

        const redirectTarget = workspace.entitlement_tier === 'pro' || workspace.entitlement_tier === 'enterprise'
            ? `${baseUrl}/activate/arming`
            : `${baseUrl}/dashboard`;

        logCallbackStage(requestId, 'success_redirect', {
            userId,
            authOrgId: orgId ?? null,
            stateOrgId: activeOrgId,
            workspaceId: workspace.id,
            workspaceTier: workspace.entitlement_tier,
            redirectTarget,
        });

        return NextResponse.redirect(redirectTarget);
    } catch (err) {
        logCallbackStage(requestId, 'post_persist_fail', {
        userId, authOrgId: orgId ?? null, stateOrgId: activeOrgId, workspaceId: workspace.id, workspaceTier: workspace.entitlement_tier, message: err instanceof Error ? err.message : String(err), redirectTarget: `${baseUrl}/connect?err=stripe_connect_failed`,
    });
    return NextResponse.redirect(`${baseUrl}/dashboard?err=stripe_connect_failed&reason=post_persist_fail&msg=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`);
    }
}
