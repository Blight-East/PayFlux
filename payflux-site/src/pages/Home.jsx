import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import Footer from '../components/Footer';
import { logMarketingEvent, buildScanUrl as _buildScanUrl, getJourneyId, SCAN_URL } from '../lib/tracking';

const SIGN_IN_URL = 'https://app.payflux.dev/sign-in';

function buildScanUrl(cta) {
    return _buildScanUrl('marketing_home', cta);
}

const warningFilings = [
    {
        severity: 'High',
        severityClass: 'text-[#BC620A] border-[#BC620A]/30 bg-[#BC620A]/[0.06]',
        accentBar: 'bg-[#BC620A]',
        title: 'Payout Slowdowns',
        body: 'Payout timing drift is the earliest observable symptom of processor pressure. PayFlux logs the shift the moment it crosses your merchant baseline.',
    },
    {
        severity: 'Critical',
        severityClass: 'text-red-600 border-red-600/30 bg-red-600/[0.06]',
        accentBar: 'bg-red-600',
        title: 'Held Funds',
        body: 'Reserve escalations rarely arrive as a single event. They emerge as a pattern — and the pattern is readable before the first hold posts.',
    },
    {
        severity: 'Watch',
        severityClass: 'text-slate-600 border-slate-300 bg-slate-50',
        accentBar: 'bg-slate-400',
        title: 'Account Pressure',
        body: 'Chargeback ratio, refund velocity, review escalation — the composite that precedes a full underwriting re-look.',
    },
];

const steps = [
    {
        step: '01',
        title: 'Run a free scan',
        body: 'Surface visible warning signs from your recent processor behavior. Takes under two minutes. No connection required.',
    },
    {
        step: '02',
        title: 'Connect Stripe read-only',
        body: 'PayFlux observes payout cadence and account signals over time. No write access. No flow changes.',
    },
    {
        step: '03',
        title: 'Receive early warnings',
        body: 'When a signal crosses threshold, you receive a filing — what changed, why it matters, what to do next.',
    },
];

const trustItems = [
    {
        label: 'Read-only connection',
        body: 'PayFlux observes. It does not write, route, or modify.',
    },
    {
        label: 'No payment flow changes',
        body: 'Your checkout stays exactly where it is today.',
    },
    {
        label: 'Exportable records',
        body: 'Every filing is downloadable for your team, your lender, or your ops log.',
    },
];

const proofPillars = [
    {
        label: 'Cash-Impact Proof',
        body: 'A single documented incident where earlier warning protected materially more cash than the monthly cost.',
    },
    {
        label: 'Processor-Specific Credibility',
        body: 'Signals are tied to observable processor behaviors — payout drift, reserve pressure, review escalation, chargeback stress.',
    },
    {
        label: 'Operator-Ready Output',
        body: 'Filings explain what changed, why it matters, and what to do next. Not another dashboard to interpret.',
    },
];

const objections = [
    {
        q: '“I\u2019m already under cash pressure.”',
        a: 'That is exactly the bar. PayFlux only earns its place if the risk prevented is worth materially more than $499 per month.',
    },
    {
        q: '“How is this different from a dashboard?”',
        a: 'A dashboard shows you data. PayFlux files a record: what changed, why it matters, what to do. You read the filing, not the charts.',
    },
    {
        q: '“What if I pay and still get held?”',
        a: 'The standard is not perfection. The standard is earlier warning, faster response, and clearer evidence when pressure is building.',
    },
];

const pricingCards = [
    {
        title: 'Free',
        price: '$0',
        cadence: 'one-time scan',
        body: 'A snapshot of your current processor risk exposure.',
        bullets: [
            'Processor risk snapshot',
            'Visible warning signs',
            'Instability signal surface',
        ],
        ctaLabel: 'Run a free scan',
        ctaHref: SCAN_URL,
        featured: false,
        plan: 'free',
        cta: 'pricing_free',
    },
    {
        title: 'Pro',
        price: '$499',
        cadence: 'per month',
        body: 'Live monitoring and earlier warnings for merchants who need to stay ahead.',
        bullets: [
            'Live processor monitoring',
            'Earlier warnings on payout delays, holds, and pressure',
            'Forward-looking forecast and exportable evidence',
        ],
        ctaLabel: 'Start with a free scan',
        ctaHref: SCAN_URL,
        featured: true,
        plan: 'pro',
        cta: 'pricing_pro',
    },
    {
        title: 'Enterprise',
        price: 'Custom',
        cadence: 'contact sales',
        body: 'For larger teams and complex payment operations.',
        bullets: [
            'Multi-merchant monitoring',
            'Higher throughput and custom exports',
            'Support for complex workflows',
        ],
        ctaLabel: 'Contact sales',
        ctaHref: '/pricing',
        featured: false,
        plan: 'enterprise',
        cta: 'pricing_enterprise',
    },
];

const today = new Date();
const todayIso = `${today.getFullYear()}\u2013${String(today.getMonth() + 1).padStart(2, '0')}\u2013${String(today.getDate()).padStart(2, '0')}`;

const Home = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [journeyId, setJourneyId] = useState('');

    useEffect(() => {
        const id = getJourneyId();
        setJourneyId(id);
        logMarketingEvent('marketing_home_viewed', {
            source_page: 'marketing_home',
            page_path: '/',
        });
    }, []);

    const buildScanHref = (cta) => {
        if (journeyId) {
            const url = new URL(SCAN_URL);
            url.searchParams.set('source', 'marketing_home');
            url.searchParams.set('cta', cta);
            url.searchParams.set('journey_id', journeyId);
            return url.toString();
        }
        return buildScanUrl(cta);
    };

    const handleScanClick = (cta) => {
        logMarketingEvent('marketing_scan_cta_clicked', {
            source_page: 'marketing_home',
            cta,
            destination: '/scan',
        });
    };

    const handlePricingClick = (plan, destination, cta) => {
        logMarketingEvent('marketing_pricing_cta_clicked', {
            source_page: 'marketing_home',
            plan,
            cta,
            destination,
        });
    };

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-[#0A64BC]/20">
            {/* ————— MASTHEAD NAV ————— */}
            <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-6 md:px-8">
                    <a href="/" className="flex items-center gap-2.5 no-underline">
                        <span className="block h-5 w-5 bg-[#0A64BC]" aria-hidden />
                        <span className="text-[15px] font-semibold tracking-tight text-slate-900">PayFlux</span>
                        <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 md:inline">
                            Intelligence Desk
                        </span>
                    </a>

                    <div className="hidden items-center gap-8 md:flex">
                        <a
                            href="#filings"
                            className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500 no-underline transition-colors hover:text-slate-900"
                        >
                            Filings
                        </a>
                        <a
                            href="#how-it-works"
                            className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500 no-underline transition-colors hover:text-slate-900"
                        >
                            Method
                        </a>
                        <a
                            href="#pricing"
                            className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500 no-underline transition-colors hover:text-slate-900"
                        >
                            Pricing
                        </a>
                    </div>

                    <div className="hidden items-center gap-4 md:flex">
                        <a
                            href={SIGN_IN_URL}
                            className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500 no-underline transition-colors hover:text-slate-900"
                        >
                            Sign in
                        </a>
                        <a
                            href={buildScanHref('nav_primary')}
                            onClick={() => handleScanClick('nav_primary')}
                            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-[13px] font-medium text-white no-underline transition-colors hover:bg-slate-950"
                        >
                            Run a free scan
                        </a>
                    </div>

                    <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 md:hidden"
                        onClick={() => setMobileMenuOpen((v) => !v)}
                        aria-label="Toggle navigation"
                    >
                        {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                    </button>
                </div>

                {mobileMenuOpen && (
                    <div className="border-t border-slate-200 bg-white px-6 py-6 md:hidden">
                        <div className="flex flex-col gap-4 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
                            <a href="#filings" className="no-underline hover:text-slate-900" onClick={() => setMobileMenuOpen(false)}>Filings</a>
                            <a href="#how-it-works" className="no-underline hover:text-slate-900" onClick={() => setMobileMenuOpen(false)}>Method</a>
                            <a href="#pricing" className="no-underline hover:text-slate-900" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
                            <a href={SIGN_IN_URL} className="no-underline hover:text-slate-900" onClick={() => setMobileMenuOpen(false)}>Sign in</a>
                            <a
                                href={buildScanHref('nav_mobile')}
                                className="mt-2 inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-3 font-sans text-[13px] font-medium tracking-normal text-white no-underline"
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    handleScanClick('nav_mobile');
                                }}
                            >
                                Run a free scan
                            </a>
                        </div>
                    </div>
                )}
            </nav>

            <main className="pt-16">
                {/* ————— HERO — EDITORIAL FILING ————— */}
                <section className="border-b border-slate-200">
                    <div className="mx-auto max-w-[1120px] px-6 pt-20 pb-20 md:px-8 md:pt-28 md:pb-28">
                        <div className="flex flex-wrap items-center gap-4 text-slate-500">
                            <span className="dateline text-[#0A64BC]">Filing &middot; {todayIso}</span>
                            <span className="hidden h-3 w-px bg-slate-300 md:block" />
                            <span className="dateline text-slate-400">Stripe Operators &middot; Issue 01</span>
                        </div>

                        <h1 className="mt-8 max-w-[860px] text-[40px] font-semibold leading-[1.05] tracking-tight text-slate-900 md:text-[56px]">
                            Capital at risk is visible <span className="text-[#0A64BC]">weeks</span> before a payout slows down. PayFlux files it the moment it moves.
                        </h1>

                        <p className="mt-8 max-w-[640px] text-lg leading-relaxed text-slate-600 md:text-xl">
                            An intelligence desk for Stripe operators. PayFlux observes payout cadence, reserve pressure, and account-review signals — and files an institutional record the moment the pressure is readable.
                        </p>

                        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <a
                                href={buildScanHref('hero_primary')}
                                onClick={() => handleScanClick('hero_primary')}
                                className="inline-flex items-center justify-center rounded-md bg-slate-900 px-6 py-3 text-[14px] font-medium text-white no-underline transition-colors hover:bg-slate-950"
                            >
                                Run a free scan
                            </a>
                            <a
                                href="#how-it-works"
                                className="inline-flex items-center justify-center rounded-md border border-slate-300 px-6 py-3 text-[14px] font-medium text-slate-900 no-underline transition-colors hover:border-slate-900"
                            >
                                Read the method
                            </a>
                            <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.15em] text-slate-400 sm:mt-0 sm:ml-2">
                                ~2 min &middot; read-only &middot; no card
                            </span>
                        </div>
                    </div>
                </section>

                {/* ————— NUMERIC ANCHOR / INSTRUMENT PANEL ————— */}
                <section className="border-b border-slate-200 bg-slate-50/60">
                    <div className="mx-auto grid max-w-[1120px] gap-px bg-slate-200 px-0 md:grid-cols-3">
                        <div className="bg-slate-50/60 px-6 py-10 md:px-10 md:py-12">
                            <div className="dateline text-slate-500">Signals Tracked</div>
                            <div className="numeric-mono mt-5 text-[48px] font-medium leading-none text-slate-900 md:text-[56px]">
                                47
                            </div>
                            <div className="mt-3 text-[14px] leading-relaxed text-slate-500">
                                Processor behaviors observed per merchant — from payout timing to review-queue velocity.
                            </div>
                        </div>
                        <div className="bg-slate-50/60 px-6 py-10 md:px-10 md:py-12">
                            <div className="dateline text-slate-500">Lead Time</div>
                            <div className="numeric-mono mt-5 text-[48px] font-medium leading-none text-slate-900 md:text-[56px]">
                                14<span className="text-slate-400">d</span>
                            </div>
                            <div className="mt-3 text-[14px] leading-relaxed text-slate-500">
                                Median advance notice before a payout slowdown becomes visible to the merchant.
                            </div>
                        </div>
                        <div className="bg-slate-50/60 px-6 py-10 md:px-10 md:py-12">
                            <div className="dateline text-slate-500">Threshold</div>
                            <div className="numeric-mono mt-5 text-[48px] font-medium leading-none text-slate-900 md:text-[56px]">
                                &gt;$499
                            </div>
                            <div className="mt-3 text-[14px] leading-relaxed text-slate-500">
                                Minimum monthly risk-prevented value for a filing to justify the subscription.
                            </div>
                        </div>
                    </div>
                </section>

                {/* ————— FILINGS / WARNING CLASSES ————— */}
                <section id="filings" className="border-b border-slate-200">
                    <div className="mx-auto max-w-[1120px] px-6 py-20 md:px-8 md:py-28">
                        <div className="grid gap-12 md:grid-cols-[0.9fr_2.1fr] md:gap-16">
                            <div>
                                <div className="dateline text-[#0A64BC]">Filing Classes</div>
                                <h2 className="mt-3 text-[32px] font-semibold leading-[1.15] tracking-tight text-slate-900 md:text-[40px]">
                                    Three filings we watch for — every one of them is readable before it posts.
                                </h2>
                            </div>
                            <div className="divide-y divide-slate-200 border-t border-slate-200">
                                {warningFilings.map(({ severity, severityClass, accentBar, title, body }) => (
                                    <article key={title} className="group grid grid-cols-[4px_1fr] gap-6 py-8 first:pt-10">
                                        <div className={`${accentBar} w-[3px]`} />
                                        <div>
                                            <div className="mb-3 flex items-center gap-3">
                                                <span className={`severity-pill ${severityClass}`}>{severity}</span>
                                                <span className="dateline-sm text-slate-400">Processor Signal</span>
                                            </div>
                                            <h3 className="text-[22px] font-semibold leading-tight tracking-tight text-slate-900">
                                                {title}
                                            </h3>
                                            <p className="mt-3 max-w-[540px] text-[15px] leading-relaxed text-slate-600">
                                                {body}
                                            </p>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ————— METHOD / STEPS ————— */}
                <section id="how-it-works" className="border-b border-slate-200 bg-slate-50/60">
                    <div className="mx-auto max-w-[1120px] px-6 py-20 md:px-8 md:py-28">
                        <div className="max-w-[640px]">
                            <div className="dateline text-[#0A64BC]">Method</div>
                            <h2 className="mt-3 text-[32px] font-semibold leading-[1.15] tracking-tight text-slate-900 md:text-[40px]">
                                Read-only observation, institutional filings, no theater.
                            </h2>
                            <p className="mt-5 text-lg leading-relaxed text-slate-600">
                                PayFlux connects once and observes. When a signal crosses threshold, we file a record — not a notification.
                            </p>
                        </div>

                        <div className="mt-16 grid gap-8 md:grid-cols-3 md:gap-12">
                            {steps.map(({ step, title, body }) => (
                                <div key={step} className="border-t border-slate-300 pt-6">
                                    <div className="numeric-mono text-[32px] font-medium leading-none text-[#0A64BC]">
                                        {step}
                                    </div>
                                    <h3 className="mt-6 text-[18px] font-semibold leading-tight tracking-tight text-slate-900">
                                        {title}
                                    </h3>
                                    <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                                        {body}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-16 grid gap-6 border-t border-slate-200 pt-10 md:grid-cols-3">
                            {trustItems.map(({ label, body }) => (
                                <div key={label}>
                                    <div className="dateline-sm text-slate-500">{label}</div>
                                    <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                                        {body}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ————— PROOF / THESIS ————— */}
                <section className="border-b border-slate-200">
                    <div className="mx-auto max-w-[1120px] px-6 py-20 md:px-8 md:py-28">
                        <div className="grid gap-12 md:grid-cols-[0.9fr_2.1fr] md:gap-16">
                            <div>
                                <div className="dateline text-[#0A64BC]">Thesis</div>
                                <h2 className="mt-3 text-[32px] font-semibold leading-[1.15] tracking-tight text-slate-900 md:text-[40px]">
                                    This has to protect more cash than it costs.
                                </h2>
                                <p className="mt-5 text-[15px] leading-relaxed text-slate-600">
                                    A merchant under payout delays or reserve pressure is not buying software. They are making a trust-and-survival decision. PayFlux earns its place only by reducing the odds, duration, or severity of a cash freeze enough to matter.
                                </p>
                                <a
                                    href="/proof-asset"
                                    className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-900 no-underline hover:text-[#0A64BC]"
                                >
                                    See the proof asset <span aria-hidden>&rarr;</span>
                                </a>
                            </div>

                            <div className="grid gap-8 md:grid-cols-3">
                                {proofPillars.map(({ label, body }) => (
                                    <div key={label} className="border-t border-slate-300 pt-6">
                                        <div className="dateline-sm text-[#0A64BC]">{label}</div>
                                        <p className="mt-4 text-[15px] leading-relaxed text-slate-700">
                                            {body}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ————— OBJECTIONS / Q&A ————— */}
                <section className="border-b border-slate-200 bg-slate-50/60">
                    <div className="mx-auto max-w-[960px] px-6 py-20 md:px-8 md:py-28">
                        <div className="dateline text-[#0A64BC]">Objections on file</div>
                        <h2 className="mt-3 text-[32px] font-semibold leading-[1.15] tracking-tight text-slate-900 md:text-[40px]">
                            The questions merchants ask before they sign.
                        </h2>

                        <dl className="mt-12 divide-y divide-slate-200 border-y border-slate-200">
                            {objections.map(({ q, a }) => (
                                <div key={q} className="grid gap-4 py-8 md:grid-cols-[0.9fr_2.1fr] md:gap-12">
                                    <dt className="text-[16px] font-semibold leading-snug text-slate-900">
                                        {q}
                                    </dt>
                                    <dd className="text-[15px] leading-relaxed text-slate-600">
                                        {a}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section>

                {/* ————— PRICING ————— */}
                <section id="pricing" className="border-b border-slate-200">
                    <div className="mx-auto max-w-[1120px] px-6 py-20 md:px-8 md:py-28">
                        <div className="max-w-[640px]">
                            <div className="dateline text-[#0A64BC]">Pricing</div>
                            <h2 className="mt-3 text-[32px] font-semibold leading-[1.15] tracking-tight text-slate-900 md:text-[40px]">
                                One price. Filed monthly. Cancel in one click.
                            </h2>
                        </div>

                        <div className="mt-14 grid gap-px border border-slate-200 bg-slate-200 md:grid-cols-3">
                            {pricingCards.map((card) => {
                                const href = card.title === 'Enterprise'
                                    ? '/pricing?source=marketing_home&cta=pricing_enterprise'
                                    : buildScanHref(card.cta);
                                return (
                                    <div
                                        key={card.title}
                                        className={`flex flex-col bg-white px-8 py-10 ${card.featured ? 'ring-1 ring-[#0A64BC] ring-inset' : ''}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="dateline text-slate-500">{card.title}</div>
                                            {card.featured && (
                                                <span className="dateline-sm text-[#0A64BC]">Recommended</span>
                                            )}
                                        </div>
                                        <div className="mt-6 flex items-baseline gap-2">
                                            <span className="numeric-mono text-[40px] font-medium leading-none text-slate-900">
                                                {card.price}
                                            </span>
                                            <span className="text-[13px] text-slate-500">{card.cadence}</span>
                                        </div>
                                        <p className="mt-5 text-[14px] leading-relaxed text-slate-600">
                                            {card.body}
                                        </p>
                                        <ul className="mt-6 space-y-3 border-t border-slate-200 pt-6">
                                            {card.bullets.map((b) => (
                                                <li key={b} className="flex gap-3 text-[14px] leading-relaxed text-slate-700">
                                                    <span className="mt-[7px] inline-block h-[3px] w-[3px] flex-shrink-0 bg-[#0A64BC]" />
                                                    {b}
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="mt-8 pt-4">
                                            <a
                                                href={href}
                                                onClick={() => {
                                                    if (card.title === 'Enterprise') {
                                                        handlePricingClick('enterprise', '/pricing', 'pricing_enterprise');
                                                    } else {
                                                        handlePricingClick(card.plan, '/scan', card.cta);
                                                    }
                                                }}
                                                className={card.featured
                                                    ? 'inline-flex w-full items-center justify-center rounded-md bg-[#0A64BC] px-5 py-3 text-[14px] font-medium text-white no-underline transition-colors hover:bg-[#08539E]'
                                                    : 'inline-flex w-full items-center justify-center rounded-md border border-slate-300 px-5 py-3 text-[14px] font-medium text-slate-900 no-underline transition-colors hover:border-slate-900'}
                                            >
                                                {card.ctaLabel}
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ————— CLOSING FILING ————— */}
                <section className="bg-white">
                    <div className="mx-auto max-w-[960px] px-6 py-24 md:px-8 md:py-32">
                        <div className="dateline text-[#0A64BC]">Closing</div>
                        <h2 className="mt-4 text-[32px] font-semibold leading-[1.1] tracking-tight text-slate-900 md:text-[48px]">
                            Stop waiting for the processor to act.
                        </h2>
                        <p className="mt-6 max-w-[580px] text-lg leading-relaxed text-slate-600">
                            Payout pressure is observable before it becomes your problem. File the scan today; read the record tomorrow.
                        </p>

                        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <a
                                href={buildScanHref('final_cta')}
                                onClick={() => handleScanClick('final_cta')}
                                className="inline-flex items-center justify-center rounded-md bg-slate-900 px-6 py-3 text-[14px] font-medium text-white no-underline transition-colors hover:bg-slate-950"
                            >
                                Run a free scan
                            </a>
                            <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-slate-400">
                                ~2 min &middot; no card required
                            </span>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default Home;
