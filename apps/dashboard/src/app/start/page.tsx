import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { resolveOnboardingState } from '@/lib/onboarding-state';
import { resolveActivationStatus } from '@/lib/activation-state';
import { logOnboardingEvent } from '@/lib/onboarding-events-server';

export const runtime = 'nodejs';

/**
 * /start — Canonical entry router.
 *
 * Routes users based on onboarding state:
 *   - Not logged in        → /sign-up
 *   - stage "none"          → /scan
 *   - stage "scanned"       → /connect (encourage, not require)
 *   - stage "connected_free"→ /dashboard (free preview)
 *   - stage "upgraded"      → /activate (post-purchase activation flow)
 */
export default async function StartPage() {
    const { userId } = await auth();

    if (!userId) {
        return (
            <div className="min-h-screen bg-slate-950 text-white">
                <div className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
                    <div className="max-w-3xl space-y-6">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-400/80">
                            Processor Early Warning
                        </p>
                        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                            See processor risk before it turns into a cash-flow problem.
                        </h1>
                        <p className="max-w-2xl text-base leading-relaxed text-slate-300">
                            PayFlux shows when your payment processor may start holding back money, slowing payouts, or escalating account risk. Start with a simple check, then connect live processor data so PayFlux can keep watching payouts, account pressure, and the money your processor may decide to hold back.
                        </p>
                    </div>

                    <div className="mt-10 grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                            <p className="text-sm font-semibold text-white">What is happening?</p>
                            <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                Processors can tighten terms quietly. Merchants often feel it first as slower payouts, reserve holds, or account reviews.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                            <p className="text-sm font-semibold text-white">Why does it matter?</p>
                            <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                When a processor starts holding back part of your sales, the hit lands on cash flow immediately, not on a future report.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                            <p className="text-sm font-semibold text-white">What should I do next?</p>
                            <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                Run a first check, create a free account to save it, then connect Stripe so PayFlux can monitor live changes.
                            </p>
                        </div>
                    </div>

                    <div className="mt-10 flex flex-wrap gap-4">
                        <Link
                            href="/scan"
                            className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 no-underline transition-all hover:bg-amber-400"
                        >
                            Run a first check
                        </Link>
                        <Link
                            href="/sign-up"
                            className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 no-underline transition-colors hover:border-slate-600 hover:text-white"
                        >
                            Create free account
                        </Link>
                        <Link
                            href="/sign-in"
                            className="inline-flex items-center justify-center rounded-xl px-2 py-3 text-sm text-slate-400 no-underline transition-colors hover:text-slate-200"
                        >
                            Sign in
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const state = await resolveOnboardingState(userId);

    // Only emit sign_up_completed for genuinely new users (stage "none").
    // Returning users hit /start on every visit — don't pollute telemetry.
    if (state.stage === 'none') {
        logOnboardingEvent('sign_up_completed', { userId, metadata: { stage: state.stage } });
    }

    switch (state.stage) {
        case 'none':
            redirect('/scan');
        case 'scanned':
            // Encourage connection but don't force — they can skip to dashboard
            redirect('/connect');
        case 'connected_free':
            redirect('/dashboard');
        case 'upgraded': {
            // Route through activation flow — it handles all sub-states
            const activation = await resolveActivationStatus(userId);
            if (activation?.state === 'live_monitored') {
                redirect('/dashboard');
            }
            redirect('/activate');
        }
        default:
            redirect('/scan');
    }
}
