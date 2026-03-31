import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { resolveWorkspace } from '@/lib/resolve-workspace';
import { getStripeProcessorConnectionByWorkspaceId } from '@/lib/db/processor-connections';

export const runtime = 'nodejs';

export default async function ConnectorsPage() {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const workspace = await resolveWorkspace(userId, { allowAdminBypass: false });
    if (!workspace) redirect('/scan');

    const processorConnection = await getStripeProcessorConnectionByWorkspaceId(workspace.workspaceRecordId);
    const isConnected = processorConnection?.status === 'connected';

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Connectors</h2>
                <p className="text-gray-500 text-sm mt-1">Processor connections for this workspace.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-[#635BFF]/10 rounded-xl flex items-center justify-center">
                            <span className="text-[#635BFF] font-bold text-lg">S</span>
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-gray-900">Stripe</h3>
                            <p className="text-xs text-gray-500 mt-0.5">Connected via Stripe Connect OAuth</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className={`text-xs font-medium ${isConnected ? 'text-emerald-600' : 'text-slate-500'}`}>
                            {isConnected ? 'Connected' : 'Not connected'}
                        </span>
                    </div>
                </div>

                {isConnected && processorConnection ? (
                    <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 gap-6">
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Account ID</p>
                            <p className="text-sm font-mono text-gray-700">
                                {processorConnection.stripe_account_id
                                    ? `${processorConnection.stripe_account_id.slice(0, 14)}...`
                                    : 'Unknown'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Connected at</p>
                            <p className="text-sm text-gray-700">
                                {processorConnection.connected_at
                                    ? new Date(processorConnection.connected_at).toLocaleDateString('en-US', {
                                        month: 'short', day: 'numeric', year: 'numeric',
                                    })
                                    : 'Unknown'}
                            </p>
                        </div>
                        {processorConnection.oauth_scope && (
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Scope</p>
                                <p className="text-sm text-gray-700">{processorConnection.oauth_scope}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                            No processor is connected to this workspace. Complete the activation flow to connect Stripe.
                        </p>
                        {(workspace.tier === 'pro' || workspace.tier === 'enterprise') && (
                            <a
                                href="/activate"
                                className="mt-4 inline-flex items-center rounded-lg bg-[#0A64BC] px-4 py-2 text-sm font-medium text-white no-underline transition-colors hover:bg-[#08539e]"
                            >
                                Connect Stripe
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
