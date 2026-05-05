import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { resolveOnboardingState } from '@/lib/onboarding-state';
import { resolveActivationStatus } from '@/lib/activation-state';
import { logOnboardingEvent } from '@/lib/onboarding-events-server';
import { queryEvents } from '@/lib/event-store';

export const runtime = 'nodejs';

async function hasLoggedSignupCompleted(userId: string): Promise<boolean> {
    try {
        const existing = await queryEvents({ userId, eventName: 'signup_completed', limit: 1 });
        return existing.length > 0;
    } catch {
        return false;
    }
}

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
            <div className="min-h-screen bg-[#0a0a0a] text-[#f7f7f5]">
                <nav className="sticky top-0 z-40 border-b border-[#1f1f1d] bg-[#0a0a0a]/85 px-6 py-5 backdrop-blur">
                    <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                        <Link href="https://payflux.dev" className="flex items-center gap-3 no-underline">
                            <span className="relative h-[18px] w-[18px] border border-[#f7f7f5] after:absolute after:inset-[3px] after:bg-[#f7f7f5]" />
                            <span className="font-mono text-[13px] font-medium uppercase tracking-[0.08em] text-[#f7f7f5]">
                                PayFlux <span className="hidden text-[10px] tracking-[0.16em] text-[#6b6b66] sm:inline">Payment Risk Intelligence</span>
                            </span>
                        </Link>
                        <div className="flex items-center gap-5">
                            <a href="https://payflux.dev/#evidence" className="hidden font-mono text-xs text-[#9a9a93] no-underline transition-colors hover:text-[#f7f7f5] sm:inline">
                                Evidence
                            </a>
                        <Link
                            href="/sign-in"
                                className="font-mono text-xs text-[#9a9a93] no-underline transition-colors hover:text-[#f7f7f5]"
                        >
                            Sign in
                        </Link>
                        <Link
                            href="/scan"
                                className="border border-[#f7f7f5] bg-[#f7f7f5] px-4 py-2 font-mono text-xs text-[#0a0a0a] no-underline transition-opacity hover:opacity-85"
                        >
                            See your payout risk
                        </Link>
                    </div>
                    </div>
                </nav>

                <main>
                    <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[minmax(0,1fr)_420px] lg:py-28">
                        <div>
                            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#6b6b66]">
                                Payment Risk Intelligence · app entry
                    </p>
                            <h1
                                className="mt-10 max-w-[12ch] text-[44px] font-normal leading-[1.02] tracking-[-0.02em] text-[#f7f7f5] sm:text-[68px]"
                                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                            >
                                Your processor can lock <em className="font-normal italic text-[#c8533a]">$680k of your cash</em> before they tell you.
                    </h1>
                            <p className="mt-8 max-w-2xl border-l border-[#2a2a27] pl-5 font-mono text-sm leading-7 text-[#9a9a93]">
                                PayFlux analyzes payout patterns, disputes, balance velocity, and processor signals from your Stripe account. Start with a preliminary external signal scan, then connect Stripe read-only for live payout prediction.
                    </p>
                            <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            href="/scan"
                                    className="border border-[#f7f7f5] bg-[#f7f7f5] px-6 py-3 font-mono text-sm text-[#0a0a0a] no-underline transition-opacity hover:opacity-85"
                        >
                                    See your payout risk&nbsp;→
                        </Link>
                        <a
                                    href="https://payflux.dev/app/posture.html"
                                    className="border-b border-[#2a2a27] px-3 py-3 font-mono text-sm text-[#9a9a93] no-underline transition-colors hover:border-[#f7f7f5] hover:text-[#f7f7f5]"
                        >
                                    View live dashboard&nbsp;→
                        </a>
                    </div>
                            <p className="mt-5 font-mono text-xs uppercase tracking-[0.14em] text-[#6b6b66]">
                                Free · 2 minutes · read-only Stripe scope · no card
                            </p>
                            </div>

                        <div className="self-start border border-[#2a2a27] bg-[#0f0f0e]">
                            <div className="flex items-center justify-between border-b border-[#2a2a27] px-4 py-3">
                                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6b6b66]">Sample output · Stripe</span>
                                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8533a]">Elevated</span>
                            </div>
                            <div className="grid gap-px bg-[#2a2a27] sm:grid-cols-3 lg:grid-cols-1">
                                <div className="bg-[#0f0f0e] p-5">
                                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#6b6b66]">Projected reserve</p>
                                    <p className="mt-2 text-[42px] leading-none tracking-[-0.02em] text-[#c8533a]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>$182,340</p>
                                    <p className="mt-2 text-xs leading-5 text-[#9a9a93]">T+62 · 8% rolling reserve scenario</p>
                                </div>
                                <div className="bg-[#0f0f0e] p-5">
                                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#6b6b66]">Signals detected</p>
                                    <p className="mt-2 text-[42px] leading-none tracking-[-0.02em]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>14</p>
                                    <p className="mt-2 text-xs leading-5 text-[#9a9a93]">Dispute clustering · refund drift · balance velocity</p>
                                    </div>
                                <div className="bg-[#0f0f0e] p-5">
                                    <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#6b6b66]">Derived confidence</p>
                                    <p className="mt-2 text-[42px] leading-none tracking-[-0.02em]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>0.81</p>
                                    <p className="mt-2 text-xs leading-5 text-[#9a9a93]">Based on matched processor actions</p>
                                </div>
                        </div>
                    </div>
                </section>

                    <section className="border-y border-[#1f1f1d] bg-[#0f0f0e] px-6 py-8">
                        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[180px_minmax(0,1fr)_360px] lg:items-center">
                            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c8533a]">Merchant scenario · anonymized</p>
                            <p className="text-sm leading-7 text-[#d6d6d0]">
                                <strong className="font-medium text-[#f7f7f5]">Subscription merchant, $3.4M monthly card volume.</strong> Stripe introduced a 20% rolling reserve. PayFlux detected dispute clustering and refund drift <span className="text-[#c8533a]">18 days earlier</span>, with a projected liquidity impact of <span className="text-[#c8533a]">$240k</span>.
                            </p>
                            <div className="grid gap-px bg-[#2a2a27] sm:grid-cols-3">
                                {[
                                    ['18D', 'earlier signal'],
                                    ['$240K', 'liquidity at risk'],
                                    ['20%', 'reserve imposed'],
                                ].map(([value, label]) => (
                                    <div key={label} className="bg-[#0a0a0a] p-4">
                                        <p className="text-[28px] leading-none tracking-[-0.02em]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>{value}</p>
                                        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#9a9a93]">{label}</p>
                                    </div>
                                ))}
                            </div>
                    </div>
                </section>

                    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
                        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
                            <h2 className="max-w-lg text-[34px] font-normal leading-tight tracking-[-0.015em] text-[#f7f7f5]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                                Same path. Same promise. No blue SaaS detour.
                            </h2>
                            <p className="max-w-md text-sm leading-7 text-[#9a9a93]">
                                The first scan is only a preliminary external signal check. The real prediction layer begins when Stripe is connected read-only.
                            </p>
                                    </div>
                        <div className="grid gap-px bg-[#2a2a27] md:grid-cols-3">
                            {[
                                ['01', 'Preliminary signal scan', 'External signals only. No processor login and no card required.'],
                                ['02', 'Read-only Stripe connection', 'Payout, dispute, balance, and account signals power the live model.'],
                                ['03', 'Capital-at-risk view', 'See projection windows, detected signals, confidence, and recommended actions.'],
                            ].map(([step, title, desc]) => (
                                <div key={step} className="bg-[#0a0a0a] p-6">
                                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#c8533a]">{step}</p>
                                    <h3 className="mt-6 text-[22px] font-normal tracking-[-0.01em]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>{title}</h3>
                                    <p className="mt-4 text-sm leading-7 text-[#9a9a93]">{desc}</p>
                                </div>
                            ))}
                        </div>
                </section>

                    <section className="mx-auto max-w-6xl px-6 pb-20">
                        <div className="grid gap-px border border-[#1f1f1d] bg-[#1f1f1d] md:grid-cols-3">
                        {[
                                ['Read-only Stripe access', 'PayFlux cannot move money, change processor settings, or initiate payouts.'],
                                ['No fund movement', 'The Stripe connection is for analysis only. No treasury or payment action is available.'],
                                ['Payment Risk Intelligence', 'Use the full PayFlux name so this product is distinct from unrelated Payflux brands.'],
                        ].map(([title, desc]) => (
                                <div key={title} className="bg-[#0f0f0e] p-6">
                                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#f7f7f5]">{title}</p>
                                    <p className="mt-4 text-sm leading-7 text-[#9a9a93]">{desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                    <section className="border-t border-[#1f1f1d] px-6 py-20 text-center">
                        <p className="mx-auto max-w-2xl text-[28px] font-normal leading-tight tracking-[-0.01em]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                            See your payout risk in 2 minutes. Read-only. Free.
                        </p>
                    <Link
                        href="/scan"
                            className="mt-8 inline-flex border border-[#f7f7f5] bg-[#f7f7f5] px-7 py-3 font-mono text-sm text-[#0a0a0a] no-underline transition-opacity hover:opacity-85"
                    >
                            See your payout risk&nbsp;→
                    </Link>
                        <p className="mt-4 font-mono text-xs uppercase tracking-[0.14em] text-[#6b6b66]">Free · no card · preliminary external scan first</p>
                </section>
                </main>

                <footer className="flex flex-wrap justify-between gap-4 border-t border-[#1f1f1d] px-6 py-8 font-mono text-[10px] uppercase tracking-[0.16em] text-[#6b6b66]">
                    <span>PayFlux · Payment Risk Intelligence</span>
                    <span>
                        <Link href="/privacy" className="no-underline hover:text-[#f7f7f5]">Privacy</Link> ·{' '}
                        <Link href="/terms" className="no-underline hover:text-[#f7f7f5]">Terms</Link>
                    </span>
                </footer>
            </div>
        );
    }

    const state = await resolveOnboardingState(userId);

    logOnboardingEvent('start_viewed', { userId, metadata: { stage: state.stage } });

    // Only emit signup_completed for genuinely new users (stage "none").
    // Returning users hit /start on every visit — don't pollute telemetry.
    if (state.stage === 'none' && !(await hasLoggedSignupCompleted(userId))) {
        logOnboardingEvent('signup_completed', {
            userId,
            metadata: { stage: state.stage, method: 'magic_link' },
        });
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
