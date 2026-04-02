'use client';

import { useState } from 'react';

/**
 * Manage Billing section for the Settings page.
 * Opens Stripe Customer Portal for card updates, invoice downloads, and cancellation.
 */
export default function ManageBillingSection({ tier }: { tier: string }) {
    const [portalLoading, setPortalLoading] = useState(false);
    const [portalError, setPortalError] = useState<string | null>(null);

    async function openCustomerPortal() {
        setPortalLoading(true);
        setPortalError(null);

        try {
            const response = await fetch('/api/portal', { method: 'POST' });
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

    if (tier === 'free') return null;

    return (
        <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950 p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white">Subscription &amp; Billing</h3>
            <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={openCustomerPortal}
                    disabled={portalLoading}
                    className="rounded border border-slate-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:border-slate-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
                >
                    {portalLoading ? 'Opening Billing…' : 'Manage Billing'}
                </button>
                <p className="text-xs text-slate-500">
                    Update cards, cancel your subscription, or download invoices in Stripe Customer Portal.
                </p>
            </div>
            {portalError && (
                <p className="mt-3 text-xs text-red-400">{portalError}</p>
            )}
        </div>
    );
}
