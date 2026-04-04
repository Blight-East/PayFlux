import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { resolveActivationStatus } from '@/lib/activation-state';
import { getMonitoredEntityByWorkspaceId } from '@/lib/db/monitored-entities';
import { getStripeProcessorConnectionByWorkspaceId } from '@/lib/db/processor-connections';
import { findWorkspaceById } from '@/lib/db/workspaces';
import { resolveWorkspace } from '@/lib/resolve-workspace';
import ManageBillingSection from '@/components/ManageBillingSection';

function formatTimestamp(value: string | null | undefined): string {
    if (!value) return 'Not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not available';
    return date.toLocaleString();
}

function humanizeTier(tier: string): string {
    switch (tier) {
        case 'pro': return 'Pro';
        case 'enterprise': return 'Enterprise';
        case 'free': return 'Free';
        default: return tier.charAt(0).toUpperCase() + tier.slice(1);
    }
}

function humanizePaymentStatus(status: string | null | undefined): string {
    switch (status) {
        case 'active': return 'Active';
        case 'trialing': return 'Trial';
        case 'past_due': return 'Past due';
        case 'canceled': return 'Canceled';
        case 'unpaid': return 'Unpaid';
        case 'incomplete': return 'Incomplete';
        case null: case undefined: case 'none': return 'No subscription';
        default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
}

function humanizeActivationState(state: string | null | undefined): string {
    switch (state) {
        case 'live_monitored': return 'Live monitoring active';
        case 'connected_generating': return 'Setting up monitoring';
        case 'paid_unconnected': return 'Awaiting Stripe connection';
        case 'awaiting_activity': return 'Waiting for Stripe activity';
        case 'activation_failed': return 'Setup needs attention';
        case 'not_started': return 'Not started';
        case null: case undefined: return 'Not started';
        default: return state.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
}

export const runtime = 'nodejs';

export default async function SettingsPage() {
    const { userId } = await auth();
    if (!userId) {
        redirect('/sign-in?redirect_url=%2Fsettings');
    }

    const workspace = await resolveWorkspace(userId, { allowAdminBypass: false });
    if (!workspace) {
        redirect('/scan');
    }

    if (workspace.role !== 'admin') {
        redirect('/dashboard');
    }

    const [workspaceRecord, processorConnection, monitoredEntity, activation] = await Promise.all([
        findWorkspaceById(workspace.workspaceRecordId),
        getStripeProcessorConnectionByWorkspaceId(workspace.workspaceRecordId),
        getMonitoredEntityByWorkspaceId(workspace.workspaceRecordId),
        resolveActivationStatus(userId),
    ]);

    return (
        <div className="p-8 max-w-5xl">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight">Workspace Settings</h2>
                <p className="text-slate-500 text-sm mt-1">Your workspace details, billing status, and monitoring readiness.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white">Workspace</h3>
                    <div className="mt-4 space-y-4 text-sm">
                        <div>
                            <p className="text-slate-500">Name</p>
                            <p className="text-slate-300">{workspace.workspaceName}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Tier</p>
                            <p className="text-slate-300">{humanizeTier(workspace.tier)}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Payment status</p>
                            <p className="text-slate-300">{humanizePaymentStatus(workspace.paymentStatus)}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Activation state</p>
                            <p className="text-slate-300">{humanizeActivationState(activation?.state ?? workspace.activationState)}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-950 p-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white">Monitoring readiness</h3>
                    <div className="mt-4 space-y-4 text-sm">
                        <div>
                            <p className="text-slate-500">Stripe connection</p>
                            <p className={processorConnection?.status === 'connected' ? 'text-emerald-400' : 'text-slate-300'}>
                                {processorConnection?.status === 'connected' ? 'Connected' : 'Not connected'}
                            </p>
                        </div>
                        <div>
                            <p className="text-slate-500">Primary host</p>
                            <p className="text-slate-300">{monitoredEntity?.primary_host ?? workspaceRecord?.primary_host_candidate ?? 'Not resolved yet'}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Last processor connection update</p>
                            <p className="text-slate-300">{formatTimestamp(processorConnection?.updated_at)}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Last monitoring sync</p>
                            <p className="text-slate-300">{formatTimestamp(monitoredEntity?.last_sync_at)}</p>
                        </div>
                    </div>
                </div>
            </div>



            <ManageBillingSection tier={workspace.tier} />
        </div>
    );
}
