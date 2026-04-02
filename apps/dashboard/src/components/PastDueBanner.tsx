'use client';

import { useState } from 'react';

/**
 * Persistent banner for workspaces with past_due billing status.
 * Links directly to Stripe Customer Portal for card updates.
 *
 * Styled for the slate-50 light dashboard canvas.
 */
export default function PastDueBanner() {
    const [portalLoading, setPortalLoading] = useState(false);

    async function openPortal() {
        setPortalLoading(true);
        try {
            const res = await fetch('/api/portal', { method: 'POST' });
            const data = await res.json();
            if (data?.url) {
                window.location.href = data.url;
                return;
            }
        } catch {
            // fall through — button stays clickable
        }
        setPortalLoading(false);
    }

    return (
        <div className="w-full bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <p className="text-sm text-amber-900 truncate">
                    <span className="font-semibold">Payment issue detected.</span>{' '}
                    Your most recent payment failed. Please update your payment method to avoid service interruption.
                </p>
            </div>
            <button
                type="button"
                onClick={openPortal}
                disabled={portalLoading}
                className="flex-shrink-0 rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-amber-500 disabled:cursor-wait disabled:opacity-60"
            >
                {portalLoading ? 'Opening…' : 'Update Payment'}
            </button>
        </div>
    );
}
