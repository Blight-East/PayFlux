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
        return (
            <div className="min-h-screen bg-[#0F172A] text-white">
                {/* ── Nav ── */}
                <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
                    <span className="text-lg font-semibold tracking-tight">PayFlux</span>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/sign-in"
                            className="text-sm text-slate-400 no-underline transition-colors hover:text-white"
                        >
                            Sign in
                        </Link>
                        <Link
                            href="/scan"
                            className="rounded-lg bg-[#0A64BC] px-4 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#0B5BA8]"
                        >
                            Run a free scan
                        </Link>
                    </div>
                </nav>

                {/* ── Hero ── */}
                <section className="mx-auto max-w-3xl px-6 pb-20 pt-24 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0A64BC]">
                        Processor Early Warning
                    </p>
                    <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                        See processor risk before it turns into a cash-flow problem.
                    </h1>
                    <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
                        PayFlux monitors your Stripe account for payout delays, held funds, and rising processor pressure. Get a free risk scan in 60 seconds.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                        <Link
                            href="/scan"
                            className="inline-flex items-center justify-center rounded-full bg-[#0A64BC] px-8 py-3.5 text-base font-semibold text-white no-underline transition-colors hover:bg-[#0B5BA8]"
                        >
                            Run a free scan
                        </Link>
                        <a
                            href="#how-it-works"
                            className="inline-flex items-center text-base text-slate-400 no-underline transition-colors hover:text-white"
                        >
                            See how it works&nbsp;&rarr;
                        </a>
                    </div>
                    <p className="mt-4 text-sm text-slate-500">
                        No credit card. Read-only access. Takes 60 seconds.
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                        Pro starts at <span className="font-semibold text-white">$499/month</span> for live monitoring.
                    </p>

                    {/* Product mockup */}
                    <div className="mx-auto mt-12 max-w-lg rounded-xl border border-slate-800 bg-slate-900/60 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500">Overall Risk</p>
                                <p className="mt-1 text-2xl font-bold text-emerald-400">LOW</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500">Payout Timing</p>
                                <p className="mt-1 text-2xl font-bold text-white">2.1 days</p>
                            </div>
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full w-[18%] rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
                        </div>
                        <div className="mt-2 flex justify-between text-[10px] text-slate-600">
                            <span>Low risk</span>
                            <span>High risk</span>
                        </div>
                    </div>
                </section>

                {/* ── How it works ── */}
                <section id="how-it-works" className="mx-auto max-w-5xl px-6 pb-20">
                    <h2 className="mb-10 text-center text-2xl font-semibold text-white">How it works</h2>
                    <div className="grid gap-4 md:grid-cols-3">
                        {[
                            { step: '1', title: 'Enter your domain', desc: 'We check your store for public risk signals. No login needed.' },
                            { step: '2', title: 'See your results', desc: 'Get a plain-English summary of what we found and what it means.' },
                            { step: '3', title: 'Keep watching', desc: 'Create a free account and connect Stripe for live monitoring.' },
                        ].map(({ step, title, desc }) => (
                            <div key={step} className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
                                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full border border-[#0A64BC]/40 text-sm font-bold text-[#0A64BC]">
                                    {step}
                                </div>
                                <p className="text-sm font-semibold text-white">{title}</p>
                                <p className="mt-2 text-sm leading-relaxed text-slate-400">{desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Problem section ── */}
                <section className="border-t border-slate-800/50 bg-slate-900/30 py-20">
                    <div className="mx-auto grid max-w-5xl gap-10 px-6 md:grid-cols-[1.2fr_1fr]">
                        <div>
                            <h2 className="text-2xl font-semibold text-white">Most merchants don&apos;t see it coming</h2>
                            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-400">
                                Payment processors adjust payout timing, apply reserves, and flag accounts without obvious warning. By the time you notice, your cash flow is already affected.
                            </p>
                        </div>
                        <div className="space-y-3">
                            {[
                                { color: 'amber', text: 'Payout cycle extended from 2 days to 7 days' },
                                { color: 'amber', text: '5% reserve applied to monthly volume' },
                                { color: 'red', text: 'Account flagged for review after dispute spike' },
                            ].map(({ color, text }, i) => (
                                <div key={i} className={`rounded-lg border-l-4 ${color === 'red' ? 'border-red-500' : 'border-amber-500'} bg-slate-900/60 px-4 py-3`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full ${color === 'red' ? 'bg-red-500' : 'bg-amber-500'}`} />
                                        <p className="text-sm text-slate-300">{text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── What we catch ── */}
                <section className="mx-auto max-w-5xl px-6 py-20">
                    <h2 className="mb-10 text-center text-2xl font-semibold text-white">What PayFlux helps you catch early</h2>
                    <div className="grid gap-4 md:grid-cols-3">
                        {[
                            { title: 'Payout slowdowns', desc: 'Your 2-day payouts just became 7-day. We flag the shift before you notice the gap.' },
                            { title: 'Held funds', desc: 'Your processor is holding more of your revenue. We show how much and why it may be happening.' },
                            { title: 'Rising processor pressure', desc: 'Dispute rates climbing, volume patterns shifting, account reviews starting. We connect the dots.' },
                        ].map(({ title, desc }) => (
                            <div key={title} className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
                                <p className="text-sm font-semibold text-white">{title}</p>
                                <p className="mt-2 text-sm leading-relaxed text-slate-400">{desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── After connecting Stripe ── */}
                <section className="border-t border-slate-800/50 bg-slate-900/30 py-20">
                    <div className="mx-auto grid max-w-5xl gap-10 px-6 md:grid-cols-2">
                        <div>
                            <h2 className="text-2xl font-semibold text-white">What happens after you connect Stripe</h2>
                        </div>
                        <div className="space-y-4">
                            {[
                                'Instant risk snapshot — see where you stand today',
                                'Ongoing monitoring — we watch for changes daily',
                                'Plain English alerts — no jargon, just what changed and why',
                                'Action recommendations — specific next steps for each finding',
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#0A64BC]/20">
                                        <svg className="h-3 w-3 text-[#0A64BC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="text-sm leading-relaxed text-slate-300">{item}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Trust ── */}
                <section className="mx-auto max-w-5xl px-6 py-16">
                    <div className="grid gap-6 md:grid-cols-3">
                        {[
                            { title: 'Read-only access', desc: 'PayFlux never changes your data or settings.' },
                            { title: 'Your data stays private', desc: 'Encrypted and stored securely.' },
                            { title: 'Records when you need them', desc: 'Timestamped history for your own review.' },
                        ].map(({ title, desc }) => (
                            <div key={title} className="text-center">
                                <p className="text-sm font-semibold text-slate-300">{title}</p>
                                <p className="mt-1 text-sm text-slate-500">{desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Pricing expectation ── */}
                <section className="border-t border-slate-800/50 py-16">
                    <div className="mx-auto grid max-w-2xl gap-4 px-6 md:grid-cols-2">
                        <div className="rounded-lg border border-slate-800 p-6">
                            <p className="text-lg font-semibold text-white">Free</p>
                            <p className="mt-1 text-sm text-slate-500">$0</p>
                            <ul className="mt-3 space-y-2 text-sm text-slate-400">
                                <li>One-time scan</li>
                                <li>Basic findings</li>
                                <li>No card required</li>
                            </ul>
                        </div>
                        <div className="rounded-lg border border-[#0A64BC]/30 bg-[#0A64BC]/5 p-6">
                            <p className="text-lg font-semibold text-white">Pro</p>
                            <p className="mt-1 text-sm text-slate-300">$499 / month</p>
                            <ul className="mt-3 space-y-2 text-sm text-slate-400">
                                <li>Live monitoring</li>
                                <li>Ongoing alerts</li>
                                <li>Deeper visibility into what may be at risk</li>
                            </ul>
                        </div>
                    </div>
                    <p className="mt-6 text-center text-sm text-[#0A64BC]">
                        <Link href="/scan" className="no-underline text-[#0A64BC] hover:text-[#0B5BA8] transition-colors">
                            Start free&nbsp;&rarr;
                        </Link>
                    </p>
                </section>

                {/* ── Final CTA ── */}
                <section className="py-20 text-center">
                    <h2 className="text-2xl font-semibold text-white">Start with a free scan.</h2>
                    <Link
                        href="/scan"
                        className="mt-6 inline-flex items-center justify-center rounded-full bg-[#0A64BC] px-8 py-3.5 text-base font-semibold text-white no-underline transition-colors hover:bg-[#0B5BA8]"
                    >
                        Run a free scan
                    </Link>
                    <p className="mt-3 text-sm text-slate-500">Free. No credit card. Read-only.</p>
                </section>

                {/* ── Footer ── */}
                <footer className="border-t border-slate-800/50 py-8 text-center text-xs text-slate-600">
                    PayFlux &copy; {new Date().getFullYear()} &middot;{' '}
                    <Link href="/privacy" className="text-slate-600 no-underline hover:text-slate-400">Privacy</Link> &middot;{' '}
                    <Link href="/terms" className="text-slate-600 no-underline hover:text-slate-400">Terms</Link>
                </footer>
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
