'use client';

import { logOnboardingEventClient } from '@/lib/onboarding-events';

/**
 * Client component for the Stripe Connect CTA button.
 * Fires connect_clicked before redirecting to Stripe OAuth.
 * Extracted from the server component /connect/page.tsx to enable click tracking.
 */
export default function ConnectStripeCTA({ label }: { label?: string }) {
    return (
        <button
            type="button"
            onClick={() => {
                logOnboardingEventClient('connect_clicked', {
                    source_page: 'connect',
                    destination_page: 'stripe_authorize',
                });
                // Small delay to let the event fire before redirect
                setTimeout(() => {
                    window.location.href = '/api/stripe/authorize';
                }, 100);
            }}
            className="flex items-center justify-center w-full px-4 py-3 bg-amber-500 text-slate-950 font-semibold rounded-lg hover:bg-amber-400 transition-all active:scale-[0.98] no-underline cursor-pointer border-0"
        >
            {label ?? 'Connect Stripe and turn on live monitoring'}
        </button>
    );
}
