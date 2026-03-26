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
 *   - Not logged in        → landing page
 *   - stage "none"          → /scan
 *   - stage "scanned"       → /connect (encourage, not require)
 *   - stage "connected_free"→ /dashboard (free preview)
 *   - stage "upgraded"      → /activate (post-purchase activation flow)
 */
export default async function StartPage() {
    const { userId } = await auth();

    if (!userId) {
        const warningCards = [
            {
                title: 'Payout Slowdowns',
                body: 'See when payout timing starts to drift so you can react before settlement delays hit your operating cash.',
            },
            {
                title: 'Held Funds',
                body: 'Spot the patterns that often show up before a processor begins holding part of your sales back.',
            },
            {
                title: 'Account Pressure',
                body: 'Track the signals that often lead processors to look more closely at your account, so you can act before pressure gets worse.',
            },
        ];

        const steps = [
            {
                step: '1',
                title: 'Run a Free Scan',
                body: 'Start with a quick public check to spot visible warning signs that may increase processor pressure.',
            },
            {
                step: '2',
                title: 'Connect Stripe for Live Monitoring',
                body: 'Add a read-only connection so PayFlux can watch payout behavior and account pressure as it changes.',
            },
            {
                step: '3',
                title: 'Get Early Warnings',
                body: 'See what changed, why it matters, and what to do next before payout issues become a cash-flow problem.',
            },
        ];

        const trustItems = [
            {
                title: 'Read-only connection',
                body: 'PayFlux can review payout and account signals without changing your payment flow or account settings.',
            },
            {
                title: 'No payment flow changes',
                body: 'Your checkout and processing setup stay exactly where they are. Monitoring does not reroute payments.',
            },
            {
                title: 'Exportable records',
                body: 'Keep a clean trail of what changed so your team has records ready when you need to review or escalate.',
            },
        ];

        return (
            <div className="min-h-screen bg-slate-950 text-slate-50">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_top,rgba(10,100,188,0.22),rgba(2,6,23,0)_62%)]" />

                <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
                    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0A64BC] text-sm font-semibold text-white">
                                PF
                            </div>
                            <span className="text-lg font-semibold tracking-tight text-white">PayFlux</span>
                        </div>

                        <div className="hidden items-center gap-8 text-sm font-medium text-slate-400 md:flex">
                            <a href="#problem" className="no-underline transition-colors hover:text-white">
                                The Problem
                            </a>
                            <a href="#how-it-works" className="no-underline transition-colors hover:text-white">
                                How It Works
                            </a>
                            <a href="#pricing" className="no-underline transition-colors hover:text-white">
                                Pricing
                            </a>
                        </div>

                        <div className="flex items-center gap-3">
                            <Link
                                href="/sign-in"
                                className="hidden text-sm font-medium text-slate-300 no-underline transition-colors hover:text-white md:inline-flex"
                            >
                                Sign in
                            </Link>
                            <Link
                                href="/scan"
                                className="inline-flex items-center justify-center rounded-lg bg-[#0A64BC] px-4 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#0B5BA8]"
                            >
                                Run a Free Scan
                            </Link>
                        </div>
                    </div>
                </nav>

                <main>
                    <section className="mx-auto max-w-7xl px-6 pb-20 pt-32">
                        <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
                            <div className="max-w-2xl">
                                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                                    See Processor Risk Before It Turns Into a Cash-Flow Problem
                                </h1>
                                <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300 sm:text-xl">
                                    PayFlux helps merchants spot payout slowdowns, held funds, and rising processor pressure before the damage hits your business.
                                </p>
                                <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                                    <Link
                                        href="/scan"
                                        className="inline-flex items-center justify-center rounded-lg bg-[#0A64BC] px-7 py-3.5 text-base font-semibold text-white no-underline transition-colors hover:bg-[#0B5BA8]"
                                    >
                                        Run a Free Scan
                                    </Link>
                                    <a
                                        href="#how-it-works"
                                        className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-7 py-3.5 text-base font-semibold text-slate-200 no-underline transition-colors hover:border-slate-600 hover:bg-slate-900"
                                    >
                                        See How It Works
                                    </a>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_32px_80px_rgba(2,6,23,0.45)] backdrop-blur">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                                    <div>
                                        <p className="text-sm font-semibold text-white">Merchant Overview</p>
                                        <p className="mt-1 text-sm text-slate-400">A simple view of what PayFlux helps you watch</p>
                                    </div>
                                    <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                                        Needs Attention
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-4">
                                    {[
                                        {
                                            label: 'Payout Status',
                                            value: 'Under Watch',
                                            detail: 'Watch for changes in payout timing before cash flow tightens.',
                                            valueClass: 'text-white',
                                        },
                                        {
                                            label: 'Held Funds',
                                            value: 'No Hold Detected',
                                            detail: 'Stay ahead of the patterns that often lead to funds being held back.',
                                            valueClass: 'text-white',
                                        },
                                        {
                                            label: 'Account Pressure',
                                            value: 'Early Signs Building',
                                            detail: 'See when processor pressure is moving in the wrong direction.',
                                            valueClass: 'text-amber-300',
                                        },
                                    ].map((item) => (
                                        <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                                            <p className="text-sm font-medium text-slate-400">{item.label}</p>
                                            <p className={`mt-2 text-xl font-semibold ${item.valueClass}`}>{item.value}</p>
                                            <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.detail}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="problem" className="border-y border-slate-800 bg-slate-900/40 py-24">
                        <div className="mx-auto max-w-5xl px-6 text-center">
                            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                Most Merchants Don&apos;t See Risk Building Until Payouts Slow Down
                            </h2>
                            <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">
                                By the time your processor sends an email about held funds or an account review, the pressure has already been building for weeks. Waiting for the alert means waiting until your cash flow is already restricted.
                            </p>
                        </div>
                    </section>

                    <section className="mx-auto max-w-7xl px-6 py-24">
                        <div className="max-w-3xl">
                            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                Catch the Warning Signs Early
                            </h2>
                            <p className="mt-4 text-lg leading-relaxed text-slate-300">
                                PayFlux monitors the signals that often show up before payouts slow down, funds get held back, or processor pressure rises.
                            </p>
                        </div>

                        <div className="mt-12 grid gap-6 md:grid-cols-3">
                            {warningCards.map((card) => (
                                <div key={card.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
                                    <div className="mb-6 h-11 w-11 rounded-xl border border-slate-800 bg-slate-950" />
                                    <h3 className="text-xl font-semibold text-white">{card.title}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-slate-400">{card.body}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section id="how-it-works" className="border-y border-slate-800 bg-slate-900/30 py-24">
                        <div className="mx-auto max-w-7xl px-6">
                            <div className="text-center">
                                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                    Clear Visibility in Minutes
                                </h2>
                            </div>

                            <div className="mt-14 grid gap-6 md:grid-cols-3">
                                {steps.map((step) => (
                                    <div key={step.step} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center">
                                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#0A64BC]/40 bg-slate-950 text-base font-semibold text-[#0A64BC]">
                                            {step.step}
                                        </div>
                                        <h3 className="mt-6 text-xl font-semibold text-white">{step.title}</h3>
                                        <p className="mt-3 text-sm leading-relaxed text-slate-400">{step.body}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto max-w-7xl px-6 py-24">
                        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
                            <div>
                                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                    Get Ahead of Processor Pressure
                                </h2>
                                <div className="mt-8 space-y-6">
                                    {trustItems.map((item) => (
                                        <div key={item.title} className="flex gap-4">
                                            <div className="mt-1 h-5 w-5 rounded-full bg-[#0A64BC]/20 ring-1 ring-[#0A64BC]/30" />
                                            <div>
                                                <p className="text-base font-semibold text-white">{item.title}</p>
                                                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.body}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
                                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">What PayFlux Changes</p>
                                <div className="mt-8 space-y-6">
                                    {[
                                        'Move from guessing about payout issues to seeing the pressure earlier',
                                        'Connect your processor without changing how payments move',
                                        'Keep a clean record of what changed and what your team saw',
                                    ].map((item) => (
                                        <div key={item} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-sm leading-relaxed text-slate-300">
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="pricing" className="border-y border-slate-800 bg-slate-900/40 py-24">
                        <div className="mx-auto max-w-7xl px-6">
                            <div className="text-center">
                                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                    Simple, Transparent Access
                                </h2>
                            </div>

                            <div className="mt-14 grid gap-6 lg:grid-cols-3">
                                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-8">
                                    <h3 className="text-2xl font-semibold text-white">Free</h3>
                                    <ul className="mt-6 space-y-3 text-sm text-slate-300">
                                        <li>One-time risk scan</li>
                                        <li>High-level vulnerability check</li>
                                        <li>Read-only connection available</li>
                                    </ul>
                                    <Link
                                        href="/scan"
                                        className="mt-8 inline-flex items-center justify-center rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-white no-underline transition-colors hover:border-slate-600 hover:bg-slate-900"
                                    >
                                        Run a Free Scan
                                    </Link>
                                </div>

                                <div className="rounded-2xl border border-[#0A64BC]/50 bg-[#0A64BC]/10 p-8 shadow-[0_20px_60px_rgba(10,100,188,0.18)]">
                                    <p className="inline-flex rounded-full bg-[#0A64BC] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                                        Pro
                                    </p>
                                    <ul className="mt-6 space-y-3 text-sm text-slate-200">
                                        <li>Live monitoring and deeper visibility</li>
                                        <li>Volume-based pricing</li>
                                    </ul>
                                    <Link
                                        href="/scan"
                                        className="mt-8 inline-flex items-center justify-center rounded-lg bg-[#0A64BC] px-5 py-3 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#0B5BA8]"
                                    >
                                        Start With a Free Scan
                                    </Link>
                                </div>

                                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-8">
                                    <h3 className="text-2xl font-semibold text-white">Enterprise</h3>
                                    <ul className="mt-6 space-y-3 text-sm text-slate-300">
                                        <li>Custom</li>
                                    </ul>
                                    <Link
                                        href="/sign-in"
                                        className="mt-8 inline-flex items-center justify-center rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-white no-underline transition-colors hover:border-slate-600 hover:bg-slate-900"
                                    >
                                        Sign In
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto max-w-4xl px-6 py-24 text-center">
                        <h2 className="mt-8 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                            Stop Waiting for the Processor to Act
                        </h2>
                        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
                            Get ahead of held funds and payout slowdowns today. It takes less than two minutes to run a secure scan.
                        </p>
                        <Link
                            href="/scan"
                            className="mt-8 inline-flex items-center justify-center rounded-lg bg-[#0A64BC] px-8 py-3.5 text-base font-semibold text-white no-underline transition-colors hover:bg-[#0B5BA8]"
                        >
                            Run a Free Scan
                        </Link>
                    </section>

                    <footer className="border-t border-slate-800/80 py-10">
                        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
                            <p>PayFlux &copy; {new Date().getFullYear()}</p>
                            <div className="flex items-center gap-5">
                                <Link href="/privacy" className="text-slate-500 no-underline transition-colors hover:text-slate-300">
                                    Privacy
                                </Link>
                                <Link href="/terms" className="text-slate-500 no-underline transition-colors hover:text-slate-300">
                                    Terms
                                </Link>
                            </div>
                        </div>
                    </footer>
                </main>
            </div>
        );
    }

    const state = await resolveOnboardingState(userId);

    logOnboardingEvent('start_viewed', { userId, metadata: { stage: state.stage } });

    // Only emit signup_completed for genuinely new users (stage "none").
    // Returning users hit /start on every visit — don't pollute telemetry.
    if (state.stage === 'none') {
        logOnboardingEvent('signup_completed', { userId, metadata: { stage: state.stage } });
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
