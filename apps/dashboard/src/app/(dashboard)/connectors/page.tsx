import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getMonitoredEntityByWorkspaceId } from '@/lib/db/monitored-entities';
import { getStripeProcessorConnectionByWorkspaceId } from '@/lib/db/processor-connections';
import { findWorkspaceById } from '@/lib/db/workspaces';
import { resolveActivationStatus } from '@/lib/activation-state';
import { resolveWorkspace } from '@/lib/resolve-workspace';

function formatTimestamp(value: string | null | undefined): string {
    if (!value) return 'Not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not available';
    return date.toLocaleString();
}

function maskStripeAccountId(value: string | null | undefined): string {
    if (!value) return 'Not connected';
    if (value.length <= 8) return value;
    return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export const runtime = 'nodejs';

export default async function ConnectorsPage() {
    const { userId } = await auth();
    if (!userId) {
        redirect('/sign-in?redirect_url=%2Fconnectors');
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

    const stripeConnected = processorConnection?.status === 'connected';
    const activationState = activation?.state ?? workspace.activationState ?? 'not_started';
    const primaryHost = monitoredEntity?.primary_host ?? workspaceRecord?.primary_host_candidate ?? null;

    return (
        <div className="p-8 max-w-5xl">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight">Connectors</h2>
                <p className="text-slate-500 text-sm mt-1">Connect Stripe through OAuth and let PayFlux activate live monitoring inside your workspace.</p>
            </div>

            <div className="grid gap-6">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Primary processor</p>
                            <h3 className="mt-2 text-lg font-semibold text-white">Stripe</h3>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                                This hosted flow is OAuth-first. Customers do not need to paste webhook secrets here for the core Stripe onboarding path.
                            </p>
                        </div>
                        <a
                            href="/api/stripe/authorize"
                            className="inline-flex items-center justify-center rounded bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-slate-200"
                        >
                            {stripeConnected ? 'Reconnect Stripe' : 'Connect Stripe'}
                        </a>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-white">Connection state</h3>
                        <div className="mt-4 space-y-4 text-sm">
                            <div>
                                <p className="text-slate-500">Status</p>
                                <p className={stripeConnected ? 'text-emerald-400' : 'text-slate-300'}>
                                    {stripeConnected ? 'Connected' : 'Not connected'}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-500">Stripe account</p>
                                <p className="font-mono text-slate-300">{maskStripeAccountId(processorConnection?.stripe_account_id)}</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Connected at</p>
                                <p className="text-slate-300">{formatTimestamp(processorConnection?.connected_at)}</p>
                            </div>
                            <div>
                                <p className="text-slate-500">OAuth scope</p>
                                <p className="text-slate-300">{processorConnection?.oauth_scope ?? 'Not available'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-950 p-6">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-white">Activation state</h3>
                        <div className="mt-4 space-y-4 text-sm">
                            <div>
                                <p className="text-slate-500">Workspace activation</p>
                                <p className="text-slate-300">{activationState}</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Primary monitored host</p>
                                <p className="text-slate-300">{primaryHost ?? 'Not resolved yet'}</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Live monitoring</p>
                                <p className={activationState === 'live_monitored' ? 'text-emerald-400' : 'text-slate-300'}>
                                    {activationState === 'live_monitored' ? 'Active' : 'Not live yet'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-amber-400">What this page no longer assumes</h3>
                    <div className="mt-3 space-y-2 text-sm text-slate-300">
                        <p>Webhook secrets are not the main self-serve path for hosted Stripe onboarding.</p>
                        <p>The customer-facing product path is: pay, connect Stripe, let activation run, then land in the live dashboard.</p>
                        <p>If activation is stuck, the fix is usually Stripe readiness, business URL quality, or insufficient recent activity.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
