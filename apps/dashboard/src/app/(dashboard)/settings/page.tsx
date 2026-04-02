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
                <p className="text-slate-500 text-sm mt-1">Truthful workspace state, billing state, and activation readiness.</p>
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
                            <p className="text-slate-300">{workspace.tier}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Payment status</p>
                            <p className="text-slate-300">{workspace.paymentStatus ?? 'none'}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Activation state</p>
                            <p className="text-slate-300">{activation?.state ?? workspace.activationState ?? 'not_started'}</p>
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

            <div className="mt-6 rounded-lg border border-blue-500/20 bg-blue-500/5 p-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-blue-300">Self-serve posture</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                    <p>Billing and activation state shown here now reflect real workspace data instead of pilot placeholders.</p>
                    <p>If the workspace is paid but not live, the next self-serve move is usually connecting Stripe or retrying activation.</p>
                    <p>High-risk destructive controls stay out of this page until they are backed by real persistence and safeguards.</p>
                </div>
            </div>

            <ManageBillingSection tier={workspace.tier} />
        </div>
    );
}
