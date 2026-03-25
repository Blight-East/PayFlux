import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { resolveActivationStatus } from '@/lib/activation-state';
import { logOnboardingEvent } from '@/lib/onboarding-events-server';
import LegacyCheckoutQuerySanitizer from '@/components/LegacyCheckoutQuerySanitizer';

export const runtime = 'nodejs';

export default async function ActivatePage() {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in?redirect_url=%2Factivate');

    const status = await resolveActivationStatus(userId);

    // Not paid → this flow is post-purchase only
    if (!status) redirect('/start');

    // Already live → go to dashboard
    if (status.state === 'live_monitored') redirect('/dashboard');

    // Connected but not yet live → skip to arming
    if (status.state === 'connected_generating') redirect('/activate/arming');

    // paid_unconnected → show activation page
    logOnboardingEvent('onboarding_stage_changed', {
        userId,
        workspaceId: status.workspace.workspaceId,
        metadata: { from: 'upgraded', to: 'paid_unconnected', page: 'activate' },
    });

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
            <LegacyCheckoutQuerySanitizer />
            <div className="max-w-lg w-full space-y-8">

                {/* Icon + headline */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl mx-auto">
                        <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight">
                        Turn on live monitoring for your payouts.
                    </h1>
                    <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
                        You have already unlocked PayFlux. This last step connects Stripe so your first live view of payout risk, held-fund risk, and account pressure can go live in about a minute.
                    </p>
                </div>

                {/* What happens next */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
                    <h2 className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        What happens next
                    </h2>
                    <div className="space-y-3">
                        <div className="flex items-start space-x-3">
                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 mt-0.5 flex-shrink-0">
                                <span className="text-[10px] text-amber-400 font-bold">1</span>
                            </div>
                            <div>
                                <p className="text-sm text-slate-200">PayFlux reads your recent payment activity</p>
                                <p className="text-xs text-slate-500">Read-only. It cannot change payments, refunds, or processor settings.</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 mt-0.5 flex-shrink-0">
                                <span className="text-[10px] text-amber-400 font-bold">2</span>
                            </div>
                            <div>
                                <p className="text-sm text-slate-200">We estimate what your processor may do next</p>
                                <p className="text-xs text-slate-500">Held-back money, slower payouts, and the warning signs pushing risk up.</p>
                            </div>
                        </div>
                        <div className="flex items-start space-x-3">
                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 mt-0.5 flex-shrink-0">
                                <span className="text-[10px] text-amber-400 font-bold">3</span>
                            </div>
                            <div>
                                <p className="text-sm text-slate-200">Your workspace goes live with practical alerts turned on</p>
                                <p className="text-xs text-slate-500">Held funds, slower payouts, rising dispute pressure, and worsening account risk.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Primary CTA */}
                <a
                    href="/api/stripe/authorize"
                    className="flex items-center justify-center w-full px-6 py-4 bg-amber-500 text-slate-950 font-semibold rounded-xl hover:bg-amber-400 transition-all active:scale-[0.98] no-underline text-base"
                >
                    Connect Stripe and finish setup
                </a>

                {/* Secondary */}
                <p className="text-center text-xs text-slate-600">
                    Using a different processor?{' '}
                    <a href="/connect" className="text-slate-500 hover:text-slate-400 underline">
                        Set up webhook integration
                    </a>
                </p>

                {/* Trust line */}
                <div className="text-center">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wide">
                        Read-only via Stripe Connect OAuth
                    </p>
                </div>
            </div>
        </div>
    );
}
