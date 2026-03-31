import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { resolveWorkspace } from '@/lib/resolve-workspace';
import { resolveActivationStatus } from '@/lib/activation-state';
import { getStripeProcessorConnectionByWorkspaceId } from '@/lib/db/processor-connections';

export const runtime = 'nodejs';

function tierLabel(tier: string): string {
    switch (tier) {
        case 'enterprise': return 'Enterprise';
        case 'pro': return 'Pro';
        default: return 'Free';
    }
}

function activationLabel(state: string | undefined): { text: string; color: string } {
    switch (state) {
        case 'active': return { text: 'Active', color: 'bg-emerald-500' };
        case 'paid_unconnected': return { text: 'Awaiting processor connection', color: 'bg-amber-500' };
        case 'connected_generating': return { text: 'Activation in progress', color: 'bg-amber-500' };
        default: return { text: 'Not activated', color: 'bg-slate-400' };
    }
}

function paymentLabel(status: string | undefined): { text: string; color: string } {
    switch (status) {
        case 'current': return { text: 'Current', color: 'text-emerald-600' };
        case 'past_due': return { text: 'Past due', color: 'text-red-600' };
        case 'cancelled': return { text: 'Cancelled', color: 'text-slate-500' };
        default: return { text: 'No subscription', color: 'text-slate-500' };
    }
}

export default async function SettingsPage() {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const workspace = await resolveWorkspace(userId, { allowAdminBypass: false });
    if (!workspace) redirect('/scan');

    const processorConnection = await getStripeProcessorConnectionByWorkspaceId(workspace.workspaceRecordId);
    const activation = await resolveActivationStatus(userId);

    const tier = tierLabel(workspace.tier);
    const activationState = activationLabel(workspace.activationState);
    const payment = paymentLabel(workspace.paymentStatus);

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h2>
                <p className="text-gray-500 text-sm mt-1">Workspace configuration and subscription details.</p>
            </div>

            <div className="space-y-6">
                {/* Subscription */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mb-6">Subscription</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Plan</p>
                            <p className="text-lg font-semibold text-gray-900">{tier}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Payment status</p>
                            <p className={`text-lg font-semibold ${payment.color}`}>{payment.text}</p>
                        </div>
                    </div>
                </div>

                {/* Activation state */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mb-6">Activation</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Status</p>
                            <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full ${activationState.color}`} />
                                <p className="text-sm font-medium text-gray-900">{activationState.text}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Processor</p>
                            <p className="text-sm font-medium text-gray-900">
                                {processorConnection?.status === 'connected'
                                    ? `Stripe (${processorConnection.stripe_account_id?.slice(0, 12)}...)`
                                    : 'Not connected'}
                            </p>
                        </div>
                    </div>
                    {activation?.meta?.activationCompletedAt && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Activated at</p>
                            <p className="text-xs text-gray-500 font-mono">
                                {new Date(activation.meta.activationCompletedAt).toLocaleString('en-US', {
                                    month: 'short', day: 'numeric', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
                                })} UTC
                            </p>
                        </div>
                    )}
                </div>

                {/* Workspace */}
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <h3 className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mb-6">Workspace</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Name</p>
                            <p className="text-sm font-medium text-gray-900">{workspace.workspaceName}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Role</p>
                            <p className="text-sm font-medium text-gray-900 capitalize">{workspace.role}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
