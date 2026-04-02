'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Post-checkout welcome banner shown when user first lands on the activate page.
 * Confirms payment succeeded and explains what happens next.
 *
 * Styled for the dark activation pages (slate-950 bg).
 * Self-dismisses and cleans the URL param so it only shows once.
 */
export default function WelcomeBanner() {
    const searchParams = useSearchParams();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Detect ?checkout=success from legacy flows or direct redirects
        if (searchParams.get('checkout') === 'success' || searchParams.get('session_id')) {
            setVisible(true);
            const url = new URL(window.location.href);
            url.searchParams.delete('checkout');
            url.searchParams.delete('session_id');
            window.history.replaceState({}, '', url.toString());
        }
    }, [searchParams]);

    if (!visible) return null;

    return (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 relative mb-8">
            <button
                type="button"
                onClick={() => setVisible(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors text-sm"
                aria-label="Dismiss"
            >
                ✕
            </button>

            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <span className="text-lg text-emerald-400">✓</span>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-emerald-200 tracking-tight">
                        Payment confirmed — you're in.
                    </h3>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                        Your PayFlux Pro subscription is active. Connect your Stripe account below to start live monitoring.
                    </p>
                </div>
            </div>
        </div>
    );
}
