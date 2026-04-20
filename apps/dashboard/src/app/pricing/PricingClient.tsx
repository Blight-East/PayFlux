'use client';

import { useState } from 'react';

type PricingClientProps = {
    checkoutConfigured: boolean;
    initialError?: string | null;
};

export default function PricingClient({
    checkoutConfigured,
    initialError = null,
}: PricingClientProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(initialError);

    async function startCheckout() {
        if (!checkoutConfigured) {
            setError('Stripe price is not configured.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ plan: 'pro' }),
            });

            if (response.status === 409) {
                window.location.href = '/dashboard';
                return;
            }

            const data = await response.json().catch(() => null);
            if (!response.ok || !data?.url) {
                throw new Error(data?.error ?? 'Unable to start checkout');
            }

            window.location.href = data.url;
        } catch (err) {
            setLoading(false);
            setError(err instanceof Error ? err.message : 'Unable to start checkout');
        }
    }

    return (
        <div className="pf-shell flex min-h-screen items-center justify-center px-6 py-10">
            <div className="pf-panel w-full max-w-2xl rounded-[2rem] p-8 md:p-10">
                <div className="space-y-3">
                    <p className="pf-kicker">payflux billing</p>
                    <h1 className="pf-editorial text-4xl leading-tight text-[var(--pf-paper)] md:text-[3.35rem]">
                        Start PayFlux Pro
                    </h1>
                    <p className="max-w-xl text-sm leading-7 text-[var(--pf-text-soft)] md:text-base">
                        Billing is handled through Stripe Checkout. Stripe Connect is optional and only needed
                        if you later want a merchant payout account.
                    </p>
                </div>

                <div className="mt-8 rounded-[1.75rem] border border-white/8 bg-black/18 p-6 md:p-7">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="text-lg font-medium text-[var(--pf-paper)]">Pro</p>
                            <p className="text-sm text-[var(--pf-text-soft)]">Subscription billing for dashboard access and alerts.</p>
                        </div>
                        <p className="text-sm uppercase tracking-[0.2em] text-[var(--pf-muted)]">Stripe Checkout</p>
                    </div>

                    <ul className="mt-6 space-y-2 text-sm text-[var(--pf-text)]">
                        <li>Dashboard access after Stripe-confirmed activation</li>
                        <li>Server-verified activation before dashboard access</li>
                        <li>Connect onboarding stays separate from customer payment</li>
                    </ul>

                    <button
                        type="button"
                        onClick={startCheckout}
                        disabled={loading || !checkoutConfigured}
                        className="mt-8 w-full rounded-full bg-[var(--pf-accent)] px-5 py-3.5 text-sm font-semibold text-[var(--pf-ink)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:bg-white/8 disabled:text-[var(--pf-muted)]"
                    >
                        {loading ? 'Redirecting…' : 'Continue to Checkout'}
                    </button>

                    {error && (
                        <div className="mt-4 rounded-[1rem] border border-red-500/20 bg-red-500/10 p-4">
                            <p className="text-sm leading-6 text-red-100/90">{error}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
