import React, { useEffect, useState } from 'react';
import {
    Activity,
    AlertTriangle,
    Clock3,
    Eye,
    FileText,
    Lock,
    Menu,
    ShieldCheck,
    X,
} from 'lucide-react';
import Footer from '../components/Footer';

const SCAN_URL = 'https://app.payflux.dev/scan';
const SIGN_IN_URL = 'https://app.payflux.dev/sign-in';
const EVENT_URL = 'https://app.payflux.dev/api/onboarding/event';
const JOURNEY_KEY = 'pf_journey_id';
const COOKIE_NAME = 'pf_journey';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

function resolveCookieDomain() {
    if (typeof window === 'undefined') return null;
    const { hostname } = window.location;
    return hostname === 'payflux.dev' || hostname.endsWith('.payflux.dev')
        ? '.payflux.dev'
        : null;
}

function readCookie(name) {
    if (typeof document === 'undefined') return null;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

function syncJourneyCookie(id) {
    if (typeof document === 'undefined') return;
    const domain = resolveCookieDomain();
    const domainAttr = domain ? `; domain=${domain}` : '';
    document.cookie = `${COOKIE_NAME}=${id}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${domainAttr}`;
}

function getJourneyId() {
    if (typeof window === 'undefined') return '';
    let id = window.localStorage.getItem(JOURNEY_KEY) || readCookie(COOKIE_NAME);
    if (!id) {
        id = crypto.randomUUID();
        window.localStorage.setItem(JOURNEY_KEY, id);
    }
    syncJourneyCookie(id);
    return id;
}

function logMarketingEvent(event, metadata = {}) {
    const payload = JSON.stringify({
        event,
        metadata: {
            ...metadata,
            journey_id: getJourneyId(),
        },
        timestamp: new Date().toISOString(),
    });

    try {
        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
            const blob = new Blob([payload], { type: 'text/plain;charset=UTF-8' });
            navigator.sendBeacon(EVENT_URL, blob);
            return;
        }

        fetch(EVENT_URL, {
            method: 'POST',
            mode: 'no-cors',
            credentials: 'include',
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            body: payload,
            keepalive: true,
        }).catch(() => {});
    } catch {
        // Never block navigation for telemetry
    }
}

function buildScanUrl(cta) {
    const url = new URL(SCAN_URL);
    url.searchParams.set('source', 'marketing_home');
    url.searchParams.set('cta', cta);
    url.searchParams.set('journey_id', getJourneyId());
    return url.toString();
}

const warningCards = [
    {
        icon: Clock3,
        title: 'Payout Slowdowns',
        body: 'See when payout timing starts to drift so you can react before delayed settlement starts to squeeze your operating cash.',
    },
    {
        icon: Lock,
        title: 'Held Funds',
        body: 'Spot the patterns that often show up before a processor begins holding part of your sales back.',
    },
    {
        icon: Activity,
        title: 'Account Pressure',
        body: 'Track the signals that often lead processors to look more closely at your account, so you can act before pressure gets worse.',
    },
];

const steps = [
    {
        step: '1',
        title: 'Run a Free Scan',
        body: 'Start with a simple scan to surface visible warning signs that may increase processor pressure.',
    },
    {
        step: '2',
        title: 'Connect Stripe for Live Monitoring',
        body: 'Add a read-only connection so PayFlux can watch payout behavior and account pressure over time.',
    },
    {
        step: '3',
        title: 'Get Early Warnings',
        body: 'See what changed, why it matters, and what to do next before payout issues become a cash-flow problem.',
    },
];

const trustItems = [
    {
        icon: Eye,
        title: 'Read-only connection',
        body: 'PayFlux reads payout and account signals without changing your processor settings or payment flow.',
    },
    {
        icon: ShieldCheck,
        title: 'No payment flow changes',
        body: 'Your checkout stays exactly where it is. Monitoring does not reroute payments or add new approval logic.',
    },
    {
        icon: FileText,
        title: 'Exportable records',
        body: 'Keep clear records of what changed so your team can review, share, or escalate issues when needed.',
    },
];

const pricingCards = [
    {
        title: 'Free',
        price: '$0',
        cadence: '/month',
        body: 'Start with a secure snapshot of your current exposure.',
        bullets: [
            'One-time risk scan',
            'High-level vulnerability check',
            'Read-only connection available',
        ],
        ctaLabel: 'Run a Free Scan',
        ctaHref: SCAN_URL,
        featured: false,
    },
    {
        title: 'Pro',
        price: 'Starts at $499',
        cadence: '/month',
        body: 'Live monitoring and deeper visibility for active merchants.',
        bullets: [
            'Live monitoring and deeper visibility',
            'Early warnings before payout delays and held funds',
        ],
        ctaLabel: 'Start With a Free Scan',
        ctaHref: SCAN_URL,
        featured: true,
    },
    {
        title: 'Enterprise',
        price: 'Custom',
        cadence: null,
        body: 'For larger teams with more complex operating needs.',
        bullets: [
            'Custom rollout',
            'Support for larger operating needs',
        ],
        ctaLabel: 'Contact Sales',
        ctaHref: '/pricing',
        featured: false,
    },
];

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
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-[#0A64BC]/30 selection:text-white">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(10,100,188,0.18),rgba(2,6,23,0)_62%)]" />

            <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur">
                <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A64BC] text-sm font-semibold text-white">
                            PF
                        </div>
                        <span className="text-2xl font-semibold tracking-tight text-white">PayFlux</span>
                    </div>

                    <div className="hidden items-center gap-8 text-sm font-medium text-slate-400 md:flex">
                        <a href="#problem" className="no-underline transition-colors hover:text-white">The Problem</a>
                        <a href="#how-it-works" className="no-underline transition-colors hover:text-white">How It Works</a>
                        <a href="#pricing" className="no-underline transition-colors hover:text-white">Pricing</a>
                    </div>

                    <div className="hidden items-center gap-3 md:flex">
                        <a href={SIGN_IN_URL} className="text-sm font-medium text-slate-300 no-underline transition-colors hover:text-white">
                            Sign In
                        </a>
                        <a
                            href={buildScanHref('nav_primary')}
                            onClick={() => handleScanClick('nav_primary')}
                            className="inline-flex items-center justify-center rounded-lg bg-[#0A64BC] px-4 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#08539e]"
                        >
                            Run a Free Scan
                        </a>
                    </div>

                    <button
                        type="button"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-800 text-slate-300 md:hidden"
                        onClick={() => setMobileMenuOpen((open) => !open)}
                        aria-label="Toggle navigation"
                    >
                        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>

                {mobileMenuOpen && (
                    <div className="border-t border-slate-800 bg-slate-950 px-6 py-5 md:hidden">
                        <div className="flex flex-col gap-4 text-sm font-medium text-slate-300">
                            <a href="#problem" className="no-underline" onClick={() => setMobileMenuOpen(false)}>
                                The Problem
                            </a>
                            <a href="#how-it-works" className="no-underline" onClick={() => setMobileMenuOpen(false)}>
                                How It Works
                            </a>
                            <a href="#pricing" className="no-underline" onClick={() => setMobileMenuOpen(false)}>
                                Pricing
                            </a>
                            <a href={SIGN_IN_URL} className="no-underline" onClick={() => setMobileMenuOpen(false)}>
                                Sign In
                            </a>
                            <a
                                href={buildScanHref('nav_mobile')}
                                className="inline-flex items-center justify-center rounded-lg bg-[#0A64BC] px-4 py-3 text-center font-semibold text-white no-underline"
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    handleScanClick('nav_mobile');
                                }}
                            >
                                Run a Free Scan
                            </a>
                        </div>
                    </div>
                )}
            </nav>

            <main className="pt-18">
                <section className="mx-auto max-w-7xl px-6 pb-24 pt-20 md:pt-28">
                    <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
                        <div className="max-w-2xl">
                            <h1 className="text-5xl font-semibold tracking-tight text-white md:text-6xl md:leading-[1.05]">
                                See Processor Risk Before It Turns Into a Cash-Flow Problem
                            </h1>
                            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300 md:text-xl">
                                PayFlux helps merchants spot payout slowdowns, held funds, and rising processor pressure before the damage hits your business.
                            </p>

                            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                                <a
                                    href={buildScanHref('hero_primary')}
                                    onClick={() => handleScanClick('hero_primary')}
                                    className="inline-flex items-center justify-center rounded-lg bg-[#0A64BC] px-7 py-3.5 text-base font-semibold text-white no-underline transition-colors hover:bg-[#08539e]"
                                >
                                    Run a Free Scan
                                </a>
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
                                    <p className="text-sm font-semibold text-white">What PayFlux Watches</p>
                                    <p className="mt-1 text-sm text-slate-400">A clear view of the payout and account signals PayFlux tracks</p>
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Needs Attention
                                </div>
                            </div>

                            <div className="mt-5 grid gap-4">
                                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                                    <p className="text-sm font-medium text-slate-400">Payout Status</p>
                                    <p className="mt-2 text-xl font-semibold text-white">Watching for Shifts</p>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                        Watch for changes in payout timing before cash flow tightens.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                                    <p className="text-sm font-medium text-slate-400">Held Funds</p>
                                    <p className="mt-2 text-xl font-semibold text-white">No Hold Signals</p>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                        Stay ahead of the patterns that often lead to funds being held back.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                                    <p className="text-sm font-medium text-slate-400">Account Pressure</p>
                                    <p className="mt-2 text-xl font-semibold text-amber-300">Pressure Building</p>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                        See when processor pressure is moving in the wrong direction.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="problem" className="border-y border-slate-800 bg-slate-900/40 py-24">
                    <div className="mx-auto max-w-5xl px-6 text-center">
                        <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                            Most Merchants Don&apos;t See Risk Building Until Payouts Slow Down
                        </h2>
                        <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">
                            By the time your processor sends an email about held funds or an account review, the pressure has already been building for weeks. Waiting for the alert means waiting until your cash flow is already restricted.
                        </p>
                    </div>
                </section>

                <section className="mx-auto max-w-7xl px-6 py-24">
                    <div className="max-w-3xl">
                        <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                            Catch the Warning Signs Early
                        </h2>
                        <p className="mt-4 text-lg leading-relaxed text-slate-300">
                            PayFlux monitors the signals that often show up before payouts slow down, funds get held back, or processor pressure rises.
                        </p>
                    </div>

                    <div className="mt-12 grid gap-6 md:grid-cols-3">
                        {warningCards.map(({ icon: Icon, title, body }) => (
                            <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
                                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-[#0A64BC]">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <h3 className="text-xl font-semibold text-white">{title}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-slate-400">{body}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section id="how-it-works" className="border-y border-slate-800 bg-slate-900/30 py-24">
                    <div className="mx-auto max-w-7xl px-6">
                        <div className="text-center">
                            <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                                Clear Visibility in Minutes
                            </h2>
                        </div>

                        <div className="mt-14 grid gap-6 md:grid-cols-3">
                            {steps.map(({ step, title, body }) => (
                                <div key={step} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#0A64BC]/40 bg-slate-950 text-base font-semibold text-[#0A64BC]">
                                        {step}
                                    </div>
                                    <h3 className="mt-6 text-xl font-semibold text-white">{title}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-slate-400">{body}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-7xl px-6 py-24">
                    <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
                        <div>
                            <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                                Get Ahead of Processor Pressure
                            </h2>
                            <div className="mt-8 space-y-6">
                                {trustItems.map(({ icon: Icon, title, body }) => (
                                    <div key={title} className="flex gap-4">
                                        <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#0A64BC]/15 text-[#0A64BC] ring-1 ring-[#0A64BC]/20">
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-white">{title}</p>
                                            <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
                            <p className="text-sm font-semibold text-slate-400">What Changes After You Connect</p>
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
                            <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                                Simple, Transparent Access
                            </h2>
                        </div>

                        <div className="mt-14 grid gap-6 lg:grid-cols-3">
                            {pricingCards.map((card) => (
                                <div
                                    key={card.title}
                                    className={card.featured
                                        ? 'rounded-2xl border border-[#0A64BC]/50 bg-[#0A64BC]/10 p-8 shadow-[0_20px_60px_rgba(10,100,188,0.18)]'
                                        : 'rounded-2xl border border-slate-800 bg-slate-950/70 p-8'}
                                >
                                    {card.featured && (
                                        <p className="inline-flex rounded-full bg-[#0A64BC] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                                            Pro
                                        </p>
                                    )}
                                    <h3 className="mt-4 text-2xl font-semibold text-white">{card.title}</h3>
                                    <div className="mt-4 flex items-end gap-1">
                                        <p className="text-3xl font-semibold tracking-tight text-white">{card.price}</p>
                                        {card.cadence && (
                                            <p className="pb-1 text-sm text-slate-400">{card.cadence}</p>
                                        )}
                                    </div>
                                    <p className="mt-3 text-sm leading-relaxed text-slate-300">{card.body}</p>
                                    <ul className="mt-6 space-y-3 text-sm text-slate-300">
                                        {card.bullets.map((bullet) => (
                                            <li key={bullet}>{bullet}</li>
                                        ))}
                                    </ul>
                                    {card.ctaLabel && card.ctaHref && (
                                        <a
                                            href={card.title === 'Enterprise' ? '/pricing?source=marketing_home&cta=pricing_enterprise' : buildScanHref(card.title === 'Free' ? 'pricing_free' : 'pricing_pro')}
                                            onClick={() => {
                                                if (card.title === 'Enterprise') {
                                                    handlePricingClick('enterprise', '/pricing', 'pricing_enterprise');
                                                } else {
                                                    handlePricingClick(card.title.toLowerCase(), '/scan', card.title === 'Free' ? 'pricing_free' : 'pricing_pro');
                                                }
                                            }}
                                            className={card.featured
                                                ? 'mt-8 inline-flex items-center justify-center rounded-lg bg-[#0A64BC] px-5 py-3 text-sm font-semibold text-white no-underline transition-colors hover:bg-[#08539e]'
                                                : 'mt-8 inline-flex items-center justify-center rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-white no-underline transition-colors hover:border-slate-600 hover:bg-slate-900'}
                                        >
                                            {card.ctaLabel}
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="mx-auto max-w-4xl px-6 py-24 text-center">
                    <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                        Stop Waiting for the Processor to Act
                    </h2>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
                        Get ahead of held funds and payout slowdowns today. It takes less than two minutes to run a secure scan.
                    </p>
                    <a
                        href={buildScanHref('final_cta')}
                        onClick={() => handleScanClick('final_cta')}
                        className="mt-8 inline-flex items-center justify-center rounded-lg bg-[#0A64BC] px-8 py-3.5 text-base font-semibold text-white no-underline transition-colors hover:bg-[#08539e]"
                    >
                        Run a Free Scan
                    </a>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default Home;
