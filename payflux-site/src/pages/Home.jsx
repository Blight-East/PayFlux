import React from 'react';
import Footer from '../components/Footer';

const Home = () => {
    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden">
            {/* NAVIGATION */}
            <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 h-16">
                <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-slate-900 rounded-sm" />
                        <span className="font-semibold tracking-tight text-lg text-slate-900">PayFlux</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-[13px] text-slate-500">
                        <a href="#how" className="hover:text-slate-900 transition-colors">How it works</a>
                        <a href="#instrument" className="hover:text-slate-900 transition-colors">Instrument</a>
                        <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
                    </div>
                    <a
                        href="https://app.payflux.dev/dashboard"
                        className="text-[13px] font-medium text-white bg-slate-900 px-5 py-2 rounded-md hover:bg-slate-800 transition-colors"
                    >
                        Access Dashboard
                    </a>
                </div>
            </nav>

            {/* 1. HERO */}
            <section className="pt-40 pb-24">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        {/* Left — copy */}
                        <div>
                            <p className="text-[13px] text-slate-400 tracking-wide mb-5">
                                Deterministic Reserve Projection Infrastructure
                            </p>
                            <h1 className="text-4xl md:text-5xl font-semibold text-slate-900 leading-[1.15] mb-6 tracking-tight">
                                Rolling reserves don't surprise&nbsp;you.<br />They build.
                            </h1>
                            <p className="text-lg text-slate-500 leading-relaxed mb-4 max-w-lg">
                                Model reserve exposure before processors escalate. Measure projection accuracy over time. Export signed reports for leadership.
                            </p>
                            <p className="text-sm text-slate-400 mb-10">
                                Understand capital impact before it compounds.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <a
                                    href="https://app.payflux.dev/dashboard"
                                    className="px-7 py-3 bg-slate-900 text-white text-[13px] font-medium rounded-md hover:bg-slate-800 transition-colors text-center"
                                >
                                    Access Dashboard
                                </a>
                                <a
                                    href="https://app.payflux.dev/dashboard"
                                    className="px-7 py-3 border border-slate-200 text-slate-700 text-[13px] font-medium rounded-md hover:border-slate-300 hover:bg-slate-50 transition-colors text-center"
                                >
                                    View Board Report Sample
                                </a>
                            </div>
                        </div>

                        {/* Right — projection mock (illustrative) */}
                        <div className="hidden md:block">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 space-y-6 relative">
                                <div className="absolute top-3 right-4 text-[9px] text-slate-300 uppercase tracking-wider">Example output</div>
                                {/* Capital at Risk */}
                                <div>
                                    <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-2">Capital at Risk</div>
                                    <div className="text-3xl font-semibold text-slate-900 tabular-nums">$184,200</div>
                                    <div className="text-sm text-amber-600 mt-1">Trend: Degrading</div>
                                </div>

                                {/* Projection windows */}
                                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                                    <div>
                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">T+30</div>
                                        <div className="text-lg font-semibold text-slate-800 tabular-nums">$61,400</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">T+60</div>
                                        <div className="text-lg font-semibold text-slate-800 tabular-nums">$122,800</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">T+90</div>
                                        <div className="text-lg font-semibold text-slate-800 tabular-nums">$184,200</div>
                                    </div>
                                </div>

                                {/* Model metadata */}
                                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                                    <div>
                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Model Accuracy</div>
                                        <div className="text-sm text-slate-500">Measured after statistical threshold</div>
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                        reserve-v1.0.0
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. THE PROBLEM */}
            <section className="py-24 bg-slate-50 border-y border-slate-100">
                <div className="max-w-4xl mx-auto px-6">
                    <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 text-center mb-16 tracking-tight">
                        Processors escalate. Reserves compound.<br />Capital gets trapped before visibility exists.
                    </h2>

                    <div className="grid md:grid-cols-3 gap-10 text-center">
                        <div>
                            <div className="text-slate-300 text-2xl mb-4">01</div>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Reserve increases are retrospective. You learn after the hold.
                            </p>
                        </div>
                        <div>
                            <div className="text-slate-300 text-2xl mb-4">02</div>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Retry behavior compounds escalation without visible thresholds.
                            </p>
                        </div>
                        <div>
                            <div className="text-slate-300 text-2xl mb-4">03</div>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Capital gets trapped before anyone in finance can see it coming.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. HOW IT WORKS */}
            <section id="how" className="py-24">
                <div className="max-w-4xl mx-auto px-6">
                    <p className="text-[13px] text-slate-400 tracking-wide text-center mb-4">How it works</p>
                    <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 text-center mb-16 tracking-tight">
                        Observe. Model. Measure.
                    </h2>

                    <div className="grid md:grid-cols-3 gap-12">
                        <div>
                            <div className="text-4xl font-light text-slate-200 mb-4">01</div>
                            <h3 className="text-base font-semibold text-slate-900 mb-2">Observe</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                PayFlux connects to your processor and observes risk signals — dispute velocity, chargeback ratios, policy surface gaps. No data leaves your environment.
                            </p>
                        </div>
                        <div>
                            <div className="text-4xl font-light text-slate-200 mb-4">02</div>
                            <h3 className="text-base font-semibold text-slate-900 mb-2">Model</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Deterministic projection engine models capital exposure at T+30, T+60, and T+90. Hard-capped reserve math. No stochastic layers. Every output is reproducible.
                            </p>
                        </div>
                        <div>
                            <div className="text-4xl font-light text-slate-200 mb-4">03</div>
                            <h3 className="text-base font-semibold text-slate-900 mb-2">Measure</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Every projection is evaluated against actual outcomes. Rolling accuracy metrics — tier prediction, trend prediction, reserve variance — build trust through measurement.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. WHAT YOU SEE */}
            <section id="instrument" className="py-24 bg-slate-50 border-y border-slate-100">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div>
                            <p className="text-[13px] text-slate-400 tracking-wide mb-4">The instrument</p>
                            <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-6 tracking-tight">
                                What you actually see
                            </h2>
                            <p className="text-sm text-slate-500 leading-relaxed mb-8">
                                A single surface that answers five questions: How much capital is at risk. Where it is trending. What to do about it. How accurate the system has been. How to export it for leadership.
                            </p>
                            <a
                                href="https://app.payflux.dev/dashboard"
                                className="text-[13px] font-medium text-slate-900 border-b border-slate-900 pb-0.5 hover:text-slate-600 hover:border-slate-600 transition-colors"
                            >
                                See the dashboard
                            </a>
                        </div>

                        <div className="space-y-3">
                            {[
                                { label: 'Risk Tier & Trend', desc: 'Current position and direction' },
                                { label: 'T+30 / T+60 / T+90 Exposure', desc: 'Capital at risk by projection window' },
                                { label: 'Intervention Modeling', desc: 'Behavior changes and their reserve impact' },
                                { label: 'Model Accuracy', desc: 'Tier, trend, and variance over time' },
                                { label: 'Reserve History', desc: 'Signed, append-only projection ledger' },
                                { label: 'Board Report', desc: 'Deterministic export for leadership review' },
                            ].map((item) => (
                                <div key={item.label} className="flex items-start gap-4 py-3 border-b border-slate-200 last:border-0">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 shrink-0" />
                                    <div>
                                        <div className="text-sm font-medium text-slate-900">{item.label}</div>
                                        <div className="text-[13px] text-slate-400">{item.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. BOARD REPORT */}
            <section className="py-24">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <p className="text-[13px] text-slate-400 tracking-wide mb-4">Export</p>
                    <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-4 tracking-tight">
                        Board-ready reserve forecast
                    </h2>
                    <p className="text-sm text-slate-500 mb-14 max-w-xl mx-auto">
                        A document that survives outside the product. Deterministic, signed, printable.
                    </p>

                    {/* Document preview */}
                    <div className="mx-auto max-w-2xl bg-white border border-slate-200 rounded-lg shadow-sm p-10 text-left font-mono text-[11px] text-slate-700 leading-relaxed mb-14 relative">
                        <div className="absolute top-3 right-4 text-[9px] text-slate-300 uppercase tracking-wider font-sans">Example output</div>
                        <div className="text-center mb-6 pb-4 border-b border-slate-200">
                            <div className="text-sm font-bold tracking-wider uppercase text-slate-900">
                                Reserve Forecast Report
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                                Board-Grade Artifact — Deterministic Derivation
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-6 mb-6">
                            <div>
                                <div className="text-[9px] uppercase tracking-wider text-slate-400 mb-1">T+30</div>
                                <div className="font-semibold text-slate-900">$61,400</div>
                            </div>
                            <div>
                                <div className="text-[9px] uppercase tracking-wider text-slate-400 mb-1">T+60</div>
                                <div className="font-semibold text-slate-900">$122,800</div>
                            </div>
                            <div>
                                <div className="text-[9px] uppercase tracking-wider text-slate-400 mb-1">T+90</div>
                                <div className="font-semibold text-slate-900">$184,200</div>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 pt-4 flex justify-between text-[10px] text-slate-400">
                            <span>reserve-v1.0.0 &middot; HMAC-SHA256 signed</span>
                            <span>payflux.dev</span>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 text-left max-w-2xl mx-auto">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 mb-1">Deterministic derivation</h3>
                            <p className="text-[13px] text-slate-500">Every output is reproducible from the same inputs.</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 mb-1">Signed ledger entries</h3>
                            <p className="text-[13px] text-slate-500">Append-only. HMAC-SHA256 signed at creation.</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 mb-1">Applied constants</h3>
                            <p className="text-[13px] text-slate-500">Reserve ceiling, decay rate, thresholds — explicit and auditable.</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 mb-1">Integrity declaration</h3>
                            <p className="text-[13px] text-slate-500">Model version, timestamp, and full derivation chain.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 6. PRICING */}
            <section id="pricing" className="py-24 bg-slate-50 border-y border-slate-100">
                <div className="max-w-5xl mx-auto px-6">
                    <p className="text-[13px] text-slate-400 tracking-wide text-center mb-4">Pricing</p>
                    <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 text-center mb-16 tracking-tight">
                        Three tiers. No opacity.
                    </h2>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* FREE */}
                        <div className="bg-white border border-slate-200 rounded-lg p-8 flex flex-col">
                            <div className="mb-8">
                                <div className="text-base font-semibold text-slate-900 mb-1">Free</div>
                                <div className="text-[13px] text-slate-400 mb-4">Diagnostic mode</div>
                                <div className="text-3xl font-semibold text-slate-900 tabular-nums">$0</div>
                            </div>
                            <ul className="space-y-3 text-[13px] text-slate-600 mb-8 flex-1">
                                <li>Risk tier visibility</li>
                                <li>Trend and instability signals</li>
                                <li className="text-slate-300">No projection modeling</li>
                                <li className="text-slate-300">No intervention derivation</li>
                                <li className="text-slate-300">No ledger exports</li>
                            </ul>
                            <a
                                href="https://app.payflux.dev/dashboard"
                                className="block text-center py-3 border border-slate-200 text-slate-700 text-[13px] font-medium rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors"
                            >
                                Access Dashboard
                            </a>
                        </div>

                        {/* PRO */}
                        <div className="bg-white border border-slate-900 rounded-lg p-8 flex flex-col">
                            <div className="mb-8">
                                <div className="text-base font-semibold text-slate-900 mb-1">Pro</div>
                                <div className="text-[13px] text-slate-400 mb-4">Full instrument</div>
                                <div className="text-3xl font-semibold text-slate-900 tabular-nums">
                                    $499<span className="text-sm font-normal text-slate-400"> / month</span>
                                </div>
                            </div>
                            <ul className="space-y-3 text-[13px] text-slate-600 mb-8 flex-1">
                                <li>Full projection engine (T+90)</li>
                                <li>Intervention modeling</li>
                                <li>Signed projection ledger</li>
                                <li>Board reserve report</li>
                                <li>Rolling model accuracy</li>
                            </ul>
                            <a
                                href="https://app.payflux.dev/dashboard"
                                className="block text-center py-3 bg-slate-900 text-white text-[13px] font-medium rounded-md hover:bg-slate-800 transition-colors"
                            >
                                Start Pro
                            </a>
                        </div>

                        {/* ENTERPRISE */}
                        <div className="bg-white border border-slate-200 rounded-lg p-8 flex flex-col">
                            <div className="mb-8">
                                <div className="text-base font-semibold text-slate-900 mb-1">Enterprise</div>
                                <div className="text-[13px] text-slate-400 mb-4">Custom</div>
                                <div className="text-3xl font-semibold text-slate-900">Contact Sales</div>
                            </div>
                            <ul className="space-y-3 text-[13px] text-slate-600 mb-8 flex-1">
                                <li>Higher throughput</li>
                                <li>Bulk exports</li>
                                <li>Multi-merchant aggregation</li>
                                <li>Processor attestation readiness</li>
                            </ul>
                            <a
                                href="#contact"
                                className="block text-center py-3 border border-slate-200 text-slate-700 text-[13px] font-medium rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors"
                            >
                                Talk to Sales
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* 7. NON-INVASIVE STATEMENT */}
            <section className="py-24">
                <div className="max-w-2xl mx-auto px-6 text-center">
                    <p className="text-lg text-slate-500 leading-relaxed mb-2">
                        PayFlux observes signals. It does not modify payment flow.
                    </p>
                    <p className="text-sm text-slate-400">
                        No routing changes. No approval logic. No added latency.
                    </p>
                </div>
            </section>

            {/* 8. GET STARTED */}
            <section id="contact" className="py-24 bg-slate-50 border-y border-slate-100">
                <div className="max-w-5xl mx-auto px-6">
                    <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 text-center mb-16 tracking-tight">
                        Quantify reserve exposure before processors do.
                    </h2>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Self-serve */}
                        <div className="bg-white border border-slate-200 rounded-lg p-8">
                            <h3 className="text-base font-semibold text-slate-900 mb-2">Self-serve</h3>
                            <p className="text-[13px] text-slate-500 mb-6">
                                Access the dashboard directly. Free tier available.
                            </p>
                            <a
                                href="https://app.payflux.dev/dashboard"
                                className="inline-block px-7 py-3 bg-slate-900 text-white text-[13px] font-medium rounded-md hover:bg-slate-800 transition-colors"
                            >
                                Access Dashboard
                            </a>
                        </div>

                        {/* Enterprise */}
                        <div className="bg-white border border-slate-200 rounded-lg p-8">
                            <h3 className="text-base font-semibold text-slate-900 mb-2">Enterprise</h3>
                            <p className="text-[13px] text-slate-500 mb-6">
                                Higher throughput, bulk exports, and processor attestation readiness.
                            </p>
                            <form
                                name="enterprise-contact"
                                method="POST"
                                action="/"
                                data-netlify="true"
                                data-netlify-honeypot="bot-field"
                                className="space-y-3"
                            >
                                <input type="hidden" name="form-name" value="enterprise-contact" />
                                <p className="hidden">
                                    <label>Don't fill this out: <input name="bot-field" /></label>
                                </p>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    placeholder="name@company.com"
                                    className="w-full bg-white border border-slate-200 rounded-md px-4 py-3 text-slate-900 text-[13px] outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all"
                                />
                                <input
                                    type="text"
                                    name="company"
                                    placeholder="Company"
                                    className="w-full bg-white border border-slate-200 rounded-md px-4 py-3 text-slate-900 text-[13px] outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all"
                                />
                                <select
                                    name="monthlyVolume"
                                    defaultValue=""
                                    className="w-full bg-white border border-slate-200 rounded-md px-4 py-3 text-slate-500 text-[13px] outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all"
                                >
                                    <option value="" disabled>Monthly volume</option>
                                    <option value="<100k">&lt; $100k</option>
                                    <option value="100k-1m">$100k–$1M</option>
                                    <option value="1m-10m">$1M–$10M</option>
                                    <option value="10m+">$10M+</option>
                                </select>
                                <button
                                    type="submit"
                                    className="w-full py-3 border border-slate-200 text-slate-700 text-[13px] font-medium rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors"
                                >
                                    Contact Sales
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Home;
