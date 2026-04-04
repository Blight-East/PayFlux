import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/require-auth';
import { findWorkspaceById } from '@/lib/db/workspaces';
import { getMonitoredEntityByWorkspaceId } from '@/lib/db/monitored-entities';
import { getStripeProcessorConnectionByWorkspaceId } from '@/lib/db/processor-connections';
import { resolveStripeActivationPreflight } from '@/lib/stripe-activation-preflight';

export const runtime = 'nodejs';

export async function GET() {
    const authResult = await requireAuth({ allowAdminBypass: false });
    if (!authResult.ok) return authResult.response;

    if (authResult.workspace.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden', code: 'ADMIN_REQUIRED' }, { status: 403 });
    }

    const [workspaceRecord, monitoredEntity, processorConnection] = await Promise.all([
        findWorkspaceById(authResult.workspace.workspaceRecordId),
        getMonitoredEntityByWorkspaceId(authResult.workspace.workspaceRecordId),
        getStripeProcessorConnectionByWorkspaceId(authResult.workspace.workspaceRecordId),
    ]);

    const preflight = await resolveStripeActivationPreflight({
        stripeAccountId: processorConnection?.status === 'connected' ? processorConnection.stripe_account_id : null,
        knownPrimaryHost: monitoredEntity?.primary_host ?? workspaceRecord?.primary_host_candidate ?? null,
    });

    return NextResponse.json(preflight);
}
