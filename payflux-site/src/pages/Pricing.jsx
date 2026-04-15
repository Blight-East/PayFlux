import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';

const Pricing = () => {
    useEffect(() => {
        document.title = 'Pricing | PayFlux';
        const link = document.querySelector("link[rel='canonical']") || document.createElement('link');
        link.setAttribute('rel', 'canonical');
        link.setAttribute('href', 'https://payflux.dev/pricing');
        document.head.appendChild(link);

        return () => {
            if (link.parentNode === document.head) {
                document.head.removeChild(link);
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900">
            {/* ————— NAV ————— */}
            <nav className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
                <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-6 md:px-8">
                    <Link to="/" className="flex items-center gap-2.5 no-underline">
                        <span className="block h-5 w-5 bg-[#0A64BC]" aria-hidden />
                        <span className="text-[15px] font-semibold tracking-tight text-slate-900">PayFlux</span>
                        <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 md:inline">
                            Intelligence Desk
                        </span>
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link
                            to="/"
                            className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500 no-underline hover:text-slate-900"
                        >
                            Home
                        </Link>
                        <Link
                            to="/reports"
                            className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500 no-underline hover:text-slate-900"
                        >
                            Filings
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="pt-16">
                {/* ————— HEADER ————— */}
                <section className="border-b border-slate-200">
                    <div className="mx-auto max-w-[1120px] px-6 py-20 md:px-8 md:py-28">
                        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#0A64BC]">
                            Pricing
                        </div>
                        <h1 className="mt-4 max-w-[800px] text-[40px] font-semibold leading-[1.05] tracking-tight text-slate-900 md:text-[56px]">
                            One price. Filed monthly. Cancel in one click.
                        </h1>
                        <p className="mt-6 max-w-[600px] text-lg leading-relaxed text-slate-600">
                            Start with a free snapshot. Upgrade when you need live monitoring and filings when something moves.
                        </p>
                    </div>
                </section>

                {/* ————— TIERS ————— */}
                <section className="border-b border-slate-200">
                    <div className="mx-auto max-w-[1120px] px-6 py-16 md:px-8 md:py-20">
                        <div className="grid gap-px border border-slate-200 bg-slate-200 md:grid-cols-3">
                            {/* FREE */}
                            <div className="flex flex-col bg-white px-8 py-10">
                                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Free</div>
                                <div className="mt-2 text-[13px] text-slate-500">One-time snapshot</div>
                                <div className="mt-8 flex items-baseline gap-2">
                                    <span className="numeric-mono text-[48px] font-medium leading-none text-slate-900">$0</span>
                                </div>
                                <ul className="mt-8 flex-1 space-y-3 border-t border-slate-200 pt-6">
                                    <li className="flex gap-3 text-[14px] leading-relaxed text-slate-700">
                                        <span className="mt-[7px] inline-block h-[3px] w-[3px] flex-shrink-0 bg-[#0A64BC]" />
                                        One-time processor risk snapshot
                                    </li>
                                    <li className="flex gap-3 text-[14px] leading-relaxed text-slate-700">
                                        <span className="mt-[7px] inline-block h-[3px] w-[3px] flex-shrink-0 bg-[#0A64BC]" />
                                        Visible warning signs and instability signals
                                    </li>
                                    <li className="flex gap-3 text-[14px] leading-relaxed text-slate-400">
                                        <span className="mt-[7px] inline-block h-[3px] w-[3px] flex-shrink-0 bg-slate-300" />
                                        No live processor monitoring
                                    </li>
                                    <li className="flex gap-3 text-[14px] leading-relaxed text-slate-400">
                                        <span className="mt-[7px] inline-block h-[3px] w-[3px] flex-shrink-0 bg-slate-300" />
                                        No ongoing early-warning tracking
                                    </li>
                                </ul>
                                <div className="mt-8 pt-2">
                                    <a
                                        href="https://app.payflux.dev/start"
                                        className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 px-5 py-3 text-[14px] font-medium text-slate-900 no-underline transition-colors hover:border-slate-900"
                                    >
                                        Get started
                                    </a>
                                </div>
                            </div>

                            {/* PRO — distinguished by border weight only, no badge */}
                            <div className="flex flex-col bg-white px-8 py-10 ring-1 ring-[#0A64BC] ring-inset">
                                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Pro</div>
                                <div className="mt-2 text-[13px] text-slate-500">Live monitoring</div>
                                <div className="mt-8 flex items-baseline gap-2">
                                    <span className="numeric-mono text-[48px] font-medium leading-none text-slate-900">$499</span>
                                    <span className="text-[13px] text-slate-500">per month</span>
                                </div>
                                <ul className="mt-8 flex-1 space-y-3 border-t border-slate-200 pt-6">
                                    <li className="flex gap-3 text-[14px] leading-relaxed text-slate-700">
                                        <span className="mt-[7px] inline-block h-[3px] w-[3px] flex-shrink-0 bg-[#0A64BC]" />
                                        Live processor monitoring
                                    </li>
                                    <li className="flex gap-3 text-[14px] leading-relaxed text-slate-700">
                                        <span className="mt-[7px] inline-block h-[3px] w-[3px] flex-shrink-0 bg-[#0A64BC]" />
                                        Earlier warnings on payout delays, holds, and pressure
                                    </li>
                                    <li className="flex gap-3 text-[14px] leading-relaxed text-slate-700">
                                        <span className="mt-[7px] inline-block h-[3px] w-[3px] flex-shrink-0 bg-[#0A64BC]" />
                                        Forward-looking forecast and what-changed visibility
                                    </li>
                                    <li className="flex gap-3 text-[14px] leading-relaxed text-slate-700">
                                        <span className="mt-[7px] inline-block h-[3px] w-[3px] flex-shrink-0 bg-[#0A64BC]" />
                                        Exportable evidence and operator-ready records
                                    </li>
                                    <li className="flex gap-3 text-[14px] leading-relaxed text-slate-700">
                                        <span className="mt-[7px] inline-block h-[3px] w-[3px] flex-shrink-0 bg-[#0A64BC]" />
                                        Guidance on what to fix first
                                    </li>
                                </ul>
                                <div className="mt-8 pt-2">
                                    <a
                                        href="https://app.payflux.dev/start"
                                        className="inline-flex w-full items-center justify-center rounded-md bg-[#0A64BC] px-5 py-3 text-[14px] font-medium text-white no-underline transition-colors hover:bg-[#08539E]"
                                    >
                                        Start Pro
                                    </a>
                                </div>
                            </div>

                            {/* ENTERPRISE */}
                            <div className="flex flex-col bg-white px-8 py-10">
                                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">Enterprise</div>
                                <div className="mt-2 text-[13px] text-slate-500">Custom rollout</div>
                                <div className="mt-8 flex items-baseline gap-2">
                                    <span className="text-[32px] font-semibold leading-none tracking-tight text-slate-900">Contact sales</span>
                                </div>
                                <ul className="mt-8 flex-1 space-y-3 border-t border-slate-200 pt-6">
                                    <li className="flex gap-3 text-[14px] leading-relaxed text-slate-700">
                                        <span className="mt-[7px] inline-block h-[3px] w-[3px] flex-shrink-0 bg-[#0A64BC]" />
                                        Multi-merchant monitoring and reporting
                                    </li>
                                    <li className="flex gap-3 text-[14px] leading-relaxed text-slate-700">
                                        <span className="mt-[7px] inline-block h-[3px] w-[3px] flex-shrink-0 bg-[#0A64BC]" />
                                        Higher throughput and custom exports
                                    </li>
                                    <li className="flex gap-3 text-[14px] leading-relaxed text-slate-700">
                                        <span className="mt-[7px] inline-block h-[3px] w-[3px] flex-shrink-0 bg-[#0A64BC]" />
                                        Custom rollout for complex operations
                                    </li>
                                    <li className="flex gap-3 text-[14px] leading-relaxed text-slate-700">
                                        <span className="mt-[7px] inline-block h-[3px] w-[3px] flex-shrink-0 bg-[#0A64BC]" />
                                        Support for custom processor workflows
                                    </li>
                                </ul>
                                <div className="mt-8 pt-2">
                                    <Link
                                        to="/#contact"
                                        className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 px-5 py-3 text-[14px] font-medium text-slate-900 no-underline transition-colors hover:border-slate-900"
                                    >
                                        Contact
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ————— COLOPHON / TERMS ————— */}
                <section className="bg-slate-50/60">
                    <div className="mx-auto max-w-[960px] px-6 py-16 md:px-8 md:py-20">
                        <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
                            Billing &amp; Policies
                        </div>
                        <dl className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
                            <div className="grid gap-2 py-5 md:grid-cols-[200px_1fr] md:gap-8">
                                <dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">Currency</dt>
                                <dd className="text-[14px] text-slate-700">All prices in USD.</dd>
                            </div>
                            <div className="grid gap-2 py-5 md:grid-cols-[200px_1fr] md:gap-8">
                                <dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">Cadence</dt>
                                <dd className="text-[14px] text-slate-700">Pro billing is monthly. Cancel any time.</dd>
                            </div>
                            <div className="grid gap-2 py-5 md:grid-cols-[200px_1fr] md:gap-8">
                                <dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">Tax</dt>
                                <dd className="text-[14px] text-slate-700">Taxes may apply depending on jurisdiction.</dd>
                            </div>
                            <div className="grid gap-2 py-5 md:grid-cols-[200px_1fr] md:gap-8">
                                <dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">Refunds</dt>
                                <dd className="text-[14px] text-slate-700">
                                    See the <Link to="/refunds" className="text-[#0A64BC] underline-offset-4 hover:underline">refund policy</Link> for terms.
                                </dd>
                            </div>
                        </dl>

                        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
                            <Link to="/terms" className="no-underline hover:text-slate-900">Terms</Link>
                            <Link to="/privacy" className="no-underline hover:text-slate-900">Privacy</Link>
                            <Link to="/refunds" className="no-underline hover:text-slate-900">Refunds</Link>
                            <Link to="/pricing" className="no-underline text-slate-900">Pricing</Link>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
};

export default Pricing;
