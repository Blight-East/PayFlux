import React from 'react';
import { Shield } from 'lucide-react';
import Footer from '../components/Footer';

const Home = () => {
    return (
        <div className="min-h-screen bg-[#0a0c10] text-slate-300 font-sans selection:bg-indigo-500/30 bg-grid overflow-x-hidden">
            {/* NAVIGATION */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0a0c10]/80 backdrop-blur-xl h-16">
                <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-slate-600 rounded-sm" />
                        <span className="text-white font-bold tracking-tight text-xl">PayFlux</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        <a href="#instrument" className="hover:text-white transition-colors">Instrument</a>
                        <a href="#authority" className="hover:text-white transition-colors">Authority</a>
                        <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                        <a href="#trust" className="hover:text-white transition-colors">Trust</a>
                    </div>
                    <a href="https://app.payflux.dev/dashboard" className="text-[10px] uppercase tracking-[0.2em] font-bold text-white border border-white/10 px-5 py-2 hover:bg-white hover:text-black transition-all">Access Dashboard</a>
                </div>
            </nav>

            {/* 1. HERO */}
            <section className="relative pb-32" style={{ paddingTop: '200px' }}>
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <div className="mb-6">
                        <span className="text-[11px] uppercase tracking-[0.3em] text-zinc-400 font-semibold">
                            Deterministic Reserve Projection Infrastructure
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-semibold text-white leading-tight mb-6">
                        Rolling reserves don't surprise you.<br />They build.
                    </h1>

                    <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto mb-16">
                        Deterministic reserve projection infrastructure for high-risk merchants.<br className="hidden md:block" />
                        Model exposure. Measure accuracy. Defend capital.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <a
                            href="https://app.payflux.dev/dashboard"
                            className="px-8 py-4 bg-white text-black text-[11px] font-extrabold rounded-sm uppercase tracking-[0.2em] hover:bg-slate-200 transition-all"
                        >
                            Access Dashboard
                        </a>
                        <a
                            href="https://app.payflux.dev/dashboard"
                            className="px-8 py-4 border border-white/20 text-white text-[11px] font-extrabold rounded-sm uppercase tracking-[0.2em] hover:bg-white/5 transition-all"
                        >
                            View Board Report Sample
                        </a>
                    </div>
                </div>
            </section>

            {/* 2. THE PROBLEM */}
            <section className="py-32 border-t border-white/5">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-4xl font-semibold text-white mb-12">
                        Processors escalate. You react.
                    </h2>

                    <div className="grid md:grid-cols-3 gap-8 text-left">
                        <div className="border border-white/5 p-6">
                            <p className="text-zinc-400 text-sm">
                                Reserve increases are retrospective.
                            </p>
                        </div>
                        <div className="border border-white/5 p-6">
                            <p className="text-zinc-400 text-sm">
                                Retry behavior compounds escalation.
                            </p>
                        </div>
                        <div className="border border-white/5 p-6">
                            <p className="text-zinc-400 text-sm">
                                Capital gets trapped before you see it.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. THE INSTRUMENT */}
            <section id="instrument" className="py-32 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <div className="text-[11px] uppercase tracking-[0.3em] text-zinc-500 font-semibold mb-4">
                            Core Infrastructure
                        </div>
                        <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
                            A Deterministic Financial Instrument
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Projection */}
                        <div className="border border-white/5 p-8">
                            <h3 className="text-white font-semibold mb-4 text-lg">Projection</h3>
                            <ul className="space-y-3 text-sm text-zinc-400">
                                <li>T+30 / T+60 / T+90 capital exposure modeling</li>
                                <li>Hard-capped reserve math (25% ceiling)</li>
                                <li>No stochastic modeling. No smoothing.</li>
                            </ul>
                        </div>

                        {/* Intervention */}
                        <div className="border border-white/5 p-8">
                            <h3 className="text-white font-semibold mb-4 text-lg">Intervention</h3>
                            <ul className="space-y-3 text-sm text-zinc-400">
                                <li>Behavior-derived recommendations</li>
                                <li>Velocity reduction modeling</li>
                                <li>Non-linear exposure delta simulation</li>
                            </ul>
                        </div>

                        {/* Record */}
                        <div className="border border-white/5 p-8">
                            <h3 className="text-white font-semibold mb-4 text-lg">Record</h3>
                            <ul className="space-y-3 text-sm text-zinc-400">
                                <li>Append-only projection ledger</li>
                                <li>HMAC-SHA256 signed artifacts</li>
                                <li>Rolling model accuracy (tier, trend, bps variance)</li>
                            </ul>
                        </div>
                    </div>

                </div>
            </section>

            {/* 4. MODEL AUTHORITY */}
            <section id="authority" className="py-32 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <div className="mb-16">
                        <div className="text-[11px] uppercase tracking-[0.3em] text-zinc-500 font-semibold mb-4">
                            Model Authority
                        </div>
                        <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
                            Measured. Not Assumed.
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-4 gap-6 text-left">
                        <div className="border border-white/5 p-6">
                            <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Tier Forecast Accuracy</div>
                            <div className="text-zinc-500 text-sm italic">
                                Aggregated metrics unlock after statistical threshold.
                            </div>
                        </div>
                        <div className="border border-white/5 p-6">
                            <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Mean Reserve Variance</div>
                            <div className="text-zinc-500 text-sm italic">
                                Aggregated metrics unlock after statistical threshold.
                            </div>
                        </div>
                        <div className="border border-white/5 p-6">
                            <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Model Version</div>
                            <div className="text-white text-sm font-mono">
                                reserve-v1.0.0
                            </div>
                        </div>
                        <div className="border border-white/5 p-6">
                            <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-2">Version Stability</div>
                            <div className="text-white text-sm">
                                Stable
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. BOARD-GRADE ARTIFACT */}
            <section id="artifact" className="py-32 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <div className="mb-16">
                        <div className="text-[11px] uppercase tracking-[0.3em] text-zinc-500 font-semibold mb-4">
                            Export
                        </div>
                        <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
                            Board-Ready Reserve Forecast
                        </h2>
                        <p className="text-lg text-zinc-400 max-w-3xl mx-auto">
                            A document that survives outside the product.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                        <div className="border border-white/5 p-6">
                            <h3 className="text-white font-semibold mb-3">
                                Deterministic Derivation
                            </h3>
                            <p className="text-zinc-400 text-sm">
                                Every output is reproducible from the same inputs. No stochastic layers.
                            </p>
                        </div>
                        <div className="border border-white/5 p-6">
                            <h3 className="text-white font-semibold mb-3">
                                Applied Constants
                            </h3>
                            <p className="text-zinc-400 text-sm">
                                Reserve ceiling, decay rate, and escalation thresholds are explicit and auditable.
                            </p>
                        </div>
                        <div className="border border-white/5 p-6">
                            <h3 className="text-white font-semibold mb-3">
                                Signed Ledger Entries
                            </h3>
                            <p className="text-zinc-400 text-sm">
                                Each projection is append-only and HMAC-SHA256 signed at creation.
                            </p>
                        </div>
                        <div className="border border-white/5 p-6">
                            <h3 className="text-white font-semibold mb-3">
                                Integrity Declaration
                            </h3>
                            <p className="text-zinc-400 text-sm">
                                Exported artifacts include model version, timestamp, and derivation chain.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 6. PRICING */}
            <section id="pricing" className="py-32 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <div className="mb-16">
                        <div className="text-[11px] uppercase tracking-[0.3em] text-zinc-500 font-semibold mb-4">
                            Pricing
                        </div>
                        <h2 className="text-3xl md:text-4xl font-semibold text-white">
                            Three tiers. No opacity.
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 text-left">
                        {/* FREE */}
                        <div className="border border-white/5 p-8">
                            <div className="text-white font-semibold mb-1">Free</div>
                            <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-4">Diagnostic Mode</div>
                            <div className="text-3xl font-bold text-white mb-6">$0</div>
                            <ul className="space-y-3 text-sm text-zinc-400 mb-8">
                                <li>Risk tier visibility</li>
                                <li>Trend & instability signals</li>
                                <li className="text-zinc-600">No projection modeling</li>
                                <li className="text-zinc-600">No intervention derivation</li>
                                <li className="text-zinc-600">No ledger exports</li>
                            </ul>
                            <a
                                href="https://app.payflux.dev/dashboard"
                                className="block text-center px-6 py-3 border border-white/20 text-white text-[11px] font-extrabold uppercase tracking-[0.2em] rounded-sm hover:bg-white/5 transition-all"
                            >
                                Access Dashboard
                            </a>
                        </div>

                        {/* PRO */}
                        <div className="border border-white/20 p-8">
                            <div className="text-white font-semibold mb-1">Pro</div>
                            <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-4">Full Instrument</div>
                            <div className="text-3xl font-bold text-white mb-6">
                                $499<span className="text-sm text-zinc-400"> / month</span>
                            </div>
                            <ul className="space-y-3 text-sm text-zinc-400 mb-8">
                                <li>Full projection engine (T+90)</li>
                                <li>Intervention modeling</li>
                                <li>Signed projection ledger</li>
                                <li>Board reserve report</li>
                                <li>Rolling model accuracy</li>
                            </ul>
                            <a
                                href="https://app.payflux.dev/dashboard"
                                className="block text-center px-6 py-3 bg-white text-black text-[11px] font-extrabold uppercase tracking-[0.2em] rounded-sm hover:bg-slate-200 transition-all"
                            >
                                Start Pro
                            </a>
                        </div>

                        {/* ENTERPRISE */}
                        <div className="border border-white/5 p-8">
                            <div className="text-white font-semibold mb-1">Enterprise</div>
                            <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 mb-4">Custom</div>
                            <div className="text-3xl font-bold text-white mb-6">Contact Sales</div>
                            <ul className="space-y-3 text-sm text-zinc-400 mb-8">
                                <li>Higher throughput</li>
                                <li>Bulk exports</li>
                                <li>Multi-merchant aggregation</li>
                                <li>Processor attestation readiness</li>
                            </ul>
                            <a
                                href="#contact"
                                className="block text-center px-6 py-3 border border-white/20 text-white text-[11px] font-extrabold uppercase tracking-[0.2em] rounded-sm hover:bg-white/5 transition-all"
                            >
                                Talk to Sales
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* TRUST */}
            <section id="trust" className="py-32 border-t border-white/5">
                <div className="max-w-5xl mx-auto px-6 text-center">
                    <div className="mb-16">
                        <div className="flex justify-center mb-6">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-[11px] uppercase tracking-[0.3em] text-zinc-500 font-semibold mb-4">
                            Trust
                        </div>
                        <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
                            Non-invasive by design.
                        </h2>
                        <p className="text-lg text-zinc-400 max-w-3xl mx-auto">
                            PayFlux does not route payments, approve transactions, or alter settlement behavior.
                            It observes degradation signals and projects capital exposure — without touching the payment path.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 text-left">
                        <div className="border border-white/5 p-6">
                            <h3 className="text-white font-semibold mb-3">
                                Non-Invasive Architecture
                            </h3>
                            <p className="text-zinc-400 text-sm">
                                Runs outside authorization and settlement flow.
                                No routing changes. No approval logic. No added latency.
                            </p>
                        </div>
                        <div className="border border-white/5 p-6">
                            <h3 className="text-white font-semibold mb-3">
                                Audit-Ready Output
                            </h3>
                            <p className="text-zinc-400 text-sm">
                                Each projection includes model version and timestamp.
                                Deterministic calculations are repeatable and verifiable.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* GET STARTED */}
            <section id="contact" className="py-32 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-semibold text-white mb-6">
                            Quantify reserve exposure before processors do.
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="border border-white/5 p-8">
                            <h3 className="text-white font-semibold mb-3">Self-Serve</h3>
                            <p className="text-zinc-400 text-sm mb-6">
                                Access the dashboard directly. Free tier available.
                            </p>
                            <a
                                href="https://app.payflux.dev/dashboard"
                                className="inline-block px-8 py-4 bg-white text-black text-[11px] font-extrabold rounded-sm uppercase tracking-[0.2em] hover:bg-slate-200 transition-all"
                            >
                                Access Dashboard
                            </a>
                        </div>

                        <div className="border border-white/5 p-8">
                            <h3 className="text-white font-semibold mb-3">Enterprise</h3>
                            <p className="text-zinc-400 text-sm mb-6">
                                Higher throughput, bulk exports, and processor attestation readiness.
                            </p>
                            <form
                                name="enterprise-contact"
                                method="POST"
                                action="/"
                                data-netlify="true"
                                data-netlify-honeypot="bot-field"
                                className="space-y-4"
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
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-sm px-4 py-3 text-white text-[13px] outline-none focus:border-white/30 transition-all font-mono"
                                />
                                <input
                                    type="text"
                                    name="company"
                                    placeholder="Company"
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-sm px-4 py-3 text-white text-[13px] outline-none focus:border-white/30 transition-all font-mono"
                                />
                                <select
                                    name="monthlyVolume"
                                    defaultValue=""
                                    className="w-full bg-[#0a0c10] border border-white/10 rounded-sm px-4 py-3 text-zinc-400 text-[13px] outline-none focus:border-white/30 transition-all font-mono"
                                >
                                    <option value="" disabled>Monthly volume</option>
                                    <option value="<100k">&lt; $100k</option>
                                    <option value="100k-1m">$100k–$1M</option>
                                    <option value="1m-10m">$1M–$10M</option>
                                    <option value="10m+">$10M+</option>
                                </select>
                                <button
                                    type="submit"
                                    className="w-full py-3 border border-white/20 text-white text-[11px] font-extrabold rounded-sm uppercase tracking-[0.2em] hover:bg-white/5 transition-all"
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
