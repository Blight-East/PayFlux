'use client';

import { useState } from 'react';

type SettingsClientProps = {
    workspaceName: string;
    tier: 'free' | 'pro' | 'enterprise';
    role: 'admin' | 'viewer';
};

function formatTierLabel(tier: SettingsClientProps['tier']) {
    if (tier === 'enterprise') {
        return {
            name: 'Enterprise',
            description: 'Full workspace access with advanced exports and the broadest visibility.',
        };
    }

    if (tier === 'pro') {
        return {
            name: 'Pro',
            description: 'Main dashboard access, reserve estimates, and evidence views for the workspace.',
        };
    }

    return {
        name: 'Free',
        description: 'Basic access for early setup and limited risk visibility.',
    };
}

export default function SettingsClient({
    workspaceName,
    tier,
    role,
}: SettingsClientProps) {
    const [inboundEnabled, setInboundEnabled] = useState(true);
    const [outboundEnabled, setOutboundEnabled] = useState(true);
    const [portalLoading, setPortalLoading] = useState(false);
    const [portalError, setPortalError] = useState<string | null>(null);

    const tierInfo = formatTierLabel(tier);

    async function openCustomerPortal() {
        setPortalLoading(true);
        setPortalError(null);

        try {
            const response = await fetch('/api/portal', {
                method: 'POST',
            });
            const data = await response.json();

            if (!response.ok || !data?.url) {
                throw new Error(data?.error ?? 'Unable to open billing portal');
            }

            window.location.href = data.url;
        } catch (error) {
            setPortalLoading(false);
            setPortalError(error instanceof Error ? error.message : 'Unable to open billing portal');
        }
    }

    return (
        <div className="mx-auto max-w-4xl px-2 pb-8 pt-4">
            <div className="mb-10 flex flex-col gap-5 border-b border-white/8 pb-8">
                <div className="pf-kicker">settings</div>
                <h1 className="pf-editorial text-4xl leading-tight text-[var(--pf-paper)] md:text-[3.1rem]">
                    Manage billing, workspace controls, and the settings that shape your account.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-[var(--pf-text-soft)]">
                    This area is for workspace admins. It is where billing, connector controls, and account-wide settings live.
                </p>
            </div>

            <div className="space-y-6">
                <div className="pf-panel rounded-[1.75rem] p-6 md:p-7">
                    <h3 className="pf-kicker mb-6">Subscription & Workspace</h3>
                    <div className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-black/18 p-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-lg font-bold tracking-tight text-[var(--pf-accent)]">
                                {tierInfo.name}
                                <span className="ml-2 text-sm font-normal text-[var(--pf-muted)]">
                                    {workspaceName}
                                </span>
                            </p>
                            <p className="mt-1 text-xs text-[var(--pf-text-soft)]">{tierInfo.description}</p>
                        </div>
                        <div className="text-xs text-[var(--pf-text-soft)]">
                            Workspace role: <span className="text-[var(--pf-paper)]">{role === 'admin' ? 'Admin' : 'Viewer'}</span>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={openCustomerPortal}
                            disabled={portalLoading}
                            className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-bold text-[var(--pf-paper)] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:border-white/6 disabled:text-[var(--pf-muted)]"
                        >
                            {portalLoading ? 'Opening Billing…' : 'Manage Billing'}
                        </button>
                        <p className="text-xs text-[var(--pf-text-soft)]">
                            Update cards, cancel your subscription, or download invoices in Stripe Customer Portal.
                        </p>
                    </div>
                    {portalError && (
                        <p className="mt-3 text-xs text-red-400">{portalError}</p>
                    )}
                    <div className="mt-6 flex items-center space-x-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-[var(--pf-cool)]"></div>
                        <span className="text-xs font-medium text-[var(--pf-text-soft)]">Admin controls available</span>
                    </div>
                </div>

                <div className="pf-panel rounded-[1.75rem] p-6 md:p-7">
                    <h3 className="pf-kicker mb-6">Local Control Flags</h3>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-[var(--pf-paper)]">Pause inbound webhooks</p>
                                <p className="text-xs text-[var(--pf-text-soft)]">Temporarily stop processing new events from connected processors.</p>
                            </div>
                            <button
                                onClick={() => setInboundEnabled(!inboundEnabled)}
                                className={`relative h-5 w-10 rounded-full transition-colors ${inboundEnabled ? 'bg-[rgba(126,207,195,0.35)]' : 'bg-red-900'}`}
                            >
                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${inboundEnabled ? 'left-6' : 'left-1'}`}></div>
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-[var(--pf-paper)]">Pause outbound alerts</p>
                                <p className="text-xs text-[var(--pf-text-soft)]">Temporarily stop notifications and alert deliveries.</p>
                            </div>
                            <button
                                onClick={() => setOutboundEnabled(!outboundEnabled)}
                                className={`relative h-5 w-10 rounded-full transition-colors ${outboundEnabled ? 'bg-[rgba(126,207,195,0.35)]' : 'bg-red-900'}`}
                            >
                                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${outboundEnabled ? 'left-6' : 'left-1'}`}></div>
                            </button>
                        </div>
                    </div>
                    <p className="mt-8 max-w-xl text-[10px] leading-relaxed text-[var(--pf-muted)]">
                        These switches affect how this dashboard instance listens and sends alerts. They do not rewrite historical data or change processor-side settings.
                    </p>
                </div>

                <div className="rounded-[1.75rem] border border-red-500/20 bg-red-500/5 p-6">
                    <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-red-400">Danger Zone</h3>
                    <p className="mb-6 text-xs text-[var(--pf-text-soft)]">Permanently delete workspace data and disconnect configured sources.</p>
                    <button className="rounded-full border border-red-500/30 bg-red-900/20 px-4 py-2 text-xs font-bold text-red-400 transition-colors hover:bg-red-900/40">
                        Destroy Workspace
                    </button>
                </div>
            </div>
        </div>
    );
}
