import { NextResponse } from 'next/server';
import { resolveActivationStatus } from '@/lib/activation-state';
import { getMonitoredEntityByWorkspaceId } from '@/lib/db/monitored-entities';
import { getStripeProcessorConnectionByWorkspaceId } from '@/lib/db/processor-connections';
import { requireAuth } from '@/lib/require-auth';

export const runtime = 'nodejs';

export async function GET() {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;

    if (authResult.workspace.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden', code: 'ADMIN_REQUIRED' }, { status: 403 });
    }

    const [processorConnection, monitoredEntity, activation] = await Promise.all([
        getStripeProcessorConnectionByWorkspaceId(authResult.workspace.workspaceRecordId),
        getMonitoredEntityByWorkspaceId(authResult.workspace.workspaceRecordId),
        resolveActivationStatus(authResult.userId),
    ]);

    return NextResponse.json({
        provider: 'stripe',
        connected: processorConnection?.status === 'connected',
        stripeAccountId: processorConnection?.stripe_account_id ?? null,
        connectedAt: processorConnection?.connected_at ?? null,
        oauthScope: processorConnection?.oauth_scope ?? null,
        activationState: activation?.state ?? authResult.workspace.activationState ?? 'not_started',
        primaryHost: monitoredEntity?.primary_host ?? null,
    });
}

export async function POST() {
    const authResult = await requireAuth();
    if (!authResult.ok) return authResult.response;

    if (authResult.workspace.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden', code: 'ADMIN_REQUIRED' }, { status: 403 });
    }

    return NextResponse.json(
        {
            error: 'Manual connector secret entry is not used in the hosted Stripe onboarding flow.',
            code: 'OAUTH_REQUIRED',
            nextStep: '/api/stripe/authorize',
        },
        { status: 405 }
    );
}
