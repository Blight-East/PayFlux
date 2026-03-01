import React from 'react';
import Footer from '../components/Footer';

const Home = () => {
    return (
        <div className="min-h-screen bg-engineering text-slate-900 font-sans overflow-x-hidden">
            {/* NAVIGATION */}
            <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 h-16">
                <div className="max-w-[960px] mx-auto px-8 h-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-[#0A64BC] rounded-sm" />
                        <span className="font-semibold tracking-tight text-lg text-slate-900">PayFlux</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                        <a href="#how" className="hover:text-slate-900 transition-colors">How it works</a>
                        <a href="#instrument" className="hover:text-slate-900 transition-colors">Instrument</a>
                        <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
                    </div>
                    <a
                        href="https://app.payflux.dev/dashboard"
                        className="text-sm font-medium text-white bg-slate-900 px-5 py-2 rounded-md hover:bg-slate-800 transition-colors"
                    >
                        Access Dashboard
                    </a>
                </div>
            </nav>

            {/* 1. HERO */}
            <section className="pt-48 pb-32 min-h-[70vh] flex items-center">
                <div className="max-w-[960px] mx-auto px-8 w-full">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        {/* Left — copy */}
                        <div className="animate-fade-in">
                            <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-4">
                                Deterministic Reserve Projection Infrastructure
                            </p>
                            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-[1.1] mb-6 tracking-tight">
                                Rolling reserves don't surprise&nbsp;you.<br />They build.
                            </h1>
                            <p className="text-lg text-slate-600 leading-relaxed mb-2 max-w-lg">
                                Model reserve exposure before processors escalate. Measure projection accuracy over time. Export signed reports for leadership.
                            </p>
                            <p className="text-base text-slate-500 mb-10 max-w-lg">
                                Understand capital impact before it compounds.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <a
                                    href="https://app.payflux.dev/dashboard"
                                    className="px-6 py-3 bg-slate-900 text-white font-medium rounded-md hover:bg-slate-800 transition-colors text-center"
                                >
                                    Access Dashboard
                                </a>
                                <a
                                    href="https://app.payflux.dev/dashboard"
                                    className="px-6 py-3 border border-slate-300 text-slate-900 font-medium rounded-md hover:bg-slate-50 hover:border-slate-400 transition-colors text-center"
                                >
                                    View Board Report Sample
                                </a>
                            </div>
                        </div>

                        {/* Right — projection surface with SVG chart */}
                        <div className="hidden md:flex animate-fade-in delay-100 h-full flex-col justify-center">
                            <div className="bg-white border border-slate-200 rounded-lg shadow-sm w-full overflow-hidden flex flex-col relative">
                                {/* Top Metadata */}
                                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                    <span className="text-xs font-mono font-medium tracking-widest text-slate-400 uppercase">Capital at Risk</span>
                                    <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">Example Output</span>
                                </div>

                                {/* Main Reading */}
                                <div className="px-6 py-6 pb-2 relative z-10">
                                    <div className="font-mono text-4xl font-semibold tracking-tight text-slate-900 text-numeric mb-1">
                                        $184,200
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#BC620A]" />
                                        <span className="text-sm text-[#BC620A] font-medium">Trend: Degrading</span>
                                    </div>
                                </div>

                                {/* SVG Chart */}
                                <div className="h-48 w-full relative -mt-4">
                                    <svg viewBox="0 0 500 200" className="w-full h-full" preserveAspectRatio="none">
                                        {/* Gridlines */}
                                        <line x1="0" y1="50" x2="500" y2="50" stroke="#f1f5f9" strokeWidth="1" />
                                        <line x1="0" y1="100" x2="500" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                                        <line x1="0" y1="150" x2="500" y2="150" stroke="#f1f5f9" strokeWidth="1" />

                                        {/* Confidence Band */}
                                        <path
                                            d="M0,130 Q100,120 166,105 T333,65 T500,20 L500,70 Q400,90 333,115 T166,145 T0,160 Z"
                                            fill="rgba(10, 100, 188, 0.1)"
                                        />

                                        {/* Stepped Projection Line */}
                                        <path
                                            d="M0,140 L166,140 L166,95 L333,95 L333,45 L500,45"
                                            fill="none"
                                            stroke="#64748b"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />

                                        {/* Nodes */}
                                        <circle cx="166" cy="95" r="4" fill="#ffffff" stroke="#64748b" strokeWidth="2" />
                                        <circle cx="333" cy="45" r="4" fill="#ffffff" stroke="#64748b" strokeWidth="2" />
                                    </svg>
                                </div>

                                {/* Data Table Footer */}
                                <div className="grid grid-cols-3 border-t border-slate-100 bg-white">
                                    <div className="p-4 border-r border-slate-100 flex flex-col">
                                        <span className="text-[10px] font-mono text-slate-400 mb-1">T+30</span>
                                        <span className="text-sm font-mono font-medium text-slate-800 text-numeric">$61,400</span>
                                    </div>
                                    <div className="p-4 border-r border-slate-100 flex flex-col">
                                        <span className="text-[10px] font-mono text-[#0A64BC] mb-1">T+60</span>
                                        <span className="text-sm font-mono font-medium text-[#0A64BC] text-numeric">$122,800</span>
                                    </div>
                                    <div className="p-4 flex flex-col bg-slate-50">
                                        <span className="text-[10px] font-mono text-slate-500 mb-1">T+90</span>
                                        <span className="text-sm font-mono font-bold text-slate-900 text-numeric">$184,200</span>
                                    </div>
                                </div>

                                {/* Bottom Bar */}
                                <div className="px-6 py-3 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Model Accuracy</span>
                                        <span className="text-xs text-slate-500">Measured after statistical threshold</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-400">reserve-v1.0.0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. THE PROBLEM */}
            <section className="py-24 bg-slate-50 border-y border-slate-100">
                <div className="max-w-[960px] mx-auto px-8">
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
            <section id="how" className="py-24 border-b border-slate-200">
                <div className="max-w-[960px] mx-auto px-8">
                    <div className="text-center mb-16 animate-fade-in">
                        <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-4">How it works</p>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
                            Observe. Model. Measure.
                        </h2>
                    </div>

                    <div className="relative animate-fade-in delay-100">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-[28px] left-[16%] right-[16%] h-[2px] bg-slate-100 z-0">
                            <div className="h-full bg-slate-300 w-1/3 absolute left-0" />
                        </div>

                        <div className="grid md:grid-cols-3 gap-12 relative z-10">
                            {/* Step 1 */}
                            <div className="flex flex-col items-center text-center group">
                                <div className="w-14 h-14 bg-white border-2 border-slate-900 rounded-full flex items-center justify-center mb-6 shadow-sm transition-transform group-hover:scale-105">
                                    <span className="font-mono text-lg font-bold text-slate-900">01</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-4">Observe</h3>
                                <p className="text-slate-600 leading-relaxed text-sm">
                                    PayFlux connects to your processor and observes risk signals — dispute velocity, chargeback ratios, policy surface gaps. No data leaves your environment.
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div className="flex flex-col items-center text-center group">
                                <div className="w-14 h-14 bg-slate-50 border-2 border-slate-300 rounded-full flex items-center justify-center mb-6 transition-transform group-hover:scale-105">
                                    <span className="font-mono text-lg font-bold text-slate-400">02</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-4">Model</h3>
                                <p className="text-slate-600 leading-relaxed text-sm">
                                    Deterministic projection engine models capital exposure at T+30, T+60, and T+90. Hard-capped reserve math. No stochastic layers. Every output is reproducible.
                                </p>
                            </div>

                            {/* Step 3 */}
                            <div className="flex flex-col items-center text-center group">
                                <div className="w-14 h-14 bg-slate-50 border-2 border-slate-300 rounded-full flex items-center justify-center mb-6 transition-transform group-hover:scale-105">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-4">Measure</h3>
                                <p className="text-slate-600 leading-relaxed text-sm">
                                    Every projection is evaluated against actual outcomes. Rolling accuracy metrics — tier prediction, trend prediction, reserve variance — build trust through measurement.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. WHAT YOU SEE */}
            <section id="instrument" className="py-24 bg-slate-50 border-y border-slate-100">
                <div className="max-w-[960px] mx-auto px-8">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div>
                            <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-4">The instrument</p>
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
            <section className="py-24 border-b border-slate-200">
                <div className="max-w-[960px] mx-auto px-8">
                    <div className="mb-12 text-center animate-fade-in">
                        <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-4">Export</p>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
                            Board-ready reserve forecast
                        </h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            A document that survives outside the product. Deterministic, signed, printable.
                        </p>
                    </div>

                    {/* Document Preview */}
                    <div className="max-w-3xl mx-auto animate-fade-in delay-200">
                        <div className="bg-white border border-slate-200 shadow-document rounded-sm p-8 sm:p-12 relative overflow-hidden">
                            {/* Subtle watermark */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none">
                                <span className="font-bold text-8xl uppercase tracking-tighter">PAYFLUX</span>
                            </div>

                            <div className="relative z-10">
                                {/* Header */}
                                <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
                                    <div>
                                        <h3 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">Reserve Forecast Report</h3>
                                        <p className="text-sm font-mono text-slate-500 mt-1">Board-Grade Artifact — Deterministic Derivation</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">Example Output</span>
                                        <span className="text-xs font-mono text-slate-600">ID: r_591a2b</span>
                                    </div>
                                </div>

                                {/* Data Row */}
                                <div className="grid grid-cols-3 gap-6 mb-12">
                                    <div className="border-b border-slate-200 pb-4">
                                        <span className="text-[10px] font-mono text-slate-500 uppercase block mb-2">T+30 Exposure</span>
                                        <span className="text-xl font-mono font-medium text-slate-900 text-numeric">$61,400</span>
                                    </div>
                                    <div className="border-b border-slate-200 pb-4">
                                        <span className="text-[10px] font-mono text-slate-500 uppercase block mb-2">T+60 Exposure</span>
                                        <span className="text-xl font-mono font-medium text-slate-900 text-numeric">$122,800</span>
                                    </div>
                                    <div className="border-b border-slate-200 pb-4">
                                        <span className="text-[10px] font-mono text-slate-500 uppercase block mb-2">T+90 Exposure</span>
                                        <span className="text-xl font-mono font-bold text-slate-900 text-numeric">$184,200</span>
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div className="grid sm:grid-cols-2 gap-y-10 gap-x-12 mb-12">
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm mb-2">Deterministic derivation</h4>
                                        <p className="text-sm text-slate-600 leading-relaxed">Every output is reproducible from the same inputs. No hidden weights.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm mb-2">Signed ledger entries</h4>
                                        <p className="text-sm text-slate-600 leading-relaxed">Append-only. HMAC-SHA256 signed at creation to prevent tampering.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm mb-2">Applied constants</h4>
                                        <p className="text-sm text-slate-600 leading-relaxed">Reserve ceiling, decay rate, thresholds — explicit and auditable in the payload.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm mb-2">Integrity declaration</h4>
                                        <p className="text-sm text-slate-600 leading-relaxed">Model version, timestamp, and full derivation chain included in every export.</p>
                                    </div>
                                </div>

                                {/* Footer Stamp */}
                                <div className="pt-6 border-t border-slate-200 flex justify-between items-center">
                                    <span className="text-[10px] font-mono text-slate-400">reserve-v1.0.0</span>
                                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded text-[10px] font-mono text-slate-500">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                            <polyline points="9 12 11 14 15 10" />
                                        </svg>
                                        HMAC-SHA256 SIGNED
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 6. PRICING */}
            <section id="pricing" className="py-24 bg-slate-50 border-y border-slate-100">
                <div className="max-w-[960px] mx-auto px-8">
                    <div className="text-center mb-16 animate-fade-in">
                        <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-4">Pricing</p>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
                            Three tiers. No opacity.
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 items-stretch animate-fade-in delay-100">
                        {/* FREE */}
                        <div className="bg-white border border-slate-200 rounded-lg p-8 flex flex-col h-full hover:border-slate-300 transition-colors">
                            <div className="mb-8">
                                <div className="text-xl font-bold text-slate-900 mb-1">Free</div>
                                <div className="text-sm text-slate-500 mb-6">Diagnostic mode</div>
                                <div className="font-mono text-4xl font-bold text-slate-900 text-numeric">$0</div>
                            </div>
                            <ul className="space-y-4 text-sm text-slate-600 mb-8 flex-1">
                                <li className="flex items-start gap-3"><span className="text-slate-400 mt-0.5">&bull;</span> Risk tier visibility</li>
                                <li className="flex items-start gap-3"><span className="text-slate-400 mt-0.5">&bull;</span> Trend and instability signals</li>
                                <li className="flex items-start gap-3 text-slate-400"><span className="mt-0.5 opacity-50">&bull;</span> No projection modeling</li>
                                <li className="flex items-start gap-3 text-slate-400"><span className="mt-0.5 opacity-50">&bull;</span> No intervention derivation</li>
                                <li className="flex items-start gap-3 text-slate-400"><span className="mt-0.5 opacity-50">&bull;</span> No ledger exports</li>
                            </ul>
                            <a
                                href="https://app.payflux.dev/dashboard"
                                className="block text-center w-full py-3 border border-slate-300 text-slate-900 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors mt-auto"
                            >
                                Access Dashboard
                            </a>
                        </div>

                        {/* PRO */}
                        <div className="bg-white border-2 border-slate-900 rounded-lg p-8 flex flex-col h-full">
                            <div className="mb-8">
                                <div className="text-xl font-bold text-slate-900 mb-1">Pro</div>
                                <div className="text-sm text-slate-500 mb-6">Full instrument</div>
                                <div className="font-mono text-4xl font-bold text-slate-900 text-numeric">
                                    $499<span className="text-sm text-slate-500 font-sans font-normal"> / month</span>
                                </div>
                            </div>
                            <ul className="space-y-4 text-sm text-slate-900 font-medium mb-8 flex-1">
                                <li className="flex items-start gap-3"><span className="text-[#0A64BC] mt-0.5">&bull;</span> Full projection engine (T+90)</li>
                                <li className="flex items-start gap-3"><span className="text-[#0A64BC] mt-0.5">&bull;</span> Intervention modeling</li>
                                <li className="flex items-start gap-3"><span className="text-[#0A64BC] mt-0.5">&bull;</span> Signed projection ledger</li>
                                <li className="flex items-start gap-3"><span className="text-[#0A64BC] mt-0.5">&bull;</span> Board reserve report</li>
                                <li className="flex items-start gap-3"><span className="text-[#0A64BC] mt-0.5">&bull;</span> Rolling model accuracy</li>
                            </ul>
                            <a
                                href="https://app.payflux.dev/dashboard"
                                className="block text-center w-full py-3 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800 transition-colors mt-auto"
                            >
                                Start Pro
                            </a>
                        </div>

                        {/* ENTERPRISE */}
                        <div className="bg-white border border-slate-200 rounded-lg p-8 flex flex-col h-full hover:border-slate-300 transition-colors">
                            <div className="mb-8">
                                <div className="text-xl font-bold text-slate-900 mb-1">Enterprise</div>
                                <div className="text-sm text-slate-500 mb-6">Custom</div>
                                <div className="text-3xl font-bold text-slate-900 tracking-tight mt-1">Contact Sales</div>
                            </div>
                            <ul className="space-y-4 text-sm text-slate-600 mb-8 flex-1">
                                <li className="flex items-start gap-3"><span className="text-slate-400 mt-0.5">&bull;</span> Higher throughput</li>
                                <li className="flex items-start gap-3"><span className="text-slate-400 mt-0.5">&bull;</span> Bulk exports</li>
                                <li className="flex items-start gap-3"><span className="text-slate-400 mt-0.5">&bull;</span> Multi-merchant aggregation</li>
                                <li className="flex items-start gap-3"><span className="text-slate-400 mt-0.5">&bull;</span> Processor attestation readiness</li>
                            </ul>
                            <a
                                href="#contact"
                                className="block text-center w-full py-3 border border-slate-300 text-slate-900 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors mt-auto"
                            >
                                Talk to Sales
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* 7. NON-INVASIVE STATEMENT */}
            <section className="py-24">
                <div className="max-w-[960px] mx-auto px-8 text-center">
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
                <div className="max-w-[960px] mx-auto px-8">
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
